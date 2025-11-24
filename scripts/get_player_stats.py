from io import StringIO
from pathlib import Path
import asyncio
from typing import Optional, Tuple, List

import polars as pl
import aiohttp
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
save_path = data_dir_path / "player_stats.csv"
player_path = data_dir_path / "players.csv"

season = "2025-26"

# Tuning knobs
REQUEST_TIMEOUT = 10         # seconds
CONCURRENCY = 20             # in-flight HTTP requests
CHUNK_SIZE = 50              # how many players to schedule per batch

columns_to_keep = [
    "bps",
    "defensive_contribution",
    "element",
    "expected_assists",
    "expected_goals",
    "expected_goals_conceded",
    "fixture",
    "minutes",
    "opponent_team",
    "round",
    "starts",
    "total_points",
    "ict_index",
]


def player_url(first_name: str, second_name: str, player_id: int) -> str:
    return (
        f"https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/"
        f"refs/heads/master/data/{season}/players/{first_name}_{second_name}_{player_id}/gw.csv"
    )


async def fetch_player_stats(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    first_name: str,
    second_name: str,
    player_id: int,
) -> Tuple[int, str, str, Optional[pl.DataFrame], Optional[str]]:
    """
    Returns: (player_id, first_name, second_name, df_filtered or None, error or None)
    """
    url = player_url(first_name, second_name, player_id)
    try:
        async with semaphore:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return player_id, first_name, second_name, None, f"HTTP {resp.status}"
                text = await resp.text()

        # Parse CSV off the event loop to avoid blocking
        df = await asyncio.to_thread(pl.read_csv, StringIO(text))
        df_filtered = df.select(columns_to_keep)
        return player_id, first_name, second_name, df_filtered, None
    except Exception as e:
        return player_id, first_name, second_name, None, str(e)


async def async_main():
    # Read players
    players_df = pl.read_csv(player_path)
    players = list(players_df.iter_rows(named=True))
    total_players = len(players)

    all_stats: List[pl.DataFrame] = []
    success_count = 0
    failure_count = 0
    rows_collected = 0
    failures: List[Tuple[int, str]] = []

    semaphore = asyncio.Semaphore(CONCURRENCY)
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    connector = aiohttp.TCPConnector(limit_per_host=CONCURRENCY)

    # Rich progress bar
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),
        TextColumn("{task.percentage:>5.1f}%"),
        TimeElapsedColumn(),
        TimeRemainingColumn(),
        transient=False,
    ) as progress:
        task_id = progress.add_task("Fetching player stats...", total=total_players)

        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            # Process in chunks to reduce memory usage and be gentle on remote
            for start in range(0, total_players, CHUNK_SIZE):
                chunk = players[start : start + CHUNK_SIZE]

                tasks = [
                    asyncio.create_task(
                        fetch_player_stats(
                            session,
                            semaphore,
                            row["first_name"],
                            row["second_name"],
                            row["id"],
                        )
                    )
                    for row in chunk
                ]

                for coro in asyncio.as_completed(tasks):
                    player_id, first, second, df_filtered, err = await coro

                    if df_filtered is not None:
                        all_stats.append(df_filtered)
                        success_count += 1
                        rows_collected += df_filtered.height
                    else:
                        failure_count += 1
                        failures.append((player_id, f"{first} {second}: {err}"))

                    # Update progress for each completion
                    progress.advance(task_id)
                    progress.update(
                        task_id,
                        description=f"Last: {first} {second} ({player_id}) | ok={success_count} fail={failure_count}",
                    )

    # Combine and save
    if all_stats:
        combined_df = pl.concat(all_stats)
        data_dir_path.mkdir(parents=True, exist_ok=True)
        combined_df.write_csv(save_path)
        print(
            f"Summary: fetched stats for {success_count}/{total_players} players; "
            f"{failure_count} failed. Rows collected: {rows_collected}. Saved to {save_path}."
        )
    else:
        print(
            f"Summary: fetched stats for {success_count}/{total_players} players; "
            f"{failure_count} failed. Rows collected: {rows_collected}."
        )

    if failures:
        print("Some requests failed:")
        for pid, msg in failures[:20]:
            print(f"  - {pid}: {msg}")
        if len(failures) > 20:
            print(f"  ... and {len(failures) - 20} more")


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

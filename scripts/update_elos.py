from pathlib import Path

import polars as pl

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
fixture_path = data_dir_path / "fixtures.csv"
team_elos_path = data_dir_path / "team_elos.csv"
elo_changes_path = data_dir_path / "elo_changes.csv"

if not fixture_path.exists() or not team_elos_path.exists():
    print("Missing required files")
    exit()


def getTeamElo(team_id: int, elo_changes_df: pl.DataFrame) -> tuple[float, float]:
    team_elos_df = pl.read_csv(team_elos_path)
    base_off_elo, base_def_elo = (
        team_elos_df.filter(pl.col("team_id") == team_id)
        .select(["off_elo", "def_elo"])
        .row(0)
    )
    changes = (
        elo_changes_df.filter(pl.col("team_id") == team_id)
        .select(["off_change", "def_change"])
        .sum()
    )
    if not changes.is_empty():
        off_change_total, def_change_total = changes.row(0)
        base_off_elo += off_change_total
        base_def_elo += def_change_total
    return base_off_elo, base_def_elo


def main():
    fixtures_df = pl.read_csv(fixture_path)
    elo_changes_df = pl.DataFrame(
        schema={
            "fixture_code": pl.Int64,
            "team_id": pl.Int64,
            "off_change": pl.Float64,
            "def_change": pl.Float64,
        }
    )

    fixtures_df = fixtures_df.filter(
        pl.col("team_a_xg").is_not_null() & pl.col("team_h_xg").is_not_null()
    ).sort(by="event", descending=False)

    fixtures_count = 0

    for fixture in fixtures_df.iter_rows(named=True):
        team_a = fixture["team_a"]
        team_h = fixture["team_h"]
        team_a_off_elo, team_a_def_elo = getTeamElo(team_a, elo_changes_df)
        team_h_off_elo, team_h_def_elo = getTeamElo(team_h, elo_changes_df)

        expected_home_xg = ((team_h_off_elo - team_a_def_elo) / 100) * 0.3
        delta_off = fixture["team_h_xg"] - expected_home_xg
        home_off_change = 20 * delta_off
        away_def_change = -20 * delta_off

        expected_conceded_home = ((team_a_off_elo - team_h_def_elo) / 100) * 0.3
        delta_def = fixture["team_a_xg"] - expected_conceded_home
        home_def_change = 20 * delta_def
        away_off_change = -20 * delta_def

        elo_changes_df = pl.concat(
            [
                elo_changes_df,
                pl.DataFrame(
                    [
                        {
                            "fixture_code": fixture["code"],
                            "team_id": team_h,
                            "off_change": home_off_change,
                            "def_change": home_def_change,
                        },
                        {
                            "fixture_code": fixture["code"],
                            "team_id": team_a,
                            "off_change": away_off_change,
                            "def_change": away_def_change,
                        },
                    ]
                ),
            ]
        )
        fixtures_count += 1

    elo_changes_df.write_csv(elo_changes_path)
    print(f"Processed {fixtures_count} fixtures")


if __name__ == "__main__":
    main()

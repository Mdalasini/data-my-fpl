from pathlib import Path

import polars as pl

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
fixtures_path = data_dir_path / "fixtures.csv"
player_stats_path = data_dir_path / "player_stats.csv"


def main():
    # Read the CSV files
    fixtures_df = pl.read_csv(fixtures_path)
    player_stats_df = pl.read_csv(player_stats_path)

    # Create a mapping from fixture id to fixture code
    id_to_code_map = dict(zip(fixtures_df["id"], fixtures_df["code"]))

    # Replace fixture column values with their corresponding codes
    player_stats_df = player_stats_df.with_columns(
        pl.col("fixture")
        .map_elements(lambda x: id_to_code_map.get(x, x), return_dtype=pl.Int64)
        .alias("fixture")
    )

    # Write the updated player_stats back to CSV
    player_stats_df.write_csv(player_stats_path)
    print("✓ Successfully migrated player_stats fixture values from id to code")
    print(f"  Updated {len(player_stats_df)} player_stats records")


if __name__ == "__main__":
    main()

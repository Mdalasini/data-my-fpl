from pathlib import Path

import polars as pl

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
fixtures_path = data_dir_path / "fixtures.csv"
player_stats_path = data_dir_path / "player_stats.csv"


def main():
    print("🔄 Migrating player_stats fixture IDs to codes...")

    # Check if files exist
    if not fixtures_path.exists():
        print(f"❌ Fixtures file not found: {fixtures_path}")
        return

    if not player_stats_path.exists():
        print(f"❌ Player stats file not found: {player_stats_path}")
        return

    # Read the CSV files
    print(f"📖 Reading fixtures from {fixtures_path}...")
    fixtures_df = pl.read_csv(fixtures_path)
    print(f"   Found {len(fixtures_df)} fixtures")

    print(f"📖 Reading player stats from {player_stats_path}...")
    player_stats_df = pl.read_csv(player_stats_path)
    print(f"   Found {len(player_stats_df)} player stat records")

    # Create a mapping from fixture id to fixture code
    print("🗺️  Creating fixture ID to code mapping...")
    id_to_code_map = dict(zip(fixtures_df["id"], fixtures_df["code"]))
    print(f"   Created mapping for {len(id_to_code_map)} fixtures")

    # Replace fixture column values with their corresponding codes
    print("🔧 Replacing fixture IDs with codes...")
    player_stats_df = player_stats_df.with_columns(
        pl.col("fixture")
        .map_elements(lambda x: id_to_code_map.get(x, x), return_dtype=pl.Int64)
        .alias("fixture")
    )

    # Write the updated player_stats back to CSV
    print(f"💾 Saving updated player stats to {player_stats_path}...")
    player_stats_df.write_csv(player_stats_path)

    print(f"✅ Successfully migrated {len(player_stats_df)} player_stats records")
    print("✨ Done!")


if __name__ == "__main__":
    main()

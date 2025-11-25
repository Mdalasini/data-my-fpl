from io import StringIO
from pathlib import Path

import polars as pl
import requests

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
save_path = data_dir_path / "players.csv"


season = "2025-26"
url = f"https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/refs/heads/master/data/{season}/players_raw.csv"


def main():
    print(f"🏃 Fetching players data for season {season}...")
    print(f"   URL: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        print(f"❌ Error fetching data: HTTP {response.status_code}")
        return

    print("✅ Data fetched successfully")

    print("📊 Parsing CSV data...")
    df = pl.read_csv(StringIO(response.text))
    print(f"   Found {len(df)} players in source data")

    columns_to_keep = [
        "code",
        "id",
        "first_name",
        "second_name",
        "web_name",
        "element_type",
        "selected_by_percent",
        "team",
        "team_code",
        "status",
        "news",
        "now_cost",
    ]

    print(f"🔧 Filtering to {len(columns_to_keep)} columns...")
    df_filtered = df.select(columns_to_keep)

    # original csv has price in 10s of millions of pounds
    print("💰 Converting player costs to proper format...")
    df_filtered = df_filtered.with_columns(
        (pl.col("now_cost") / 10).round(1).alias("now_cost")
    )

    print(f"📁 Saving to {save_path}...")
    data_dir_path.mkdir(parents=True, exist_ok=True)
    df_filtered.write_csv(save_path)

    print(f"✨ Successfully saved {len(df_filtered)} players to {save_path}")


if __name__ == "__main__":
    main()

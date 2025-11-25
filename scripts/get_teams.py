from io import StringIO
from pathlib import Path

import polars as pl
import requests

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
save_path = data_dir_path / "teams.csv"

season = "2025-26"
url = f"https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/refs/heads/master/data/{season}/teams.csv"


def main():
    print(f"🏃 Fetching teams data for season {season}...")
    print(f"   URL: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        print(f"❌ Error fetching data: HTTP {response.status_code}")
        return

    print("✅ Data fetched successfully")

    print("📊 Parsing CSV data...")
    df = pl.read_csv(StringIO(response.text))
    print(f"   Found {len(df)} teams in source data")

    columns_to_keep = ["code", "id", "name", "short_name"]
    df_filtered = df[columns_to_keep]
    print(
        f"   Filtered to {len(columns_to_keep)} columns: {', '.join(columns_to_keep)}"
    )

    print(f"💾 Saving to {save_path}...")
    data_dir_path.mkdir(parents=True, exist_ok=True)
    df_filtered.write_csv(save_path)

    print(f"✨ Done! Saved {len(df_filtered)} teams to {save_path}")


if __name__ == "__main__":
    main()

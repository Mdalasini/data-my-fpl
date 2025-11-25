from io import StringIO
from pathlib import Path

import polars as pl
import requests

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
save_path = data_dir_path / "fixtures.csv"

season = "2025-26"
url = f"https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/refs/heads/master/data/{season}/fixtures.csv"


def main():
    print(f"🏟️  Fetching fixtures for season {season}...")
    print(f"   URL: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        print(f"❌ Error fetching data from GitHub (HTTP {response.status_code})")
        return

    print("✅ Successfully fetched data from GitHub")

    df = pl.read_csv(StringIO(response.text))
    print(f"📊 Parsed {len(df)} fixtures from CSV")

    columns_to_keep = [
        "code",
        "id",
        "event",
        "team_h",
        "team_a",
        "kickoff_time",
    ]
    df_filtered = df.select(columns_to_keep)
    print(
        f"🔧 Filtered to {len(columns_to_keep)} columns: {', '.join(columns_to_keep)}"
    )

    data_dir_path.mkdir(parents=True, exist_ok=True)
    df_filtered.write_csv(save_path)

    print(f"💾 Saved {len(df_filtered)} fixtures to {save_path}")
    print("✨ Done!")


if __name__ == "__main__":
    main()

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
    response = requests.get(url)
    if response.status_code == 200:
        df = pl.read_csv(StringIO(response.text))
        columns_to_keep = [
            "code",
            "id",
            "event",
            "finished",
            "team_h",
            "team_a",
            "kickoff_time",
            "team_h_xg",
            "team_a_xg",
        ]
        df_filtered = df.select(columns_to_keep)
        data_dir_path.mkdir(parents=True, exist_ok=True)
        df_filtered.write_csv(save_path)
    else:
        print("Error fetching data")


if __name__ == "__main__":
    main()

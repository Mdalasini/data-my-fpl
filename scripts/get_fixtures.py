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
        df_new = pl.read_csv(StringIO(response.text))
        columns_to_keep = [
            "code",
            "event",
            "finished",
            "team_h",
            "team_a",
            "kickoff_time",
            "team_h_xg",
            "team_a_xg",
        ]
        present_columns = df_new.columns
        df_new = df_new[[col for col in columns_to_keep if col in present_columns]]

        data_dir_path.mkdir(parents=True, exist_ok=True)

        # Check if the file already exists
        if save_path.exists():
            df_existing = pl.read_csv(save_path)

            # Join new data with existing on 'code', keeping all columns from both
            df_merged = df_existing.join(
                df_new.rename(
                    {
                        "event": "event_new",
                        "finished": "finished_new",
                        "kickoff_time": "kickoff_time_new",
                    }
                ),
                on="code",
                how="inner",
            )

            # Identify rows where any of the tracked columns changed
            changed_mask = (
                (df_merged["event"] != df_merged["event_new"])
                | (df_merged["finished"] != df_merged["finished_new"])
                | (df_merged["kickoff_time"] != df_merged["kickoff_time_new"])
            )

            num_updated = changed_mask.sum()

            # Update columns with new values
            present_columns = df_merged.columns

            df_result = df_merged.with_columns(
                [
                    pl.when(changed_mask)
                    .then(pl.col("event_new"))
                    .otherwise(pl.col("event"))
                    .alias("event"),
                    pl.when(changed_mask)
                    .then(pl.col("finished_new"))
                    .otherwise(pl.col("finished"))
                    .alias("finished"),
                    pl.when(changed_mask)
                    .then(pl.col("kickoff_time_new"))
                    .otherwise(pl.col("kickoff_time"))
                    .alias("kickoff_time"),
                ]
            ).select([col for col in columns_to_keep if col in present_columns])

            df_result.write_csv(save_path)
            print(f"Updated {num_updated} row(s)")
        else:
            # If file doesn't exist, just write the new data
            df_new.write_csv(save_path)
            print(f"Created new fixtures file with {len(df_new)} row(s)")
    else:
        print("Error fetching data")


if __name__ == "__main__":
    main()

import json
import csv
from pathlib import Path


script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
json_path = data_dir_path / "fixtures.json"
csv_path = data_dir_path / "fixtures.csv"


def main():
    print("🔄 Migrating fixtures from JSON to CSV...")
    print(f"   Source: {json_path}")
    print(f"   Target: {csv_path}")

    # Read JSON data
    with open(json_path, "r") as f:
        fixtures = json.load(f)

    # Define CSV headers based on schema
    headers = [
        "code",
        "id", 
        "event",
        "finished",
        "team_h",
        "team_a",
        "kickoff_time",
        "team_h_xg",
        "team_a_xg"
    ]

    # Write CSV
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

        for fixture in fixtures:
            row = {
                "code": fixture.get("code"),
                "id": fixture.get("id"),
                "event": fixture.get("event"),
                "finished": fixture.get("finished"),
                "team_h": fixture.get("team_h"),
                "team_a": fixture.get("team_a"),
                "kickoff_time": fixture.get("kickoff_time"),
                "team_h_xg": fixture.get("team_h_xg"),
                "team_a_xg": fixture.get("team_a_xg")
            }
            writer.writerow(row)

    print(f"✅ Migrated {len(fixtures)} fixtures to {csv_path}")
    print("✨ Done!")


if __name__ == "__main__":
    main()
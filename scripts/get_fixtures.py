import json
from pathlib import Path

import requests

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
save_path = data_dir_path / "fixtures.json"

url = "https://fantasy.premierleague.com/api/fixtures/"


def main():
    print("🏟️  Fetching fixtures...")
    print(f"   URL: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        print(f"❌ Error fetching data from API (HTTP {response.status_code})")
        return

    print("✅ Successfully fetched data from API")

    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "w") as f:
        json.dump(response.json(), f, indent=4)

    print(f"💾 Saved {len(response.json())} fixtures to {save_path}")
    print("✨ Done!")


if __name__ == "__main__":
    main()

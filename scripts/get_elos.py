import csv
from pathlib import Path

import polars as pl
from selectolax.parser import HTMLParser

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
html_dir_path = data_dir_path / "../html"
teams_path = data_dir_path / "teams.csv"
team_elos_path = data_dir_path / "team_elos.csv"
rankings_path = html_dir_path / "rankings.html"


def create_team_name_mapping() -> dict:
    """Create mapping from scraped team names to CSV team names"""
    return {
        "Brighton and Hove": "Brighton",
        "Tottenham Hotspur": "Spurs",
        "Nottingham Forest": "Nott'm Forest",
        "West Ham United": "West Ham",
        "Manchester United": "Man Utd",
        "Manchester City": "Man City",
        "Leeds United": "Leeds",
        "Newcastle United": "Newcastle",
        "Wolverhampton Wanderers": "Wolves",
    }


def load_teams_data() -> dict:
    """Load team data from teams.csv and create name to ID mapping"""
    print("📂 Loading teams data...")
    teams_df = pl.read_csv(teams_path)

    name_mapping = create_team_name_mapping()
    name_to_id = {}

    for team_name, team_id in zip(teams_df["name"], teams_df["id"]):
        name_to_id[team_name] = team_id

    # Add mapped names
    for scraped_name, csv_name in name_mapping.items():
        if csv_name in name_to_id:
            name_to_id[scraped_name] = name_to_id[csv_name]

    print(f"   Loaded {len(name_to_id)} team mappings")
    return name_to_id


def scrape_team_ratings() -> list:
    """Scrape team ratings from rankings.html"""
    print("📄 Reading team ratings from HTML...")

    if not rankings_path.exists():
        print(f"   ⚠️  HTML file not found: {rankings_path}")
        return []

    with open(rankings_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    print(f"   Read {len(html_content):,} bytes")

    parser = HTMLParser(html_content)
    teams_data = []

    # Find the rankings table
    table = parser.css_first("#rankings-table")
    if not table:
        print("   ❌ Rankings table not found")
        return []

    tbody = table.css_first("tbody")
    if not tbody:
        print("   ❌ No tbody found in rankings table")
        return []

    rows = tbody.css("tr")
    print(f"🔍 Parsing {len(rows)} team rows...")

    for row in rows:
        tds = row.css("td")
        if len(tds) < 11:
            continue

        # Extract team name from second td
        team_td = tds[1]
        team_span = team_td.css_first("span.team.fw-bold")
        if not team_span:
            continue

        team_name = team_span.text(strip=True)

        # Extract offensive rating (10th td) and defensive rating (11th td)
        offensive_rating = tds[9].text(strip=True)
        defensive_rating = tds[10].text(strip=True)

        try:
            off_rating = float(offensive_rating)
            def_rating = float(defensive_rating)
        except ValueError:
            continue

        teams_data.append(
            {
                "name": team_name,
                "offensive_rating": off_rating,
                "defensive_rating": def_rating,
            }
        )

    print(f"   ✅ Parsed {len(teams_data)} teams")
    return teams_data


def calculate_elo_ratings(ratings: list, rating_type: str) -> dict:
    """Calculate Elo ratings based on team rankings"""
    print(f"🎯 Calculating {rating_type} Elo ratings...")

    # Sort by rating (lower is better) to get ranking
    sorted_ratings = sorted(
        ratings, key=lambda x: x[f"{rating_type}_rating"], reverse=False
    )

    total_teams = len(sorted_ratings)
    elo_ratings = {}

    for i, team in enumerate(sorted_ratings):
        team_name = team["name"]
        rank = i + 1  # Rank 1 is the best

        # Calculate Elo based on rank: rank 1 = 1700, last rank = 1300
        if total_teams == 1:
            elo = 1500  # Single team gets middle rating
        else:
            # Proportional distribution based on rank position
            proportion = (rank - 1) / (total_teams - 1)  # 0 for rank 1, 1 for last rank
            elo = 1700 - proportion * 400  # 1700 for rank 1, 1300 for last rank

        elo_ratings[team_name] = round(elo)

    return elo_ratings


def main():
    print("⚽ Starting team Elo ratings calculation...")
    print("─" * 50)

    # Load teams data for mapping
    name_to_id = load_teams_data()

    # Scrape team ratings
    print("─" * 50)
    teams_ratings = scrape_team_ratings()

    if not teams_ratings:
        print("❌ No team ratings found. Exiting.")
        return

    # Calculate Elo ratings
    print("─" * 50)
    off_elo_ratings = calculate_elo_ratings(teams_ratings, "offensive")
    def_elo_ratings = calculate_elo_ratings(teams_ratings, "defensive")

    # Prepare data for CSV
    team_elos_data = []
    matched_count = 0

    for team in teams_ratings:
        team_name = team["name"]
        team_id = name_to_id.get(team_name)

        if team_id is not None:
            team_elos_data.append(
                {
                    "team_id": team_id,
                    "off_elo": off_elo_ratings[team_name],
                    "def_elo": def_elo_ratings[team_name],
                }
            )
            matched_count += 1
        else:
            print(f"   ⚠️  No team ID found for: {team_name}")

    print(f"   ✅ Matched {matched_count} teams with IDs")

    # Sort by team_id
    team_elos_data.sort(key=lambda x: x["team_id"])

    # Save to CSV
    print("─" * 50)
    print(f"💾 Saving team Elo ratings to {team_elos_path}...")

    team_elos_path.parent.mkdir(parents=True, exist_ok=True)

    with open(team_elos_path, "w", newline="") as f:
        fieldnames = ["team_id", "off_elo", "def_elo"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(team_elos_data)

    print("─" * 50)
    print(f"✨ Done! Saved Elo ratings for {len(team_elos_data)} teams")


if __name__ == "__main__":
    main()

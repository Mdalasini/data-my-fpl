from pathlib import Path

import polars as pl
from selectolax.parser import HTMLParser

script_path = Path(__file__).parent
data_dir_path = script_path / "../data"
html_dir_path = data_dir_path / "../html"
fixtures_path = data_dir_path / "fixtures.csv"
teams_path = data_dir_path / "teams.csv"
fbref_teams_path = data_dir_path / "fbref_teams.csv"
fbref_fixtures_path = html_dir_path / "fixtures.html"


def extract_team_id_from_href(href: str) -> str:
    """Extract team ID from fbref href like /xx/xx/the-team-id/xx"""
    parts = href.split("/")
    if len(parts) >= 4:
        return parts[3]
    return ""


def create_fbref_to_fpl_mapping() -> dict:
    """Create a mapping from fbref team IDs to FPL team IDs"""
    fbref_df = pl.read_csv(fbref_teams_path)
    teams_df = pl.read_csv(teams_path)

    mapping = {}
    for fbref_id, short_name in zip(fbref_df["id"], fbref_df["short_name"]):
        fpl_team = teams_df.filter(pl.col("short_name") == short_name)
        if len(fpl_team) > 0:
            mapping[fbref_id] = fpl_team["id"][0]

    return mapping


def scrape_fbref_fixtures() -> dict:
    """
    Scrape fixture data from fbref fixtures HTML file.
    Returns a dict mapping (fpl_home_id, fpl_away_id) to {
        "team_h_xg": float,
        "team_a_xg": float,
        "finished": bool
    }
    """
    if not fbref_fixtures_path.exists():
        return {}

    with open(fbref_fixtures_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    parser = HTMLParser(html_content)

    # Create mapping from fbref team IDs to FPL team IDs
    fbref_to_fpl = create_fbref_to_fpl_mapping()

    fixtures_data = {}

    # Get all rows from the first tbody of the first table
    table = parser.css_first("table")
    if not table:
        return {}

    tbody = table.css_first("tbody")
    if not tbody:
        return {}

    rows = tbody.css("tr")

    for row in rows:
        # Get home team ID
        home_team_td = row.css_first("[data-stat='home_team']")
        if not home_team_td:
            continue

        home_team_a = home_team_td.css_first("a")
        if not home_team_a:
            continue

        home_href = home_team_a.attributes.get("href", "")
        if not home_href:
            continue
        fbref_home_id = extract_team_id_from_href(home_href)
        fpl_home_id = fbref_to_fpl.get(fbref_home_id)

        # Get away team ID
        away_team_td = row.css_first("[data-stat='away_team']")
        if not away_team_td:
            continue

        away_team_a = away_team_td.css_first("a")
        if not away_team_a:
            continue

        away_href = away_team_a.attributes.get("href", "")
        if not away_href:
            continue
        fbref_away_id = extract_team_id_from_href(away_href)
        fpl_away_id = fbref_to_fpl.get(fbref_away_id)

        # Get home xG
        home_xg_td = row.css_first("[data-stat='home_xg']")
        home_xg = None
        if home_xg_td:
            home_xg_text = home_xg_td.text(strip=True)
            if home_xg_text:
                try:
                    home_xg = float(home_xg_text)
                except ValueError:
                    home_xg = None

        # Get away xG
        away_xg_td = row.css_first("[data-stat='away_xg']")
        away_xg = None
        if away_xg_td:
            away_xg_text = away_xg_td.text(strip=True)
            if away_xg_text:
                try:
                    away_xg = float(away_xg_text)
                except ValueError:
                    away_xg = None

        # If we have xG data for both teams, the fixture is finished
        finished = home_xg is not None and away_xg is not None

        # Store the fixture data
        if fpl_home_id is not None and fpl_away_id is not None:
            fixture_key = (fpl_home_id, fpl_away_id)
            fixtures_data[fixture_key] = {
                "team_h_xg": home_xg,
                "team_a_xg": away_xg,
                "finished": finished,
            }

    return fixtures_data


def add_fixture_data(row, fbref_fixtures):
    """Add xG and finished data from fbref to a fixture row"""
    fixture_key = (row["team_h"], row["team_a"])

    if fixture_key in fbref_fixtures:
        fixture_info = fbref_fixtures[fixture_key]
        return (
            fixture_info["finished"],
            fixture_info["team_h_xg"],
            fixture_info["team_a_xg"],
        )
    else:
        return (False, None, None)


def main():
    # Check if fixtures file exists
    if not fixtures_path.exists():
        print(f"Error: Fixtures file not found at {fixtures_path}")
        print("Please run get_fixtures.py first")
        return

    # Read existing fixtures
    df = pl.read_csv(fixtures_path)

    # Scrape fixture data from fbref HTML
    fbref_fixtures = scrape_fbref_fixtures()

    if not fbref_fixtures:
        print("No fbref fixture data found. Skipping xG data enrichment.")
        return

    # Add finished and xG columns based on fbref data
    fixture_results = df.select(["team_h", "team_a"]).map_rows(
        lambda row: add_fixture_data(
            {"team_h": row[0], "team_a": row[1]}, fbref_fixtures
        )
    )

    fixture_results.columns = ["finished", "team_h_xg", "team_a_xg"]

    # Add the columns to the dataframe
    df = df.with_columns(
        fixture_results["finished"],
        fixture_results["team_h_xg"],
        fixture_results["team_a_xg"],
    )

    # Save the enriched fixtures
    df.write_csv(fixtures_path)
    print(f"Successfully enriched fixtures with xG data and saved to {fixtures_path}")


if __name__ == "__main__":
    main()

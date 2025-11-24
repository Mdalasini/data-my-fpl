import csv
import sqlite3
from pathlib import Path

script_dir = Path(__file__).parent
data_dir_path = script_dir / "../data"
fixture_path = data_dir_path / "fixtures.csv"
teams_path = data_dir_path / "teams.csv"
team_elos_path = data_dir_path / "team_elos.csv"
elo_changes_path = data_dir_path / "elo_changes.csv"
players_path = data_dir_path / "players.csv"
player_stats_path = data_dir_path / "player_stats.csv"
sql_path = data_dir_path / "my-fpl.db"


def create_tables(conn):
    """Create all required tables in the database."""
    cursor = conn.cursor()

    # Create teams table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            code INTEGER,
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            short_name TEXT NOT NULL
        )
    """)

    # Create fixtures table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fixtures (
            code INTEGER PRIMARY KEY,
            event INTEGER NOT NULL,
            finished BOOLEAN NOT NULL,
            team_h INTEGER NOT NULL,
            team_a INTEGER NOT NULL,
            kickoff_time TIMESTAMP NOT NULL,
            team_h_xg REAL,
            team_a_xg REAL,
            FOREIGN KEY(team_h) REFERENCES teams(id),
            FOREIGN KEY(team_a) REFERENCES teams(id)
        )
    """)

    # Create team_elos table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_elos (
            team_id INTEGER PRIMARY KEY,
            off_elo REAL NOT NULL,
            def_elo REAL NOT NULL,
            FOREIGN KEY(team_id) REFERENCES teams(id)
        )
    """)

    # Create elo_changes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS elo_changes (
            fixture_code INTEGER NOT NULL,
            team_id INTEGER NOT NULL,
            off_change REAL NOT NULL,
            def_change REAL NOT NULL,
            PRIMARY KEY(fixture_code, team_id),
            FOREIGN KEY(fixture_code) REFERENCES fixtures(code),
            FOREIGN KEY(team_id) REFERENCES teams(id)
        )
    """)

    # Create players table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            code INTEGER UNIQUE,
            id INTEGER PRIMARY KEY,
            first_name TEXT,
            second_name TEXT,
            web_name TEXT NOT NULL,
            element_type INTEGER NOT NULL,
            selected_by_percent REAL,
            team INTEGER NOT NULL,
            team_code INTEGER,
            status TEXT,
            news TEXT,
            now_cost INTEGER NOT NULL,
            FOREIGN KEY(team) REFERENCES teams(id)
        )
    """)

    # Create player_stats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_stats (
            bps INTEGER,
            defensive_contribution INTEGER,
            element INTEGER NOT NULL,
            expected_assists INTEGER,
            expected_goals INTEGER,
            expected_goals_conceded INTEGER,
            fixture INTEGER NOT NULL,
            minutes INTEGER,
            opponent_team INTEGER,
            round INTEGER NOT NULL,
            starts INTEGER,
            total_points INTEGER,
            ict_index REAL,
            PRIMARY KEY(element, fixture),
            FOREIGN KEY(element) REFERENCES players(id),
            FOREIGN KEY(fixture) REFERENCES fixtures(id),
            FOREIGN KEY(opponent_team) REFERENCES teams(id)
        )
    """)

    conn.commit()


def migrate_teams(conn, csv_file):
    """Migrate teams data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute(
                """
                INSERT INTO teams (code, id, name, short_name)
                VALUES (?, ?, ?, ?)
            """,
                (int(row["code"]), int(row["id"]), row["name"], row["short_name"]),
            )
    conn.commit()


def migrate_fixtures(conn, csv_file):
    """Migrate fixtures data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            team_h_xg = float(row["team_h_xg"]) if row["team_h_xg"] else None
            team_a_xg = float(row["team_a_xg"]) if row["team_a_xg"] else None

            cursor.execute(
                """
                INSERT INTO fixtures (code, event, finished, team_h, team_a, kickoff_time, team_h_xg, team_a_xg)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    int(row["code"]),
                    int(row["event"]),
                    row["finished"].lower() == "true",
                    int(row["team_h"]),
                    int(row["team_a"]),
                    row["kickoff_time"],
                    team_h_xg,
                    team_a_xg,
                ),
            )
    conn.commit()


def migrate_team_elos(conn, csv_file):
    """Migrate team elos data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute(
                """
                INSERT INTO team_elos (team_id, off_elo, def_elo)
                VALUES (?, ?, ?)
            """,
                (int(row["team_id"]), float(row["off_elo"]), float(row["def_elo"])),
            )
    conn.commit()


def migrate_elo_changes(conn, csv_file):
    """Migrate elo changes data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute(
                """
                INSERT INTO elo_changes (fixture_code, team_id, off_change, def_change)
                VALUES (?, ?, ?, ?)
            """,
                (
                    int(row["fixture_code"]),
                    int(row["team_id"]),
                    float(row["off_change"]),
                    float(row["def_change"]),
                ),
            )
    conn.commit()


def migrate_players(conn, csv_file):
    """Migrate players data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            selected_by_percent = (
                float(row["selected_by_percent"])
                if row.get("selected_by_percent")
                else None
            )
            team_code = int(row["team_code"]) if row.get("team_code") else None

            cursor.execute(
                """
                INSERT INTO players (code, id, first_name, second_name, web_name, element_type, selected_by_percent, team, team_code, status, news, now_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    int(row["code"]) if row.get("code") else None,
                    int(row["id"]),
                    row.get("first_name"),
                    row.get("second_name"),
                    row["web_name"],
                    int(row["element_type"]),
                    selected_by_percent,
                    int(row["team"]),
                    team_code,
                    row.get("status"),
                    row.get("news"),
                    float(row["now_cost"]),
                ),
            )
    conn.commit()


def migrate_player_stats(conn, csv_file):
    """Migrate player stats data from CSV to database."""
    cursor = conn.cursor()
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle optional integer fields
            bps = int(row["bps"]) if row.get("bps") else None
            defensive_contribution = (
                int(row["defensive_contribution"])
                if row.get("defensive_contribution")
                else None
            )
            expected_assists = (
                float(row["expected_assists"]) if row.get("expected_assists") else None
            )
            expected_goals = (
                float(row["expected_goals"]) if row.get("expected_goals") else None
            )
            expected_goals_conceded = (
                float(row["expected_goals_conceded"])
                if row.get("expected_goals_conceded")
                else None
            )
            minutes = int(row["minutes"]) if row.get("minutes") else None
            opponent_team = (
                int(row["opponent_team"]) if row.get("opponent_team") else None
            )
            starts = int(row["starts"]) if row.get("starts") else None
            total_points = int(row["total_points"]) if row.get("total_points") else None
            ict_index = float(row["ict_index"]) if row.get("ict_index") else None

            cursor.execute(
                """
                INSERT INTO player_stats (bps, defensive_contribution, element, expected_assists, expected_goals, expected_goals_conceded, fixture, minutes, opponent_team, round, starts, total_points, ict_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    bps,
                    defensive_contribution,
                    int(row["element"]),
                    expected_assists,
                    expected_goals,
                    expected_goals_conceded,
                    int(row["fixture"]),
                    minutes,
                    opponent_team,
                    int(row["round"]),
                    starts,
                    total_points,
                    ict_index,
                ),
            )
    conn.commit()


def main():
    """Main migration function."""
    # Delete existing database if it exists to ensure fresh migration
    if sql_path.exists():
        sql_path.unlink()

    # Connect to database (creates it)
    conn = sqlite3.connect(sql_path)

    try:
        # Create all tables
        create_tables(conn)

        # Migrate data from CSV files
        print("Migrating teams...")
        migrate_teams(conn, teams_path)

        print("Migrating fixtures...")
        migrate_fixtures(conn, fixture_path)

        print("Migrating team elos...")
        migrate_team_elos(conn, team_elos_path)

        print("Migrating elo changes...")
        migrate_elo_changes(conn, elo_changes_path)

        print("Migrating players...")
        migrate_players(conn, players_path)

        print("Migrating player stats...")
        migrate_player_stats(conn, player_stats_path)

        print("Migration completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

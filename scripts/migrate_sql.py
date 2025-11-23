import csv
import sqlite3
from pathlib import Path

script_dir = Path(__file__).parent
data_dir_path = script_dir / "../data"
fixture_path = data_dir_path / "fixtures.csv"
teams_path = data_dir_path / "teams.csv"
team_elos_path = data_dir_path / "team_elos.csv"
elo_changes_path = data_dir_path / "elo_changes.csv"
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

        print("Migration completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

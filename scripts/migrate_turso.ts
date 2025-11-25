import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as csv from "csv-parse/sync";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.join(scriptDir, "../data");
const fixturePath = path.join(dataDir, "fixtures.csv");
const teamsPath = path.join(dataDir, "teams.csv");
const teamElosPath = path.join(dataDir, "team_elos.csv");
const eloChangesPath = path.join(dataDir, "elo_changes.csv");
const playersPath = path.join(dataDir, "players.csv");
const playerStatsPath = path.join(dataDir, "player_stats.csv");

// Initialize Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function dropTables() {
  console.log("Dropping existing tables...");

  // Drop tables in reverse order of creation to respect foreign key constraints
  await client.execute("DROP TABLE IF EXISTS player_stats");
  await client.execute("DROP TABLE IF EXISTS elo_changes");
  await client.execute("DROP TABLE IF EXISTS team_elos");
  await client.execute("DROP TABLE IF EXISTS players");
  await client.execute("DROP TABLE IF EXISTS fixtures");
  await client.execute("DROP TABLE IF EXISTS teams");
}

async function createTables() {
  console.log("Creating tables...");

  // Create teams table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      code INTEGER,
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL
    )
  `);

  // Create fixtures table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS fixtures (
      code INTEGER PRIMARY KEY,
      id INTEGER NOT NULL UNIQUE,
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
  `);

  // Create team_elos table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS team_elos (
      team_id INTEGER PRIMARY KEY,
      off_elo REAL NOT NULL,
      def_elo REAL NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id)
    )
  `);

  // Create elo_changes table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS elo_changes (
      fixture_code INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      off_change REAL NOT NULL,
      def_change REAL NOT NULL,
      PRIMARY KEY(fixture_code, team_id),
      FOREIGN KEY(fixture_code) REFERENCES fixtures(code),
      FOREIGN KEY(team_id) REFERENCES teams(id)
    )
  `);

  // Create players table
  await client.execute(`
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
  `);

  // Create player_stats table
  await client.execute(`
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
      FOREIGN KEY(fixture) REFERENCES fixtures(code),
      FOREIGN KEY(opponent_team) REFERENCES teams(id)
    )
  `);
}

function parseCsv(filePath: string): Record<string, string>[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
}

async function migrateTeams(csvFile: string) {
  console.log("Migrating teams...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    await client.execute({
      sql: `
        INSERT INTO teams (code, id, name, short_name)
        VALUES (?, ?, ?, ?)
      `,
      args: [parseInt(row.code), parseInt(row.id), row.name, row.short_name],
    });
  }
}

async function migrateFixtures(csvFile: string) {
  console.log("Migrating fixtures...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    const teamHXg = row.team_h_xg ? parseFloat(row.team_h_xg) : null;
    const teamAXg = row.team_a_xg ? parseFloat(row.team_a_xg) : null;

    await client.execute({
      sql: `
        INSERT INTO fixtures (code, id, event, finished, team_h, team_a, kickoff_time, team_h_xg, team_a_xg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        parseInt(row.code),
        parseInt(row.id),
        parseInt(row.event),
        row.finished.toLowerCase() === "true" ? 1 : 0,
        parseInt(row.team_h),
        parseInt(row.team_a),
        row.kickoff_time,
        teamHXg,
        teamAXg,
      ],
    });
  }
}

async function migrateTeamElos(csvFile: string) {
  console.log("Migrating team elos...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    await client.execute({
      sql: `
        INSERT INTO team_elos (team_id, off_elo, def_elo)
        VALUES (?, ?, ?)
      `,
      args: [
        parseInt(row.team_id),
        parseFloat(row.off_elo),
        parseFloat(row.def_elo),
      ],
    });
  }
}

async function migrateEloChanges(csvFile: string) {
  console.log("Migrating elo changes...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    await client.execute({
      sql: `
        INSERT INTO elo_changes (fixture_code, team_id, off_change, def_change)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        parseInt(row.fixture_code),
        parseInt(row.team_id),
        parseFloat(row.off_change),
        parseFloat(row.def_change),
      ],
    });
  }
}

async function migratePlayers(csvFile: string) {
  console.log("Migrating players...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    const selectedByPercent = row.selected_by_percent
      ? parseFloat(row.selected_by_percent)
      : null;
    const teamCode = row.team_code ? parseInt(row.team_code) : null;
    const code = row.code ? parseInt(row.code) : null;

    await client.execute({
      sql: `
        INSERT INTO players (code, id, first_name, second_name, web_name, element_type, selected_by_percent, team, team_code, status, news, now_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        code,
        parseInt(row.id),
        row.first_name || null,
        row.second_name || null,
        row.web_name,
        parseInt(row.element_type),
        selectedByPercent,
        parseInt(row.team),
        teamCode,
        row.status || null,
        row.news || null,
        parseFloat(row.now_cost),
      ],
    });
  }
}

async function migratePlayerStats(csvFile: string) {
  console.log("Migrating player stats...");
  const rows = parseCsv(csvFile);

  for (const row of rows) {
    const bps = row.bps ? parseInt(row.bps) : null;
    const defensiveContribution = row.defensive_contribution
      ? parseInt(row.defensive_contribution)
      : null;
    const expectedAssists = row.expected_assists
      ? parseFloat(row.expected_assists)
      : null;
    const expectedGoals = row.expected_goals
      ? parseFloat(row.expected_goals)
      : null;
    const expectedGoalsConceded = row.expected_goals_conceded
      ? parseFloat(row.expected_goals_conceded)
      : null;
    const minutes = row.minutes ? parseInt(row.minutes) : null;
    const opponentTeam = row.opponent_team ? parseInt(row.opponent_team) : null;
    const starts = row.starts ? parseInt(row.starts) : null;
    const totalPoints = row.total_points ? parseInt(row.total_points) : null;
    const ictIndex = row.ict_index ? parseFloat(row.ict_index) : null;

    await client.execute({
      sql: `
        INSERT INTO player_stats (bps, defensive_contribution, element, expected_assists, expected_goals, expected_goals_conceded, fixture, minutes, opponent_team, round, starts, total_points, ict_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        bps,
        defensiveContribution,
        parseInt(row.element),
        expectedAssists,
        expectedGoals,
        expectedGoalsConceded,
        parseInt(row.fixture),
        minutes,
        opponentTeam,
        parseInt(row.round),
        starts,
        totalPoints,
        ictIndex,
      ],
    });
  }
}

async function main() {
  try {
    // Validate environment variables
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL environment variable is not set");
    }
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error("TURSO_AUTH_TOKEN environment variable is not set");
    }

    // Drop existing tables
    await dropTables();

    // Create tables
    await createTables();

    // Migrate data from CSV files
    await migrateTeams(teamsPath);
    await migrateFixtures(fixturePath);
    await migrateTeamElos(teamElosPath);
    await migrateEloChanges(eloChangesPath);
    await migratePlayers(playersPath);
    await migratePlayerStats(playerStatsPath);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();

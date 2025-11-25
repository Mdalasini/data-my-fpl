import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline";
import * as csv from "csv-parse/sync";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.join(scriptDir, "../data");
const hashFilePath = path.join(dataDir, ".migration_hashes.json");

// Table configurations
const TABLE_CONFIG = {
  teams: {
    csvPath: path.join(dataDir, "teams.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS teams (
      code INTEGER,
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL
    )`,
    upsertSql: `INSERT INTO teams (code, id, name, short_name) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        name = excluded.name,
        short_name = excluded.short_name`,
    parseRow: (row: Record<string, string>) => [
      parseInt(row.code),
      parseInt(row.id),
      row.name,
      row.short_name,
    ],
    order: 1,
  },
  fixtures: {
    csvPath: path.join(dataDir, "fixtures.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS fixtures (
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
    )`,
    upsertSql: `INSERT INTO fixtures (code, id, event, finished, team_h, team_a, kickoff_time, team_h_xg, team_a_xg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        id = excluded.id,
        event = excluded.event,
        finished = excluded.finished,
        team_h = excluded.team_h,
        team_a = excluded.team_a,
        kickoff_time = excluded.kickoff_time,
        team_h_xg = excluded.team_h_xg,
        team_a_xg = excluded.team_a_xg`,
    parseRow: (row: Record<string, string>) => [
      parseInt(row.code),
      parseInt(row.id),
      parseInt(row.event),
      row.finished.toLowerCase() === "true" ? 1 : 0,
      parseInt(row.team_h),
      parseInt(row.team_a),
      row.kickoff_time,
      row.team_h_xg ? parseFloat(row.team_h_xg) : null,
      row.team_a_xg ? parseFloat(row.team_a_xg) : null,
    ],
    order: 2,
  },
  team_elos: {
    csvPath: path.join(dataDir, "team_elos.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS team_elos (
      team_id INTEGER PRIMARY KEY,
      off_elo REAL NOT NULL,
      def_elo REAL NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id)
    )`,
    upsertSql: `INSERT INTO team_elos (team_id, off_elo, def_elo) VALUES (?, ?, ?)
      ON CONFLICT(team_id) DO UPDATE SET
        off_elo = excluded.off_elo,
        def_elo = excluded.def_elo`,
    parseRow: (row: Record<string, string>) => [
      parseInt(row.team_id),
      parseFloat(row.off_elo),
      parseFloat(row.def_elo),
    ],
    order: 3,
  },
  elo_changes: {
    csvPath: path.join(dataDir, "elo_changes.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS elo_changes (
      fixture_code INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      off_change REAL NOT NULL,
      def_change REAL NOT NULL,
      PRIMARY KEY(fixture_code, team_id),
      FOREIGN KEY(fixture_code) REFERENCES fixtures(code),
      FOREIGN KEY(team_id) REFERENCES teams(id)
    )`,
    upsertSql: `INSERT INTO elo_changes (fixture_code, team_id, off_change, def_change)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fixture_code, team_id) DO UPDATE SET
        off_change = excluded.off_change,
        def_change = excluded.def_change`,
    parseRow: (row: Record<string, string>) => [
      parseInt(row.fixture_code),
      parseInt(row.team_id),
      parseFloat(row.off_change),
      parseFloat(row.def_change),
    ],
    order: 4,
  },
  players: {
    csvPath: path.join(dataDir, "players.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS players (
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
    )`,
    upsertSql: `INSERT INTO players (code, id, first_name, second_name, web_name, element_type, selected_by_percent, team, team_code, status, news, now_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        first_name = excluded.first_name,
        second_name = excluded.second_name,
        web_name = excluded.web_name,
        element_type = excluded.element_type,
        selected_by_percent = excluded.selected_by_percent,
        team = excluded.team,
        team_code = excluded.team_code,
        status = excluded.status,
        news = excluded.news,
        now_cost = excluded.now_cost`,
    parseRow: (row: Record<string, string>) => [
      row.code ? parseInt(row.code) : null,
      parseInt(row.id),
      row.first_name || null,
      row.second_name || null,
      row.web_name,
      parseInt(row.element_type),
      row.selected_by_percent ? parseFloat(row.selected_by_percent) : null,
      parseInt(row.team),
      row.team_code ? parseInt(row.team_code) : null,
      row.status || null,
      row.news || null,
      parseFloat(row.now_cost),
    ],
    order: 5,
  },
  player_stats: {
    csvPath: path.join(dataDir, "player_stats.csv"),
    createSql: `CREATE TABLE IF NOT EXISTS player_stats (
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
    )`,
    upsertSql: `INSERT INTO player_stats (bps, defensive_contribution, element, expected_assists, expected_goals, expected_goals_conceded, fixture, minutes, opponent_team, round, starts, total_points, ict_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(element, fixture) DO UPDATE SET
        bps = excluded.bps,
        defensive_contribution = excluded.defensive_contribution,
        expected_assists = excluded.expected_assists,
        expected_goals = excluded.expected_goals,
        expected_goals_conceded = excluded.expected_goals_conceded,
        minutes = excluded.minutes,
        opponent_team = excluded.opponent_team,
        round = excluded.round,
        starts = excluded.starts,
        total_points = excluded.total_points,
        ict_index = excluded.ict_index`,
    parseRow: (row: Record<string, string>) => [
      row.bps ? parseInt(row.bps) : null,
      row.defensive_contribution ? parseInt(row.defensive_contribution) : null,
      parseInt(row.element),
      row.expected_assists ? parseFloat(row.expected_assists) : null,
      row.expected_goals ? parseFloat(row.expected_goals) : null,
      row.expected_goals_conceded
        ? parseFloat(row.expected_goals_conceded)
        : null,
      parseInt(row.fixture),
      row.minutes ? parseInt(row.minutes) : null,
      row.opponent_team ? parseInt(row.opponent_team) : null,
      parseInt(row.round),
      row.starts ? parseInt(row.starts) : null,
      row.total_points ? parseInt(row.total_points) : null,
      row.ict_index ? parseFloat(row.ict_index) : null,
    ],
    order: 6,
  },
} as const;

type TableName = keyof typeof TABLE_CONFIG;
const ALL_TABLES = Object.keys(TABLE_CONFIG) as TableName[];

// Batch size for inserts
const BATCH_SIZE = 100;

// Turso client (initialized lazily)
let client: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL environment variable is not set");
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// Hash tracking functions
function loadHashes(): Record<string, string> {
  try {
    if (fs.existsSync(hashFilePath)) {
      return JSON.parse(fs.readFileSync(hashFilePath, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty object
  }
  return {};
}

function saveHashes(hashes: Record<string, string>) {
  fs.writeFileSync(hashFilePath, JSON.stringify(hashes, null, 2));
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getChangedTables(): TableName[] {
  const hashes = loadHashes();
  const changed: TableName[] = [];

  for (const table of ALL_TABLES) {
    const config = TABLE_CONFIG[table];
    if (!fs.existsSync(config.csvPath)) continue;

    const currentHash = computeFileHash(config.csvPath);
    if (hashes[table] !== currentHash) {
      changed.push(table);
    }
  }

  return changed;
}

// Interactive CLI functions
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function promptUser(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function selectTablesInteractively(
  changedTables: TableName[],
): Promise<TableName[]> {
  const rl = createReadlineInterface();

  console.log("\n📊 Migration Status:");
  console.log("─".repeat(50));

  for (const table of ALL_TABLES) {
    const changed = changedTables.includes(table);
    const status = changed ? "🔄 Changed" : "✅ Up to date";
    console.log(`  ${table.padEnd(15)} ${status}`);
  }

  console.log("─".repeat(50));

  if (changedTables.length === 0) {
    console.log("\n✨ All tables are up to date!");
    const answer = await promptUser(
      rl,
      "Do you want to force migrate any tables? (y/n): ",
    );
    if (answer !== "y" && answer !== "yes") {
      rl.close();
      return [];
    }
  }

  console.log("\nOptions:");
  console.log("  [a] Migrate all changed tables");
  console.log("  [f] Force migrate all tables");
  console.log("  [s] Select specific tables");
  console.log("  [q] Quit");

  const choice = await promptUser(rl, "\nYour choice: ");

  if (choice === "q" || choice === "quit") {
    rl.close();
    return [];
  }

  if (choice === "a" || choice === "all") {
    rl.close();
    return changedTables;
  }

  if (choice === "f" || choice === "force") {
    rl.close();
    return [...ALL_TABLES];
  }

  if (choice === "s" || choice === "select") {
    console.log("\nAvailable tables:");
    ALL_TABLES.forEach((table, index) => {
      const changed = changedTables.includes(table);
      const marker = changed ? " (changed)" : "";
      console.log(`  [${index + 1}] ${table}${marker}`);
    });

    const selection = await promptUser(
      rl,
      "\nEnter table numbers separated by commas (e.g., 1,3,5): ",
    );
    rl.close();

    const indices = selection
      .split(",")
      .map((s) => parseInt(s.trim()) - 1)
      .filter((i) => i >= 0 && i < ALL_TABLES.length);

    return indices.map((i) => ALL_TABLES[i]);
  }

  rl.close();
  return changedTables;
}

// CSV and migration functions
function parseCsv(filePath: string): Record<string, string>[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function createTablesIfNotExist(tables: TableName[]) {
  console.log("\n📋 Creating tables if they don't exist...");

  const sortedTables = [...tables].sort(
    (a, b) => TABLE_CONFIG[a].order - TABLE_CONFIG[b].order,
  );

  const createStatements = sortedTables.map(
    (table) => TABLE_CONFIG[table].createSql,
  );

  if (createStatements.length > 0) {
    await getClient().batch(createStatements);
  }
}

async function migrateTable(table: TableName): Promise<number> {
  const config = TABLE_CONFIG[table];

  if (!fs.existsSync(config.csvPath)) {
    console.log(`  ⚠️  ${table}: CSV file not found, skipping`);
    return 0;
  }

  const rows = parseCsv(config.csvPath);

  const statements = rows.map((row) => ({
    sql: config.upsertSql,
    args: config.parseRow(row),
  }));

  for (const batch of chunk(statements, BATCH_SIZE)) {
    await getClient().batch(batch);
  }

  return rows.length;
}

async function runMigration(tables: TableName[]) {
  if (tables.length === 0) {
    console.log("\n👋 No tables to migrate. Exiting.");
    return;
  }

  // Sort tables by their dependency order
  const sortedTables = [...tables].sort(
    (a, b) => TABLE_CONFIG[a].order - TABLE_CONFIG[b].order,
  );

  console.log(`\n🚀 Starting migration for: ${sortedTables.join(", ")}`);

  // Create tables first
  await createTablesIfNotExist(sortedTables);

  // Migrate each table
  console.log("\n📥 Migrating data...");
  const hashes = loadHashes();

  for (const table of sortedTables) {
    const startTime = Date.now();
    const rowCount = await migrateTable(table);
    const duration = Date.now() - startTime;

    console.log(`  ✅ ${table}: ${rowCount} rows migrated (${duration}ms)`);

    // Update hash after successful migration
    const config = TABLE_CONFIG[table];
    if (fs.existsSync(config.csvPath)) {
      hashes[table] = computeFileHash(config.csvPath);
    }
  }

  // Save updated hashes
  saveHashes(hashes);

  console.log("\n✨ Migration completed successfully!");
}

function printUsage() {
  console.log(`
Usage: bun run scripts/migrate_turso.ts [options] [tables...]

Options:
  --all, -a       Migrate all tables (skip interactive selection)
  --changed, -c   Migrate only changed tables (skip interactive selection)
  --force, -f     Force migrate all tables, ignoring change detection
  --help, -h      Show this help message

Tables: ${ALL_TABLES.join(", ")}

Examples:
  bun run scripts/migrate_turso.ts                    # Interactive mode
  bun run scripts/migrate_turso.ts --changed          # Auto-migrate changed tables
  bun run scripts/migrate_turso.ts --all              # Migrate all tables
  bun run scripts/migrate_turso.ts teams players      # Migrate specific tables
  bun run scripts/migrate_turso.ts -f teams           # Force migrate teams table
`);
}

async function main() {
  try {
    const args = process.argv.slice(2);

    // Check for help flag
    if (args.includes("--help") || args.includes("-h")) {
      printUsage();
      return;
    }

    // Check for force flag
    const forceMode = args.includes("--force") || args.includes("-f");

    // Filter out flags to get table names
    const tableArgs = args.filter(
      (arg) => !arg.startsWith("-") && ALL_TABLES.includes(arg as TableName),
    ) as TableName[];

    // Determine which tables have changed
    const changedTables = forceMode ? ALL_TABLES : getChangedTables();

    let tablesToMigrate: TableName[];

    if (args.includes("--all") || args.includes("-a")) {
      // Migrate all tables
      tablesToMigrate = [...ALL_TABLES];
    } else if (args.includes("--changed") || args.includes("-c")) {
      // Migrate only changed tables
      tablesToMigrate = changedTables;
      if (tablesToMigrate.length === 0) {
        console.log("✨ All tables are up to date. Nothing to migrate.");
        return;
      }
    } else if (tableArgs.length > 0) {
      // Migrate specific tables from command line
      tablesToMigrate = tableArgs;
    } else {
      // Interactive mode
      tablesToMigrate = await selectTablesInteractively(changedTables);
    }

    await runMigration(tablesToMigrate);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main();

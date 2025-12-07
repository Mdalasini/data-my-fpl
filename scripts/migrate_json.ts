import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline";
import { z } from "zod";
import {
  TeamSchema,
  ChipSchema,
  ElementTypeSchema,
  ElementSchema,
  ElementStatSchema,
  ElementHistorySchema,
  ElementHistoryPastSchema,
  FixtureSchema,
  TeamElosSchema,
} from "./type";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.join(scriptDir, "../data");
const hashFilePath = path.join(dataDir, ".migration_hashes.json");

// Table configurations
const TABLE_CONFIG = {
  teams: {
    jsonPath: path.join(dataDir, "teams.json"),
    zodSchema: TeamSchema,
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
    parseRow: (row: z.infer<typeof TeamSchema>) => [
      row.code,
      row.id,
      row.name,
      row.short_name,
    ],
    order: 1,
  },
  fixtures: {
    jsonPath: path.join(dataDir, "fixtures.json"),
    zodSchema: FixtureSchema,
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
    parseRow: (row: z.infer<typeof FixtureSchema>) => [
      row.code,
      row.id,
      row.event,
      row.finished ? 1 : 0,
      row.team_h,
      row.team_a,
      row.kickoff_time,
      row.team_h_xg ? row.team_h_xg : null,
      row.team_a_xg ? row.team_a_xg : null,
    ],
    order: 2,
  },
  team_elos: {
    jsonPath: path.join(dataDir, "team_elos.json"),
    zodSchema: TeamElosSchema,
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
    parseRow: (row: z.infer<typeof TeamElosSchema>) => [
      row.team_id,
      row.off_elo,
      row.def_elo,
    ],
    order: 3,
  },
  chips: {
    jsonPath: path.join(dataDir, "chips.json"),
    zodSchema: ChipSchema,
    createSql: `CREATE TABLE IF NOT EXISTS chips (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      number INTEGER NOT NULL,
      start_event INTEGER NOT NULL,
      stop_event INTEGER NOT NULL,
      chip_type TEXT NOT NULL
    )`,
    upsertSql: `INSERT INTO chips (id, name, number, start_event, stop_event, chip_type)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        number = excluded.number,
        start_event = excluded.start_event,
        stop_event = excluded.stop_event,
        chip_type = excluded.chip_type`,
    parseRow: (row: z.infer<typeof ChipSchema>) => [
      row.id,
      row.name,
      row.number,
      row.start_event,
      row.stop_event,
      row.chip_type,
    ],
    order: 4,
  },
  element_types: {
    jsonPath: path.join(dataDir, "element_types.json"),
    zodSchema: ElementTypeSchema,
    createSql: `CREATE TABLE IF NOT EXISTS element_types (
      id INTEGER PRIMARY KEY,
      plural_name TEXT NOT NULL,
      plural_name_short TEXT NOT NULL,
      singular_name TEXT NOT NULL,
      singular_name_short TEXT NOT NULL,
      squad_select INTEGER NOT NULL,
      squad_min_play INTEGER NOT NULL,
      squad_max_play INTEGER NOT NULL
    )`,
    upsertSql: `INSERT INTO element_types (id, plural_name, plural_name_short, singular_name, singular_name_short, squad_select, squad_min_play, squad_max_play)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plural_name = excluded.plural_name,
        plural_name_short = excluded.plural_name_short,
        singular_name = excluded.singular_name,
        singular_name_short = excluded.singular_name_short,
        squad_select = excluded.squad_select,
        squad_min_play = excluded.squad_min_play,
        squad_max_play = excluded.squad_max_play`,
    parseRow: (row: z.infer<typeof ElementTypeSchema>) => [
      row.id,
      row.plural_name,
      row.plural_name_short,
      row.singular_name,
      row.singular_name_short,
      row.squad_select,
      row.squad_min_play,
      row.squad_max_play,
    ],
    order: 5,
  },
  elements: {
    jsonPath: path.join(dataDir, "elements.json"),
    zodSchema: ElementSchema,
    createSql: `CREATE TABLE IF NOT EXISTS elements (
      code INTEGER UNIQUE,
      id INTEGER PRIMARY KEY,
      can_transact BOOLEAN NOT NULL,
      can_select BOOLEAN NOT NULL,
      element_type INTEGER NOT NULL,
      first_name TEXT,
      second_name TEXT,
      web_name TEXT NOT NULL,
      news TEXT,
      news_added TEXT,
      now_cost INTEGER NOT NULL,
      points_per_game TEXT,
      removed BOOLEAN NOT NULL,
      selected_by_percent TEXT,
      status TEXT,
      team INTEGER NOT NULL,
      team_code INTEGER,
      total_points INTEGER NOT NULL,
      FOREIGN KEY(element_type) REFERENCES element_types(id),
      FOREIGN KEY(team) REFERENCES teams(id)
    )`,
    upsertSql: `INSERT INTO elements (code, id, can_transact, can_select, element_type, first_name, second_name, web_name, news, news_added, now_cost, points_per_game, removed, selected_by_percent, status, team, team_code, total_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        can_transact = excluded.can_transact,
        can_select = excluded.can_select,
        element_type = excluded.element_type,
        first_name = excluded.first_name,
        second_name = excluded.second_name,
        web_name = excluded.web_name,
        news = excluded.news,
        news_added = excluded.news_added,
        now_cost = excluded.now_cost,
        points_per_game = excluded.points_per_game,
        removed = excluded.removed,
        selected_by_percent = excluded.selected_by_percent,
        status = excluded.status,
        team = excluded.team,
        team_code = excluded.team_code,
        total_points = excluded.total_points`,
    parseRow: (row: z.infer<typeof ElementSchema>) => [
      row.code,
      row.id,
      row.can_transact ? 1 : 0,
      row.can_select ? 1 : 0,
      row.element_type,
      row.first_name,
      row.second_name,
      row.web_name,
      row.news,
      row.news_added,
      row.now_cost,
      row.points_per_game,
      row.removed ? 1 : 0,
      row.selected_by_percent,
      row.status,
      row.team,
      row.team_code,
      row.total_points,
    ],
    order: 6,
  },
  element_stats: {
    jsonPath: path.join(dataDir, "element_stats.json"),
    zodSchema: ElementStatSchema,
    createSql: `CREATE TABLE IF NOT EXISTS element_stats (
      label TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )`,
    upsertSql: `INSERT INTO element_stats (label, name) VALUES (?, ?)
      ON CONFLICT(label) DO UPDATE SET
        name = excluded.name`,
    parseRow: (row: z.infer<typeof ElementStatSchema>) => [row.label, row.name],
    order: 7,
  },
  element_history: {
    jsonPath: path.join(dataDir, "element_history.json"),
    zodSchema: ElementHistorySchema,
    createSql: `CREATE TABLE IF NOT EXISTS element_history (
      element INTEGER NOT NULL,
      fixture INTEGER NOT NULL,
      opponent_team INTEGER,
      total_points INTEGER,
      minutes INTEGER,
      starts INTEGER,
      goals_scored INTEGER,
      assists INTEGER,
      expected_goals TEXT,
      expected_assists TEXT,
      expected_goal_involvements TEXT,
      clean_sheets INTEGER,
      goals_conceded INTEGER,
      saves INTEGER,
      penalties_saved INTEGER,
      clearances_blocks_interceptions INTEGER,
      recoveries INTEGER,
      tackles INTEGER,
      expected_goals_conceded TEXT,
      yellow_cards INTEGER,
      red_cards INTEGER,
      own_goals INTEGER,
      penalties_missed INTEGER,
      bonus INTEGER,
      bps INTEGER,
      influence TEXT,
      creativity TEXT,
      threat TEXT,
      ict_index TEXT,
      value INTEGER,
      selected INTEGER,
      transfers_in INTEGER,
      transfers_out INTEGER,
      transfers_balance INTEGER,
      PRIMARY KEY(element, fixture),
      FOREIGN KEY(element) REFERENCES elements(id),
      FOREIGN KEY(fixture) REFERENCES fixtures(code),
      FOREIGN KEY(opponent_team) REFERENCES teams(id)
    )`,
    upsertSql: `INSERT INTO element_history (element, fixture, opponent_team, total_points, minutes, starts, goals_scored, assists, expected_goals, expected_assists, expected_goal_involvements, clean_sheets, goals_conceded, saves, penalties_saved, clearances_blocks_interceptions, recoveries, tackles, expected_goals_conceded, yellow_cards, red_cards, own_goals, penalties_missed, bonus, bps, influence, creativity, threat, ict_index, value, selected, transfers_in, transfers_out, transfers_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(element, fixture) DO UPDATE SET
        opponent_team = excluded.opponent_team,
        total_points = excluded.total_points,
        minutes = excluded.minutes,
        starts = excluded.starts,
        goals_scored = excluded.goals_scored,
        assists = excluded.assists,
        expected_goals = excluded.expected_goals,
        expected_assists = excluded.expected_assists,
        expected_goal_involvements = excluded.expected_goal_involvements,
        clean_sheets = excluded.clean_sheets,
        goals_conceded = excluded.goals_conceded,
        saves = excluded.saves,
        penalties_saved = excluded.penalties_saved,
        clearances_blocks_interceptions = excluded.clearances_blocks_interceptions,
        recoveries = excluded.recoveries,
        tackles = excluded.tackles,
        expected_goals_conceded = excluded.expected_goals_conceded,
        yellow_cards = excluded.yellow_cards,
        red_cards = excluded.red_cards,
        own_goals = excluded.own_goals,
        penalties_missed = excluded.penalties_missed,
        bonus = excluded.bonus,
        bps = excluded.bps,
        influence = excluded.influence,
        creativity = excluded.creativity,
        threat = excluded.threat,
        ict_index = excluded.ict_index,
        value = excluded.value,
        selected = excluded.selected,
        transfers_in = excluded.transfers_in,
        transfers_out = excluded.transfers_out,
        transfers_balance = excluded.transfers_balance`,
    parseRow: (row: z.infer<typeof ElementHistorySchema>) => [
      row.element,
      row.fixture,
      row.opponent_team,
      row.total_points,
      row.minutes,
      row.starts,
      row.goals_scored,
      row.assists,
      row.expected_goals,
      row.expected_assists,
      row.expected_goal_involvements,
      row.clean_sheets,
      row.goals_conceded,
      row.saves,
      row.penalties_saved,
      row.clearances_blocks_interceptions,
      row.recoveries,
      row.tackles,
      row.expected_goals_conceded,
      row.yellow_cards,
      row.red_cards,
      row.own_goals,
      row.penalties_missed,
      row.bonus,
      row.bps,
      row.influence,
      row.creativity,
      row.threat,
      row.ict_index,
      row.value,
      row.selected,
      row.transfers_in,
      row.transfers_out,
      row.transfers_balance,
    ],
    order: 8,
  },
  element_history_past: {
    jsonPath: path.join(dataDir, "element_history_past.json"),
    zodSchema: ElementHistoryPastSchema,
    createSql: `CREATE TABLE IF NOT EXISTS element_history_past (
      season_name TEXT NOT NULL,
      element_code INTEGER NOT NULL,
      start_cost INTEGER NOT NULL,
      end_cost INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      minutes INTEGER NOT NULL,
      starts INTEGER NOT NULL,
      goals_scored INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      clean_sheets INTEGER NOT NULL,
      goals_conceded INTEGER NOT NULL,
      own_goals INTEGER NOT NULL,
      saves INTEGER NOT NULL,
      expected_goals TEXT,
      expected_assists TEXT,
      expected_goal_involvements TEXT,
      expected_goals_conceded TEXT,
      yellow_cards INTEGER NOT NULL,
      red_cards INTEGER NOT NULL,
      penalties_saved INTEGER NOT NULL,
      penalties_missed INTEGER NOT NULL,
      bonus INTEGER NOT NULL,
      bps INTEGER NOT NULL,
      influence TEXT,
      creativity TEXT,
      threat TEXT,
      ict_index TEXT,
      defensive_contribution INTEGER NOT NULL,
      clearances_blocks_interceptions INTEGER NOT NULL,
      recoveries INTEGER NOT NULL,
      tackles INTEGER NOT NULL,
      PRIMARY KEY(season_name, element_code),
      FOREIGN KEY(element_code) REFERENCES elements(code)
    )`,
    upsertSql: `INSERT INTO element_history_past (season_name, element_code, start_cost, end_cost, total_points, minutes, starts, goals_scored, assists, clean_sheets, goals_conceded, own_goals, saves, expected_goals, expected_assists, expected_goal_involvements, expected_goals_conceded, yellow_cards, red_cards, penalties_saved, penalties_missed, bonus, bps, influence, creativity, threat, ict_index, defensive_contribution, clearances_blocks_interceptions, recoveries, tackles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(season_name, element_code) DO UPDATE SET
        start_cost = excluded.start_cost,
        end_cost = excluded.end_cost,
        total_points = excluded.total_points,
        minutes = excluded.minutes,
        starts = excluded.starts,
        goals_scored = excluded.goals_scored,
        assists = excluded.assists,
        clean_sheets = excluded.clean_sheets,
        goals_conceded = excluded.goals_conceded,
        own_goals = excluded.own_goals,
        saves = excluded.saves,
        expected_goals = excluded.expected_goals,
        expected_assists = excluded.expected_assists,
        expected_goal_involvements = excluded.expected_goal_involvements,
        expected_goals_conceded = excluded.expected_goals_conceded,
        yellow_cards = excluded.yellow_cards,
        red_cards = excluded.red_cards,
        penalties_saved = excluded.penalties_saved,
        penalties_missed = excluded.penalties_missed,
        bonus = excluded.bonus,
        bps = excluded.bps,
        influence = excluded.influence,
        creativity = excluded.creativity,
        threat = excluded.threat,
        ict_index = excluded.ict_index,
        defensive_contribution = excluded.defensive_contribution,
        clearances_blocks_interceptions = excluded.clearances_blocks_interceptions,
        recoveries = excluded.recoveries,
        tackles = excluded.tackles`,
    parseRow: (row: z.infer<typeof ElementHistoryPastSchema>) => [
      row.season_name,
      row.element_code,
      row.start_cost,
      row.end_cost,
      row.total_points,
      row.minutes,
      row.starts,
      row.goals_scored,
      row.assists,
      row.clean_sheets,
      row.goals_conceded,
      row.own_goals,
      row.saves,
      row.expected_goals,
      row.expected_assists,
      row.expected_goal_involvements,
      row.expected_goals_conceded,
      row.yellow_cards,
      row.red_cards,
      row.penalties_saved,
      row.penalties_missed,
      row.bonus,
      row.bps,
      row.influence,
      row.creativity,
      row.threat,
      row.ict_index,
      row.defensive_contribution,
      row.clearances_blocks_interceptions,
      row.recoveries,
      row.tackles,
    ],
    order: 9,
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
    if (!fs.existsSync(config.jsonPath)) continue;

    const currentHash = computeFileHash(config.jsonPath);
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
    console.log(`  ${table.padEnd(20)} ${status}`);
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

// JSON parsing and validation functions
function parseJson(filePath: string): any[] {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON file ${filePath}: ${error}`);
  }
}

function validateJsonRows(
  rows: any[],
  schema: z.ZodSchema,
  tableName: string,
): { validRows: any[]; invalidCount: number } {
  const validRows: any[] = [];
  let invalidCount = 0;

  for (const row of rows) {
    try {
      const validated = schema.parse(row);
      validRows.push(validated);
    } catch (error) {
      invalidCount++;
      if (invalidCount <= 5) {
        // Only show first 5 errors to avoid spam
        console.warn(`  ⚠️  Invalid row in ${tableName}: ${error}`);
      }
    }
  }

  if (invalidCount > 5) {
    console.warn(
      `  ⚠️  ... and ${invalidCount - 5} more invalid rows in ${tableName}`,
    );
  }

  return { validRows, invalidCount };
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

async function migrateTable(
  table: TableName,
): Promise<{ rowCount: number; invalidCount: number }> {
  const config = TABLE_CONFIG[table];

  if (!fs.existsSync(config.jsonPath)) {
    console.log(`  ⚠️  ${table}: JSON file not found, skipping`);
    return { rowCount: 0, invalidCount: 0 };
  }

  // Parse JSON file
  const rows = parseJson(config.jsonPath);

  // Validate rows against Zod schema
  const { validRows, invalidCount } = validateJsonRows(
    rows,
    config.zodSchema,
    table,
  );

  if (validRows.length === 0) {
    console.log(`  ⚠️  ${table}: No valid rows to migrate`);
    return { rowCount: 0, invalidCount };
  }

  // Create batch statements
  const statements = validRows.map((row) => ({
    sql: config.upsertSql,
    args: config.parseRow(row),
  }));

  // Execute in batches
  for (const batch of chunk(statements, BATCH_SIZE)) {
    await getClient().batch(batch);
  }

  return { rowCount: validRows.length, invalidCount };
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
  let totalInvalidRows = 0;

  for (const table of sortedTables) {
    const startTime = Date.now();
    const { rowCount, invalidCount } = await migrateTable(table);
    const duration = Date.now() - startTime;
    totalInvalidRows += invalidCount;

    console.log(`  ✅ ${table}: ${rowCount} rows migrated (${duration}ms)`);
    if (invalidCount > 0) {
      console.log(`     ⚠️  ${invalidCount} invalid rows skipped`);
    }

    // Update hash after successful migration
    const config = TABLE_CONFIG[table];
    if (fs.existsSync(config.jsonPath)) {
      hashes[table] = computeFileHash(config.jsonPath);
    }
  }

  // Save updated hashes
  saveHashes(hashes);

  console.log("\n✨ Migration completed successfully!");
  if (totalInvalidRows > 0) {
    console.log(`⚠️  Total invalid rows skipped: ${totalInvalidRows}`);
  }
}

function printUsage() {
  console.log(`
 Usage: bun run scripts/migrate_json.ts [options] [tables...]

 Options:
   --all, -a       Migrate all tables (skip interactive selection)
   --changed, -c   Migrate only changed tables (skip interactive selection)
   --force, -f     Force migrate all tables, ignoring change detection
   --help, -h      Show this help message

 Tables: ${ALL_TABLES.join(", ")}

 Examples:
   bun run scripts/migrate_json.ts                    # Interactive mode
   bun run scripts/migrate_json.ts --changed          # Auto-migrate changed tables
   bun run scripts/migrate_json.ts --all              # Migrate all tables
   bun run scripts/migrate_json.ts teams fixtures      # Migrate specific tables
   bun run scripts/migrate_json.ts -f teams           # Force migrate teams table
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

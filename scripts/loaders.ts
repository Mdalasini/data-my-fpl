import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "https://fantasy.premierleague.com/api";

const FixtureSchema = z.object({
  code: z.number(),
  event: z.number(),
  finished: z.boolean(),
  id: z.number(),
  kickoff_time: z.string(),
  team_a: z.number(),
  team_h: z.number(),
});

const ChipSchema = z.object({
  id: z.number(),
  name: z.string(),
  number: z.number(),
  start_event: z.number(),
  stop_event: z.number(),
  chip_type: z.string(),
});

const TeamSchema = z.object({
  code: z.number(),
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
});

const ElementStatSchema = z.object({
  label: z.string(),
  name: z.string(),
});

const ElementTypeSchema = z.object({
  id: z.number(),
  plural_name: z.string(),
  plural_name_short: z.string(),
  singular_name: z.string(),
  singular_name_short: z.string(),
  squad_select: z.number(),
  squad_min_play: z.number(),
  squad_max_play: z.number(),
});

const ElementSchema = z.object({
  can_transact: z.boolean(),
  can_select: z.boolean(),
  code: z.number(),
  element_type: z.number(),
  first_name: z.string(),
  id: z.number(),
  news: z.string(),
  news_added: z.string().nullable(),
  now_cost: z.number(),
  points_per_game: z.string(),
  removed: z.boolean(),
  second_name: z.string(),
  selected_by_percent: z.string(),
  status: z.string(),
  team: z.number(),
  team_code: z.number(),
  total_points: z.number(),
  web_name: z.string(),
});

const ElementHistorySchema = z.object({
  element: z.number(),
  fixture: z.number(),
  opponent_team: z.number(),
  total_points: z.number(),
  minutes: z.number(),
  starts: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  expected_goals: z.string(),
  expected_assists: z.string(),
  expected_goal_involvements: z.string(),
  clean_sheets: z.number(),
  goals_conceded: z.number(),
  saves: z.number(),
  penalties_saved: z.number(),
  clearances_blocks_interceptions: z.number(),
  recoveries: z.number(),
  tackles: z.number(),
  expected_goals_conceded: z.string(),
  yellow_cards: z.number(),
  red_cards: z.number(),
  own_goals: z.number(),
  penalties_missed: z.number(),
  bonus: z.number(),
  bps: z.number(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index: z.string(),
  value: z.number(),
  selected: z.number(),
  transfers_in: z.number(),
  transfers_out: z.number(),
  transfers_balance: z.number(),
});

const ElementHistoryPastSchema = z.object({
  season_name: z.string(),
  element_code: z.number(),
  start_cost: z.number(),
  end_cost: z.number(),
  total_points: z.number(),
  minutes: z.number(),
  starts: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  clean_sheets: z.number(),
  goals_conceded: z.number(),
  own_goals: z.number(),
  saves: z.number(),
  expected_goals: z.string(),
  expected_assists: z.string(),
  expected_goal_involvements: z.string(),
  expected_goals_conceded: z.string(),
  yellow_cards: z.number(),
  red_cards: z.number(),
  penalties_saved: z.number(),
  penalties_missed: z.number(),
  bonus: z.number(),
  bps: z.number(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index: z.string(),
  defensive_contribution: z.number(),
  clearances_blocks_interceptions: z.number(),
  recoveries: z.number(),
  tackles: z.number(),
});

type Fixture = z.infer<typeof FixtureSchema>;
type Chip = z.infer<typeof ChipSchema>;
type Team = z.infer<typeof TeamSchema>;
type ElementStat = z.infer<typeof ElementStatSchema>;
type ElementType = z.infer<typeof ElementTypeSchema>;
type Element = z.infer<typeof ElementSchema>;
type ElementHistory = z.infer<typeof ElementHistorySchema>;
type ElementHistoryPast = z.infer<typeof ElementHistoryPastSchema>;

export class Loaders {
  async loadFixtures(): Promise<Fixture[]> {
    console.log("🏟️  Fetching fixtures...");
    console.log(`   URL: ${BASE_URL}/fixtures/`);

    try {
      const response = await fetch(`${BASE_URL}/fixtures/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const fixtures = await response.json();
      const validatedFixtures = fixtures.map((fixture: unknown) =>
        FixtureSchema.parse(fixture),
      );

      console.log(
        `✅ Successfully loaded ${validatedFixtures.length} fixtures`,
      );
      return validatedFixtures;
    } catch (error) {
      console.error("❌ Error loading fixtures:", error);
      throw error;
    }
  }

  async loadChips(): Promise<Chip[]> {
    console.log("🎯 Fetching chips...");
    console.log(`   URL: ${BASE_URL}/bootstrap-static/`);

    try {
      const response = await fetch(`${BASE_URL}/bootstrap-static/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const bootstrap = await response.json();
      const validatedChips = bootstrap.chips.map((chip: unknown) =>
        ChipSchema.parse(chip),
      );

      console.log(`✅ Successfully loaded ${validatedChips.length} chips`);
      return validatedChips;
    } catch (error) {
      console.error("❌ Error loading chips:", error);
      throw error;
    }
  }

  async loadTeams(): Promise<Team[]> {
    console.log("🏆 Fetching teams...");
    console.log(`   URL: ${BASE_URL}/bootstrap-static/`);

    try {
      const response = await fetch(`${BASE_URL}/bootstrap-static/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const bootstrap = await response.json();
      const validatedTeams = bootstrap.teams.map((team: unknown) =>
        TeamSchema.parse(team),
      );

      console.log(`✅ Successfully loaded ${validatedTeams.length} teams`);
      return validatedTeams;
    } catch (error) {
      console.error("❌ Error loading teams:", error);
      throw error;
    }
  }

  async loadElementStats(): Promise<ElementStat[]> {
    console.log("📊 Fetching element stats...");
    console.log(`   URL: ${BASE_URL}/bootstrap-static/`);

    try {
      const response = await fetch(`${BASE_URL}/bootstrap-static/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const bootstrap = await response.json();
      const validatedElementStats = bootstrap.element_stats.map(
        (stat: unknown) => ElementStatSchema.parse(stat),
      );

      console.log(
        `✅ Successfully loaded ${validatedElementStats.length} element stats`,
      );
      return validatedElementStats;
    } catch (error) {
      console.error("❌ Error loading element stats:", error);
      throw error;
    }
  }

  async loadElementTypes(): Promise<ElementType[]> {
    console.log("👥 Fetching element types...");
    console.log(`   URL: ${BASE_URL}/bootstrap-static/`);

    try {
      const response = await fetch(`${BASE_URL}/bootstrap-static/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const bootstrap = await response.json();
      const validatedElementTypes = bootstrap.element_types.map(
        (type: unknown) => ElementTypeSchema.parse(type),
      );

      console.log(
        `✅ Successfully loaded ${validatedElementTypes.length} element types`,
      );
      return validatedElementTypes;
    } catch (error) {
      console.error("❌ Error loading element types:", error);
      throw error;
    }
  }

  async loadElements(): Promise<Element[]> {
    console.log("⚽ Fetching elements...");
    console.log(`   URL: ${BASE_URL}/bootstrap-static/`);

    try {
      const response = await fetch(`${BASE_URL}/bootstrap-static/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const bootstrap = await response.json();
      const validatedElements = bootstrap.elements.map((element: unknown) =>
        ElementSchema.parse(element),
      );

      console.log(
        `✅ Successfully loaded ${validatedElements.length} elements`,
      );
      return validatedElements;
    } catch (error) {
      console.error("❌ Error loading elements:", error);
      throw error;
    }
  }

  async loadElementHistory(elementId: number): Promise<ElementHistory[]> {
    console.log(`📈 Fetching element history for element ${elementId}...`);
    console.log(`   URL: ${BASE_URL}/element-summary/${elementId}/`);

    try {
      const response = await fetch(`${BASE_URL}/element-summary/${elementId}/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const summary = await response.json();
      const validatedHistory = summary.history.map((history: unknown) =>
        ElementHistorySchema.parse(history),
      );

      console.log(
        `✅ Successfully loaded ${validatedHistory.length} history records for element ${elementId}`,
      );
      return validatedHistory;
    } catch (error) {
      console.error(
        `❌ Error loading element history for element ${elementId}:`,
        error,
      );
      throw error;
    }
  }

  async loadElementHistoryPast(
    elementId: number,
  ): Promise<ElementHistoryPast[]> {
    console.log(`📊 Fetching element history past for element ${elementId}...`);
    console.log(`   URL: ${BASE_URL}/element-summary/${elementId}/`);

    try {
      const response = await fetch(`${BASE_URL}/element-summary/${elementId}/`);

      if (!response.ok) {
        console.error(
          `❌ Error fetching data from API (HTTP ${response.status})`,
        );
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("✅ Successfully fetched data from API");

      const summary = await response.json();
      const validatedHistoryPast = summary.history_past.map(
        (historyPast: unknown) => ElementHistoryPastSchema.parse(historyPast),
      );

      console.log(
        `✅ Successfully loaded ${validatedHistoryPast.length} history past records for element ${elementId}`,
      );
      return validatedHistoryPast;
    } catch (error) {
      console.error(
        `❌ Error loading player history past for element ${elementId}:`,
        error,
      );
      throw error;
    }
  }
}

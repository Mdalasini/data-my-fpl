import { z } from "zod";

export const FixtureSchema = z.object({
  code: z.number(),
  event: z.number(),
  finished: z.boolean(),
  id: z.number(), // primary key
  kickoff_time: z.string(),
  team_a: z.number(),
  team_h: z.number(),
  team_h_xg: z.number().optional(),
  team_a_xg: z.number().optional(),
});

export const ChipSchema = z.object({
  id: z.number(), // primary key
  name: z.string(),
  number: z.number(),
  start_event: z.number(),
  stop_event: z.number(),
  chip_type: z.string(),
});

export const TeamSchema = z.object({
  code: z.number(),
  id: z.number(), // primary key
  name: z.string(),
  short_name: z.string(),
});

export const TeamElosSchema = z.object({
  team_id: z.number(), // foreign key
  off_elo: z.number(),
  def_elo: z.number(),
});

export const ElementStatSchema = z.object({
  label: z.string(),
  name: z.string(),
});

export const ElementTypeSchema = z.object({
  id: z.number(),
  plural_name: z.string(),
  plural_name_short: z.string(),
  singular_name: z.string(),
  singular_name_short: z.string(),
  squad_select: z.number(),
  squad_min_play: z.number(),
  squad_max_play: z.number(),
});

export const ElementSchema = z.object({
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

export const ElementHistorySchema = z.object({
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

export const ElementHistoryPastSchema = z.object({
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

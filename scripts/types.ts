import { z } from "zod";

export const TeamRankingSchema = z.object({
  team_id: z.number(),
  off_rank: z.number(),
  def_rank: z.number(),
});

export type TeamRanking = z.infer<typeof TeamRankingSchema>;

export type TeamMapping = {
  code: number;
  id: number;
};

export type TeamNameToCodeIdMap = {
  [teamName: string]: TeamMapping;
};

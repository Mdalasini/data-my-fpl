import { TeamNameToCodeIdMap, TeamMapping } from "./types";

export const teamNametoCodeIdMap: TeamNameToCodeIdMap = {
  "Brighton and Hove": { code: 36, id: 6 },
  "Tottenham Hotspur": { code: 6, id: 18 },
  "Nottingham Forest": { code: 17, id: 16 },
  "West Ham United": { code: 21, id: 19 },
  "Manchester United": { code: 1, id: 14 },
  "Manchester City": { code: 43, id: 13 },
  "Leeds United": { code: 2, id: 11 },
  "Newcastle United": { code: 4, id: 15 },
  "Wolverhampton Wanderers": { code: 39, id: 20 },
  Liverpool: { code: 14, id: 12 },
  Arsenal: { code: 3, id: 1 },
  "Aston Villa": { code: 7, id: 2 },
  Everton: { code: 11, id: 9 },
  "Crystal Palace": { code: 31, id: 8 },
  Brentford: { code: 94, id: 5 },
  Fulham: { code: 54, id: 10 },
  Bournemouth: { code: 91, id: 4 },
  Chelsea: { code: 8, id: 7 },
  Burnley: { code: 90, id: 3 },
  Sunderland: { code: 56, id: 17 },
};

export const getTeamMapping = (teamName: string): TeamMapping | null => {
  return teamNametoCodeIdMap[teamName] || null;
};

export const hasTeamMapping = (teamName: string): boolean => {
  return teamName in teamNametoCodeIdMap;
};
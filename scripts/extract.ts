import { promises as fs } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { z } from "zod";

type TeamMapping = {
  [team_id: string]: { code: number; id: number };
};

const teamIdToCodeIdMap: TeamMapping = {
  e4a775cb: { code: 17, id: 16 }, // Nott'm Forest
  "822bd0ba": { code: 14, id: 12 }, // Liverpool
  "19538871": { code: 1, id: 14 }, // Man Utd
  "18bb7c10": { code: 3, id: 1 }, // Arsenal
  d07537b9: { code: 36, id: 6 }, // Brighton
  "8602292d": { code: 7, id: 2 }, // Aston Villa
  b2b47a98: { code: 4, id: 15 }, // Newcastle
  d3fd31cc: { code: 11, id: 9 }, // Everton
  b8fd03ef: { code: 43, id: 13 }, // Man City
  "47c64c55": { code: 31, id: 8 }, // Crystal Palace
  cd051869: { code: 94, id: 5 }, // Brentford
  fd962109: { code: 54, id: 10 }, // Fulham
  "4ba7cbea": { code: 91, id: 4 }, // Bournemouth
  cff3d9bb: { code: 8, id: 7 }, // Chelsea
  "8cec06e1": { code: 39, id: 20 }, // Wolves
  "7c21e445": { code: 21, id: 19 }, // West Ham
  "361ca564": { code: 6, id: 18 }, // Spurs
  "943e8050": { code: 90, id: 3 }, // Burnley
  "8ef52968": { code: 56, id: 17 }, // Sunderland
  "5bfb9659": { code: 2, id: 11 }, // Leeds United
};

const teamNametoCodeIdMap = {
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

const XGDataSchema = z.object({
  team_h: z.number(),
  team_a: z.number(),
  team_h_xg: z.number(),
  team_a_xg: z.number(),
});

const TeamRankingSchema = z.object({
  id: z.number(),
  off_rating: z.number(),
  def_rating: z.number(),
});

type XGData = z.infer<typeof XGDataSchema>;
type TeamRanking = z.infer<typeof TeamRankingSchema>;

export class Extractor {
  private scriptPath: string;
  private htmlDirPath: string;

  constructor() {
    this.scriptPath = path.dirname(__filename);
    this.htmlDirPath = path.join(this.scriptPath, "../html");
  }

  private extractTeamIdFromHref(href: string): string {
    const parts = href.split("/");
    if (parts.length >= 4) {
      return parts[3];
    }
    return "";
  }

  async extractXGData(): Promise<XGData[]> {
    console.log("📄 Reading FBRef fixtures HTML...");

    const fixturesPath = path.join(this.htmlDirPath, "fixtures.html");

    try {
      const htmlContent = await fs.readFile(fixturesPath, "utf-8");
      console.log(`   Read ${htmlContent.length.toLocaleString()} bytes`);

      const $ = cheerio.load(htmlContent);

      const table = $("table").first();
      if (table.length === 0) {
        console.log("   ❌ No table found in HTML");
        return [];
      }

      const tbody = table.find("tbody").first();
      if (tbody.length === 0) {
        console.log("   ❌ No tbody found in table");
        return [];
      }

      const rows = tbody.find("tr");
      console.log(`🔍 Parsing ${rows.length} fixture rows...`);

      const xgData: XGData[] = [];
      let parsedCount = 0;
      let skippedCount = 0;
      let withXgCount = 0;

      rows.each((_, row) => {
        const $row = $(row);

        // Get home team ID
        const homeTeamTd = $row.find("[data-stat='home_team']").first();
        if (homeTeamTd.length === 0) {
          skippedCount++;
          return;
        }

        const homeTeamA = homeTeamTd.find("a").first();
        if (homeTeamA.length === 0) {
          skippedCount++;
          return;
        }

        const homeHref = homeTeamA.attr("href") || "";
        if (!homeHref) {
          skippedCount++;
          return;
        }

        const fbrefHomeId = this.extractTeamIdFromHref(homeHref);
        const fplHomeTeam = teamIdToCodeIdMap[fbrefHomeId];

        // Get away team ID
        const awayTeamTd = $row.find("[data-stat='away_team']").first();
        if (awayTeamTd.length === 0) {
          skippedCount++;
          return;
        }

        const awayTeamA = awayTeamTd.find("a").first();
        if (awayTeamA.length === 0) {
          skippedCount++;
          return;
        }

        const awayHref = awayTeamA.attr("href") || "";
        if (!awayHref) {
          skippedCount++;
          return;
        }

        const fbrefAwayId = this.extractTeamIdFromHref(awayHref);
        const fplAwayTeam = teamIdToCodeIdMap[fbrefAwayId];

        // Get home xG
        const homeXgTd = $row.find("[data-stat='home_xg']").first();
        let homeXg: number | null = null;
        if (homeXgTd.length > 0) {
          const homeXgText = homeXgTd.text().trim();
          if (homeXgText) {
            const parsed = parseFloat(homeXgText);
            if (!isNaN(parsed)) {
              homeXg = parsed;
            }
          }
        }

        // Get away xG
        const awayXgTd = $row.find("[data-stat='away_xg']").first();
        let awayXg: number | null = null;
        if (awayXgTd.length > 0) {
          const awayXgText = awayXgTd.text().trim();
          if (awayXgText) {
            const parsed = parseFloat(awayXgText);
            if (!isNaN(parsed)) {
              awayXg = parsed;
            }
          }
        }

        // Only include fixtures with both xG values and valid team mappings
        if (fplHomeTeam && fplAwayTeam && homeXg !== null && awayXg !== null) {
          const xgRecord: XGData = {
            team_h: fplHomeTeam.id,
            team_a: fplAwayTeam.id,
            team_h_xg: homeXg,
            team_a_xg: awayXg,
          };

          xgData.push(xgRecord);
          withXgCount++;
        }

        parsedCount++;
      });

      console.log(
        `   ✅ Parsed ${parsedCount} fixtures (${withXgCount} with xG data)`,
      );
      if (skippedCount > 0) {
        console.log(`   ⚠️  Skipped ${skippedCount} rows (missing data)`);
      }

      return xgData;
    } catch (error) {
      console.error("❌ Error extracting xG data:", error);
      throw error;
    }
  }

  async extractRankings(): Promise<TeamRanking[]> {
    console.log("📄 Reading team rankings from HTML...");

    const rankingsPath = path.join(this.htmlDirPath, "rankings.html");

    try {
      const htmlContent = await fs.readFile(rankingsPath, "utf-8");
      console.log(`   Read ${htmlContent.length.toLocaleString()} bytes`);

      const $ = cheerio.load(htmlContent);

      const table = $("#rankings-table");
      if (table.length === 0) {
        console.log("   ❌ Rankings table not found");
        return [];
      }

      const tbody = table.find("tbody").first();
      if (tbody.length === 0) {
        console.log("   ❌ No tbody found in rankings table");
        return [];
      }

      const rows = tbody.find("tr");
      console.log(`🔍 Parsing ${rows.length} team rows...`);

      const rankings: TeamRanking[] = [];
      let parsedCount = 0;
      let skippedCount = 0;

      rows.each((_, row) => {
        const $row = $(row);
        const tds = $row.find("td");

        if (tds.length < 11) {
          skippedCount++;
          return;
        }

        // Extract team name from second td
        const teamTd = tds.eq(1);
        const teamSpan = teamTd.find("span.team.fw-bold").first();

        if (teamSpan.length === 0) {
          skippedCount++;
          return;
        }

        const teamName = teamSpan.text().trim();
        const teamMapping =
          teamNametoCodeIdMap[teamName as keyof typeof teamNametoCodeIdMap];

        if (!teamMapping) {
          console.log(`   ⚠️  No team mapping found for: ${teamName}`);
          skippedCount++;
          return;
        }

        // Extract offensive rating (10th td) and defensive rating (11th td)
        const offensiveRatingText = tds.eq(9).text().trim();
        const defensiveRatingText = tds.eq(10).text().trim();

        const offRating = parseFloat(offensiveRatingText);
        const defRating = parseFloat(defensiveRatingText);

        if (isNaN(offRating) || isNaN(defRating)) {
          skippedCount++;
          return;
        }

        const ranking: TeamRanking = {
          id: teamMapping.id,
          off_rating: offRating,
          def_rating: defRating,
        };

        rankings.push(ranking);
        parsedCount++;
      });

      console.log(`   ✅ Parsed ${parsedCount} teams`);
      if (skippedCount > 0) {
        console.log(`   ⚠️  Skipped ${skippedCount} rows (missing data)`);
      }

      return rankings;
    } catch (error) {
      console.error("❌ Error extracting rankings:", error);
      throw error;
    }
  }
}

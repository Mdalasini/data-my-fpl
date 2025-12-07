import { promises as fs } from "fs";
import path from "path";
import { Loaders } from "./loaders";
import { Extractor } from "./extract";

export class DataProcessor {
  private scriptPath: string;
  private dataDirPath: string;

  constructor() {
    this.scriptPath = path.dirname(__filename);
    this.dataDirPath = path.join(this.scriptPath, "../data");
  }

  async saveFixturesWithXG(): Promise<void> {
    console.log("⚽ Processing fixtures with xG data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();
    const extractor = new Extractor();

    try {
      // Load fixtures from API
      console.log("📥 Loading fixtures from API...");
      const fixtures = await loaders.loadFixtures();
      console.log(`   Loaded ${fixtures.length} fixtures`);

      // Extract xG data from HTML
      console.log("📊 Extracting xG data from HTML...");
      const xgData = await extractor.extractXGData();
      console.log(`   Extracted xG data for ${xgData.length} fixtures`);

      // Create a map for quick lookup of xG data
      const xgMap = new Map<string, { team_h_xg: number; team_a_xg: number }>();
      xgData.forEach((xg) => {
        const key = `${xg.team_h}-${xg.team_a}`;
        xgMap.set(key, {
          team_h_xg: xg.team_h_xg,
          team_a_xg: xg.team_a_xg,
        });
      });

      // Enrich fixtures with xG data
      console.log("🔧 Enriching fixtures with xG data...");
      let enrichedCount = 0;

      const enrichedFixtures = fixtures.map((fixture) => {
        const key = `${fixture.team_h}-${fixture.team_a}`;
        const xgInfo = xgMap.get(key);

        if (xgInfo) {
          enrichedCount++;
          return {
            ...fixture,
            team_h_xg: xgInfo.team_h_xg,
            team_a_xg: xgInfo.team_a_xg,
          };
        }

        return fixture;
      });

      console.log(`   ✅ Enriched ${enrichedCount} fixtures with xG data`);

      // Save enriched fixtures to JSON
      const fixturesPath = path.join(this.dataDirPath, "fixtures.json");
      console.log(`💾 Saving enriched fixtures to ${fixturesPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(
        fixturesPath,
        JSON.stringify(enrichedFixtures, null, 2),
      );

      console.log("✨ Done! Saved enriched fixtures with xG data");
      console.log(`   📊 Total fixtures: ${enrichedFixtures.length}`);
      console.log(`   📊 With xG data: ${enrichedCount}`);
    } catch (error) {
      console.error("❌ Error processing fixtures with xG data:", error);
      throw error;
    }
  }

  private calculateEloRatings(
    ratings: Array<{ team_id: number; rating: number }>,
  ): Map<number, number> {
    console.log("🎯 Calculating Elo ratings...");

    // Sort by rating (lower is better) to get ranking
    const sortedRatings = [...ratings].sort((a, b) => a.rating - b.rating);
    const totalTeams = sortedRatings.length;
    const eloRatings = new Map<number, number>();

    for (let i = 0; i < sortedRatings.length; i++) {
      const team = sortedRatings[i];
      const rank = i + 1; // Rank 1 is the best

      // Calculate Elo based on rank: rank 1 = 1700, last rank = 1300
      let elo: number;
      if (totalTeams === 1) {
        elo = 1500; // Single team gets middle rating
      } else {
        // Proportional distribution based on rank position
        const proportion = (rank - 1) / (totalTeams - 1); // 0 for rank 1, 1 for last rank
        elo = 1700 - proportion * 400; // 1700 for rank 1, 1300 for last rank
      }

      eloRatings.set(team.team_id, Math.round(elo));
    }

    return eloRatings;
  }

  async saveTeamElos(): Promise<void> {
    console.log("🏆 Processing team Elo ratings...");
    console.log("=".repeat(50));

    const extractor = new Extractor();

    try {
      // Extract team rankings from HTML
      console.log("📊 Extracting team rankings from HTML...");
      const rankings = await extractor.extractRankings();
      console.log(`   Extracted rankings for ${rankings.length} teams`);

      // Prepare data for Elo calculation
      const offensiveRatings = rankings.map((ranking) => ({
        team_id: ranking.id,
        rating: ranking.off_rating,
      }));

      const defensiveRatings = rankings.map((ranking) => ({
        team_id: ranking.id,
        rating: ranking.def_rating,
      }));

      // Calculate Elo ratings
      console.log("🎯 Calculating offensive Elo ratings...");
      const offEloRatings = this.calculateEloRatings(offensiveRatings);

      console.log("🎯 Calculating defensive Elo ratings...");
      const defEloRatings = this.calculateEloRatings(defensiveRatings);

      // Prepare data for JSON
      const teamElosData = rankings.map((ranking) => {
        return {
          team_id: ranking.id,
          off_elo: offEloRatings.get(ranking.id) || 1500,
          def_elo: defEloRatings.get(ranking.id) || 1500,
        };
      });

      console.log(
        `   ✅ Processed Elo ratings for ${teamElosData.length} teams`,
      );

      // Sort by team_id
      teamElosData.sort((a, b) => a.team_id - b.team_id);

      // Save to JSON
      const teamElosPath = path.join(this.dataDirPath, "team_elos.json");
      console.log(`💾 Saving team Elo ratings to ${teamElosPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(teamElosPath, JSON.stringify(teamElosData, null, 2));

      console.log("✨ Done! Saved Elo ratings for teams");
      console.log(`   📊 Total teams: ${teamElosData.length}`);
    } catch (error) {
      console.error("❌ Error processing team Elo ratings:", error);
      throw error;
    }
  }

  async saveChips(): Promise<void> {
    console.log("🎯 Saving chips data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // Load chips from API
      console.log("📥 Loading chips from API...");
      const chips = await loaders.loadChips();
      console.log(`   Loaded ${chips.length} chips`);

      // Save to JSON
      const chipsPath = path.join(this.dataDirPath, "chips.json");
      console.log(`💾 Saving chips to ${chipsPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(chipsPath, JSON.stringify(chips, null, 2));

      console.log("✨ Done! Saved chips data");
      console.log(`   📊 Total chips: ${chips.length}`);
    } catch (error) {
      console.error("❌ Error saving chips:", error);
      throw error;
    }
  }

  async saveTeams(): Promise<void> {
    console.log("🏆 Saving teams data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // Load teams from API
      console.log("📥 Loading teams from API...");
      const teams = await loaders.loadTeams();
      console.log(`   Loaded ${teams.length} teams`);

      // Save to JSON
      const teamsPath = path.join(this.dataDirPath, "teams.json");
      console.log(`💾 Saving teams to ${teamsPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(teamsPath, JSON.stringify(teams, null, 2));

      console.log("✨ Done! Saved teams data");
      console.log(`   📊 Total teams: ${teams.length}`);
    } catch (error) {
      console.error("❌ Error saving teams:", error);
      throw error;
    }
  }

  async saveElementStats(): Promise<void> {
    console.log("📊 Saving element stats data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // Load element stats from API
      console.log("📥 Loading element stats from API...");
      const elementStats = await loaders.loadElementStats();
      console.log(`   Loaded ${elementStats.length} element stats`);

      // Save to JSON
      const elementStatsPath = path.join(
        this.dataDirPath,
        "element_stats.json",
      );
      console.log(`💾 Saving element stats to ${elementStatsPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(
        elementStatsPath,
        JSON.stringify(elementStats, null, 2),
      );

      console.log("✨ Done! Saved element stats data");
      console.log(`   📊 Total element stats: ${elementStats.length}`);
    } catch (error) {
      console.error("❌ Error saving element stats:", error);
      throw error;
    }
  }

  async saveElementTypes(): Promise<void> {
    console.log("👥 Saving element types data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // Load element types from API
      console.log("📥 Loading element types from API...");
      const elementTypes = await loaders.loadElementTypes();
      console.log(`   Loaded ${elementTypes.length} element types`);

      // Save to JSON
      const elementTypesPath = path.join(
        this.dataDirPath,
        "element_types.json",
      );
      console.log(`💾 Saving element types to ${elementTypesPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(
        elementTypesPath,
        JSON.stringify(elementTypes, null, 2),
      );

      console.log("✨ Done! Saved element types data");
      console.log(`   📊 Total element types: ${elementTypes.length}`);
    } catch (error) {
      console.error("❌ Error saving element types:", error);
      throw error;
    }
  }

  async saveElements(): Promise<void> {
    console.log("⚽ Saving elements data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // Load elements from API
      console.log("📥 Loading elements from API...");
      const elements = await loaders.loadElements();
      console.log(`   Loaded ${elements.length} elements`);

      // Save to JSON
      const elementsPath = path.join(this.dataDirPath, "elements.json");
      console.log(`💾 Saving elements to ${elementsPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(elementsPath, JSON.stringify(elements, null, 2));

      console.log("✨ Done! Saved elements data");
      console.log(`   📊 Total elements: ${elements.length}`);
    } catch (error) {
      console.error("❌ Error saving elements:", error);
      throw error;
    }
  }

  private async processBatch<T>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<any>,
    itemName: string,
  ): Promise<{ results: any[]; failedCount: number }> {
    const results: any[] = [];
    let failedCount = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(
        `   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} ${itemName})`,
      );

      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await processor(item);
          return { success: true, data: result };
        } catch (error) {
          console.log(
            `     ⚠️  Failed to process ${itemName} ${i + index + 1}: ${error}`,
          );
          return { success: false, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result) => {
        if (result.success) {
          results.push(result.data);
        } else {
          failedCount++;
        }
      });

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { results, failedCount };
  }

  async saveElementHistory(): Promise<void> {
    console.log("📈 Saving element history data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // First load all elements to get their IDs
      console.log("📥 Loading elements to get element IDs...");
      const elements = await loaders.loadElements();
      console.log(`   Found ${elements.length} elements`);

      // Process element history in batches
      const batchSize = 10;
      console.log(
        `🔄 Processing element history in batches of ${batchSize}...`,
      );

      const { results: allHistory, failedCount } = await this.processBatch(
        elements,
        batchSize,
        async (element) => {
          const history = await loaders.loadElementHistory(element.id);
          return history;
        },
        "element",
      );

      // Flatten all history records into a single array
      const flatHistory = allHistory.flat();

      console.log(
        `   ✅ Processed ${elements.length - failedCount} elements successfully`,
      );
      if (failedCount > 0) {
        console.log(`   ⚠️  Failed to process ${failedCount} elements`);
      }
      console.log(`   📊 Total history records: ${flatHistory.length}`);

      // Save to JSON
      const elementHistoryPath = path.join(
        this.dataDirPath,
        "element_history.json",
      );
      console.log(`💾 Saving element history to ${elementHistoryPath}...`);

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(
        elementHistoryPath,
        JSON.stringify(flatHistory, null, 2),
      );

      console.log("✨ Done! Saved element history data");
      console.log(`   📊 Total history records: ${flatHistory.length}`);
      console.log(
        `   📊 Elements processed: ${elements.length - failedCount}/${elements.length}`,
      );
    } catch (error) {
      console.error("❌ Error saving element history:", error);
      throw error;
    }
  }

  async saveElementHistoryPast(): Promise<void> {
    console.log("📊 Saving element history past data...");
    console.log("=".repeat(50));

    const loaders = new Loaders();

    try {
      // First load all elements to get their IDs
      console.log("📥 Loading elements to get player IDs...");
      const elements = await loaders.loadElements();
      console.log(`   Found ${elements.length} elements`);

      // Process element history past in batches
      const batchSize = 10;
      console.log(
        `🔄 Processing element history past in batches of ${batchSize}...`,
      );

      const { results: allHistoryPast, failedCount } = await this.processBatch(
        elements,
        batchSize,
        async (element) => {
          const historyPast = await loaders.loadElementHistoryPast(element.id);
          return historyPast;
        },
        "elements",
      );

      // Flatten all history past records into a single array
      const flatHistoryPast = allHistoryPast.flat();

      console.log(
        `   ✅ Processed ${elements.length - failedCount} elements successfully`,
      );
      if (failedCount > 0) {
        console.log(`   ⚠️  Failed to process ${failedCount} elements`);
      }
      console.log(
        `   📊 Total history past records: ${flatHistoryPast.length}`,
      );

      // Save to JSON
      const elementHistoryPastPath = path.join(
        this.dataDirPath,
        "element_history_past.json",
      );
      console.log(
        `💾 Saving element history past to ${elementHistoryPastPath}...`,
      );

      await fs.mkdir(this.dataDirPath, { recursive: true });
      await fs.writeFile(
        elementHistoryPastPath,
        JSON.stringify(flatHistoryPast, null, 2),
      );

      console.log("✨ Done! Saved element history past data");
      console.log(
        `   📊 Total history past records: ${flatHistoryPast.length}`,
      );
      console.log(
        `   📊 Elements processed: ${elements.length - failedCount}/${elements.length}`,
      );
    } catch (error) {
      console.error("❌ Error saving element history past:", error);
      throw error;
    }
  }
}

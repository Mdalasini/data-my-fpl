import * as cheerio from "cheerio";
import { TeamRanking } from "./types";
import { getTeamMapping } from "./constants";
import { CacheManager } from "./cache";

export class HtmlParser {
  private rankingsUrl: string;
  private readonly DEFAULT_CACHE_TTL_HOURS = 48;
  private cacheManager: CacheManager;
  private useCache: boolean;
  private cacheTtlHours: number;

  constructor(
    rankingsUrl: string = "https://www.versussportssimulator.com/PLS/rankings",
    useCache: boolean = true,
    cacheManager?: CacheManager,
    cacheTtlHours?: number,
  ) {
    this.rankingsUrl = rankingsUrl;
    this.useCache = useCache;
    this.cacheManager = cacheManager || new CacheManager();
    this.cacheTtlHours = cacheTtlHours !== undefined ? cacheTtlHours : this.DEFAULT_CACHE_TTL_HOURS;
  }

  async fetchHtmlFromUrl(url?: string, useCache?: boolean): Promise<string> {
    const targetUrl = url || this.rankingsUrl;
    const shouldUseCache = useCache !== undefined ? useCache : this.useCache;
    const cacheKey = "rankings-html";

    // Try to use cache first
    if (shouldUseCache && this.cacheManager.isCacheValid(cacheKey, this.cacheTtlHours)) {
      try {
        const cachedHtml = await this.cacheManager.getCachedHtml(cacheKey);
        if (cachedHtml) {
          console.log(`📦 Using cached HTML from: ${targetUrl}`);
          console.log(`   Retrieved ${cachedHtml.length.toLocaleString()} bytes from cache`);
          return cachedHtml;
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Failed to read from cache, fetching fresh data:`, error);
      }
    }

    // Fetch fresh HTML
    try {
      console.log(`🌐 Fetching fresh HTML from: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const htmlContent = await response.text();
      console.log(`   Fetched ${htmlContent.length.toLocaleString()} bytes`);

      // Save to cache if caching is enabled
      if (shouldUseCache) {
        try {
          await this.cacheManager.setCachedHtml(cacheKey, htmlContent, targetUrl);
        } catch (error) {
          console.warn(`⚠️  Warning: Failed to save to cache:`, error);
        }
      }

      return htmlContent;
    } catch (error) {
      console.error(`❌ Error fetching HTML from ${targetUrl}:`, error);
      throw error;
    }
  }

  findRankingsTable($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
    const table = $("#rankings-table");
    if (table.length === 0) {
      console.log("   ❌ Rankings table not found");
    }
    return table;
  }

  findTableBody(table: cheerio.Cheerio<any>): cheerio.Cheerio<any> {
    const tbody = table.find("tbody").first();
    if (tbody.length === 0) {
      console.log("   ❌ No tbody found in rankings table");
    }
    return tbody;
  }

  extractTeamNameFromRow($row: cheerio.Cheerio<any>): string | null {
    const tds = $row.find("td");
    if (tds.length < 11) {
      return null;
    }

    const teamTd = tds.eq(1);
    const teamSpan = teamTd.find("span.team.fw-bold").first();

    if (teamSpan.length === 0) {
      return null;
    }

    return teamSpan.text().trim();
  }

  extractRatingsFromRow(
    $row: cheerio.Cheerio<any>,
  ): { offRating: number; defRating: number } | null {
    const tds = $row.find("td");
    if (tds.length < 11) {
      return null;
    }

    const offensiveRatingText = tds.eq(9).text().trim();
    const defensiveRatingText = tds.eq(10).text().trim();

    const offRating = parseFloat(offensiveRatingText);
    const defRating = parseFloat(defensiveRatingText);

    if (isNaN(offRating) || isNaN(defRating)) {
      return null;
    }

    return { offRating, defRating };
  }

  parseRankingRow($row: cheerio.Cheerio<any>): TeamRanking | null {
    const teamName = this.extractTeamNameFromRow($row);
    if (!teamName) {
      return null;
    }

    const teamMapping = getTeamMapping(teamName);
    if (!teamMapping) {
      console.log(`   ⚠️  No team mapping found for: ${teamName}`);
      return null;
    }

    const ratings = this.extractRatingsFromRow($row);
    if (!ratings) {
      return null;
    }

    return {
      team_id: teamMapping.id,
      off_rank: ratings.offRating,
      def_rank: ratings.defRating,
    };
  }

  async parseRankingsFromUrl(url?: string): Promise<TeamRanking[]> {
    console.log("📄 Reading team rankings from URL...");

    try {
      const htmlContent = await this.fetchHtmlFromUrl(url);
      const $ = cheerio.load(htmlContent);

      const table = this.findRankingsTable($);
      if (table.length === 0) {
        return [];
      }

      const tbody = this.findTableBody(table);
      if (tbody.length === 0) {
        return [];
      }

      const rows = tbody.find("tr");
      console.log(`🔍 Parsing ${rows.length} team rows...`);

      const rankings: TeamRanking[] = [];
      let parsedCount = 0;
      let skippedCount = 0;

      rows.each((_, row) => {
        const $row = $(row);
        const ranking = this.parseRankingRow($row);

        if (ranking) {
          rankings.push(ranking);
          parsedCount++;
        } else {
          skippedCount++;
        }
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

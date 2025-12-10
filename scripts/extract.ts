import { TeamRanking } from "./types";
import { HtmlParser } from "./html-parser";
import { CacheManager } from "./cache";

export class Extractor {
  private htmlParser: HtmlParser;

  constructor(rankingsUrl?: string, useCache?: boolean, cacheManager?: CacheManager, cacheTtlHours?: number) {
    this.htmlParser = new HtmlParser(rankingsUrl, useCache, cacheManager, cacheTtlHours);
  }

  async extractRankings(url?: string): Promise<TeamRanking[]> {
    return this.htmlParser.parseRankingsFromUrl(url);
  }
}
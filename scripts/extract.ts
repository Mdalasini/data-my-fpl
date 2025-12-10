import { TeamRanking } from "./types";
import { HtmlParser } from "./html-parser";

export class Extractor {
  private htmlParser: HtmlParser;

  constructor(rankingsUrl?: string) {
    this.htmlParser = new HtmlParser(rankingsUrl);
  }

  async extractRankings(url?: string): Promise<TeamRanking[]> {
    return this.htmlParser.parseRankingsFromUrl(url);
  }
}
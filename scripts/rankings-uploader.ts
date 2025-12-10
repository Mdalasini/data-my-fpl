import { Extractor } from "./extract";
import { TeamRanking } from "./types";
import { CacheManager } from "./cache";

export interface RankingsUploaderOptions {
  useCache?: boolean;
  clearCache?: boolean;
  cacheTtlHours?: number;
}

export class RankingsUploader {
  private extractor: Extractor;
  private apiUrl: string;
  private cacheManager: CacheManager;
  private options: RankingsUploaderOptions;

  constructor(apiUrl: string, options: RankingsUploaderOptions = {}) {
    this.options = {
      useCache: true,
      clearCache: false,
      cacheTtlHours: 48,
      ...options,
    };
    
    this.cacheManager = new CacheManager();
    this.extractor = new Extractor(undefined, this.options.useCache, this.cacheManager, this.options.cacheTtlHours);
    this.apiUrl = apiUrl;
  }

  async extractAndUploadRankings(): Promise<TeamRanking[]> {
    try {
      console.log("🚀 Starting rankings extraction and upload process...");

      // Clear cache if requested
      if (this.options.clearCache) {
        console.log("🗑️  Clearing cache as requested...");
        await this.cacheManager.clearCache();
      }

      // Extract rankings from HTML
      const rankings = await this.extractor.extractRankings();

      if (rankings.length === 0) {
        console.log("⚠️  No rankings data extracted, skipping upload");
        return rankings;
      }

      console.log(
        `📤 Uploading ${rankings.length} team rankings to ${this.apiUrl}`,
      );

      // Upload to API endpoint
      await this.uploadRankings(rankings);

      console.log("✅ Rankings uploaded successfully");
      return rankings;
    } catch (error) {
      console.error("❌ Error in extract and upload process:", error);
      throw error;
    }
  }

  private async uploadRankings(rankings: TeamRanking[]): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rankings),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("📊 Server response:", result);
    } catch (error) {
      console.error("❌ Error uploading rankings:", error);
      throw error;
    }
  }

  async extractOnly(): Promise<TeamRanking[]> {
    console.log("🔍 Extracting rankings only (no upload)...");
    return await this.extractor.extractRankings();
  }
}

// Convenience function for direct usage
export async function extractAndUploadRankings(
  apiUrl: string,
  options?: RankingsUploaderOptions,
): Promise<TeamRanking[]> {
  const uploader = new RankingsUploader(apiUrl, options);
  return await uploader.extractAndUploadRankings();
}

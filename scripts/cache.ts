import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as os from "os";

export interface CacheMetadata {
  timestamp: number;
  url?: string;
  size: number;
}

export interface CacheEntry {
  content: string; // base64 encoded HTML content
  metadata: CacheMetadata;
}

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.cwd(), ".cache");
  }

  getCacheDir(): string {
    return this.cacheDir;
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn(`⚠️  Warning: Could not create cache directory ${this.cacheDir}:`, error);
    }
  }

  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  private getMetadataFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.meta.json`);
  }

  async getCachedHtml(key: string): Promise<string | null> {
    try {
      const cacheFile = this.getCacheFilePath(key);
      const metadataFile = this.getMetadataFilePath(key);

      // Check if both files exist
      const [cacheExists, metadataExists] = await Promise.all([
        fs.access(cacheFile).then(() => true).catch(() => false),
        fs.access(metadataFile).then(() => true).catch(() => false)
      ]);

      if (!cacheExists || !metadataExists) {
        return null;
      }

      // Read cache entry
      const cacheContent = await fs.readFile(cacheFile, "utf-8");
      const cacheEntry: CacheEntry = JSON.parse(cacheContent);

      // Decode base64 content
      const htmlContent = Buffer.from(cacheEntry.content, "base64").toString("utf-8");
      
      return htmlContent;
    } catch (error) {
      console.warn(`⚠️  Warning: Error reading cache for key "${key}":`, error);
      return null;
    }
  }

  async setCachedHtml(key: string, content: string, url?: string): Promise<void> {
    try {
      await this.ensureCacheDir();

      const cacheFile = this.getCacheFilePath(key);
      const metadataFile = this.getMetadataFilePath(key);

      // Create cache entry
      const cacheEntry: CacheEntry = {
        content: Buffer.from(content, "utf-8").toString("base64"),
        metadata: {
          timestamp: Date.now(),
          url,
          size: content.length,
        },
      };

      // Write cache files
      await Promise.all([
        fs.writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2), "utf-8"),
        fs.writeFile(metadataFile, JSON.stringify(cacheEntry.metadata, null, 2), "utf-8"),
      ]);

      console.log(`💾 Cached ${content.length.toLocaleString()} bytes for key "${key}"`);
    } catch (error) {
      console.warn(`⚠️  Warning: Failed to write cache for key "${key}":`, error);
      // Don't throw - continue with fresh data
    }
  }

  isCacheValid(key: string, ttlHours: number): boolean {
    try {
      const metadataFile = this.getMetadataFilePath(key);
      
      // Check if metadata file exists
      fsSync.accessSync(metadataFile);
      
      // Read metadata
      const metadataContent = fsSync.readFileSync(metadataFile, "utf-8");
      const metadata: CacheMetadata = JSON.parse(metadataContent);
      
      // Check if cache is still valid
      const now = Date.now();
      const ttlMs = ttlHours * 60 * 60 * 1000;
      const isValid = (now - metadata.timestamp) < ttlMs;
      
      if (!isValid) {
        console.log(`🕐 Cache for key "${key}" expired (${Math.round((now - metadata.timestamp) / (60 * 60 * 1000))}h old)`);
      }
      
      return isValid;
    } catch (error) {
      console.log(`📂 No valid cache found for key "${key}"`);
      return false;
    }
  }

  async clearCache(key?: string): Promise<void> {
    try {
      if (key) {
        // Clear specific cache entry
        const cacheFile = this.getCacheFilePath(key);
        const metadataFile = this.getMetadataFilePath(key);
        
        await Promise.all([
          fs.unlink(cacheFile).catch(() => {}), // Ignore if file doesn't exist
          fs.unlink(metadataFile).catch(() => {}), // Ignore if file doesn't exist
        ]);
        
        console.log(`🗑️  Cleared cache for key "${key}"`);
      } else {
        // Clear all cache entries
        try {
          const files = await fs.readdir(this.cacheDir);
          const cacheFiles = files.filter(file => file.endsWith('.json'));
          
          await Promise.all(
            cacheFiles.map(file => 
              fs.unlink(path.join(this.cacheDir, file)).catch(() => {})
            )
          );
          
          console.log(`🗑️  Cleared all cache files (${cacheFiles.length} files)`);
        } catch (error) {
          // Cache directory doesn't exist or is empty
          console.log(`📂 Cache directory is empty or doesn't exist`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Error clearing cache:`, error);
    }
  }

  async getCacheInfo(key: string): Promise<CacheMetadata | null> {
    try {
      const metadataFile = this.getMetadataFilePath(key);
      const metadataContent = await fs.readFile(metadataFile, "utf-8");
      return JSON.parse(metadataContent);
    } catch (error) {
      return null;
    }
  }
}
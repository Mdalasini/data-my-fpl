import { extractAndUploadRankings, RankingsUploaderOptions } from "./rankings-uploader";

interface CliArgs {
  noCache: boolean;
  clearCache: boolean;
  cacheTtlHours?: number;
}

function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    noCache: false,
    clearCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case "--no-cache":
        result.noCache = true;
        break;
      case "--clear-cache":
        result.clearCache = true;
        break;
      case "--cache-ttl":
        if (i + 1 < args.length) {
          const ttl = parseInt(args[i + 1], 10);
          if (!isNaN(ttl) && ttl >= 0) {
            result.cacheTtlHours = ttl;
            i++; // Skip the next argument
          } else {
            console.error("Invalid --cache-ttl value. Must be a non-negative number.");
            process.exit(1);
          }
        } else {
          console.error("--cache-ttl requires a value (number of hours).");
          process.exit(1);
        }
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: bun scripts/upload-rankings.ts [options]

Options:
  --no-cache          Skip cache and always fetch fresh data
  --clear-cache       Clear cache before running
  --cache-ttl <hours> Override cache TTL in hours (default: 48)
  --help, -h          Show this help message

Environment Variables:
  UPLOAD_RANKINGS_URL  API endpoint URL for uploading rankings (required)
        `);
        process.exit(0);
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown option: ${arg}`);
          console.error("Use --help for available options.");
          process.exit(1);
        }
    }
  }

  return result;
}

async function main() {
  try {
    // Parse CLI arguments
    const cliArgs = parseCliArgs();
    
    // Extract rankings and upload to the default endpoint
    let url = process.env.UPLOAD_RANKINGS_URL;
    if (!url) {
      console.error("UPLOAD_RANKINGS_URL environment variable is not set");
      process.exit(1);
    }

    // Prepare uploader options
    const options: RankingsUploaderOptions = {
      useCache: !cliArgs.noCache,
      clearCache: cliArgs.clearCache,
      cacheTtlHours: cliArgs.cacheTtlHours,
    };

    console.log("🔧 Configuration:");
    console.log(`   Use Cache: ${options.useCache}`);
    console.log(`   Clear Cache: ${options.clearCache}`);
    if (options.cacheTtlHours) {
      console.log(`   Cache TTL: ${options.cacheTtlHours} hours`);
    }
    console.log(`   API URL: ${url}`);
    console.log("");

    await extractAndUploadRankings(url, options);
  } catch (error) {
    console.error("Failed to extract and upload rankings:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

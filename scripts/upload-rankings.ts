import { extractAndUploadRankings } from "./rankings-uploader";

async function main() {
  try {
    // Extract rankings and upload to the default endpoint
    let url = process.env.UPLOAD_RANKINGS_URL;
    if (!url) {
      console.error("UPLOAD_RANKINGS_URL environment variable is not set");
      process.exit(1);
    }

    await extractAndUploadRankings(url);
  } catch (error) {
    console.error("Failed to extract and upload rankings:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

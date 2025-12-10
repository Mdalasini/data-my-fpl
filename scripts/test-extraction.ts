import { RankingsUploader } from "./rankings-uploader";

async function testExtractionOnly() {
  try {
    console.log("🧪 Testing URL-based extraction only (no API call)...");

    let url = process.env.UPLOAD_RANKINGS_URL;
    if (!url) {
      console.error("UPLOAD_RANKINGS_URL environment variable is not set");
      process.exit(1);
    }

    const uploader = new RankingsUploader(url);
    const rankings = await uploader.extractOnly();

    console.log(
      `✅ Successfully extracted ${rankings.length} rankings from URL`,
    );
    console.log("Sample data:", rankings.slice(0, 2));
    console.log("📤 Ready to upload to:", url);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run test if this file is executed directly
if (import.meta.main) {
  testExtractionOnly();
}

import { Extractor } from "./extract";

async function testExtractors() {
  console.log("🧪 Testing extractors...");
  console.log("=" * 50);
  
  const extractor = new Extractor();
  
  // Test XG data extraction
  console.log("📊 Testing XG data extraction...");
  console.log("-".repeat(30));
  
  try {
    const xgData = await extractor.extractXGData();
    console.log(`✅ XG extraction successful! Found ${xgData.length} fixtures with xG data`);
    
    if (xgData.length > 0) {
      console.log("📋 Sample XG data:");
      console.log(JSON.stringify(xgData.slice(0, 3), null, 2));
    }
  } catch (error) {
    console.error("❌ XG extraction failed:", error);
  }
  
  console.log("\n");
  
  // Test rankings extraction
  console.log("🏆 Testing rankings extraction...");
  console.log("-".repeat(30));
  
  try {
    const rankings = await extractor.extractRankings();
    console.log(`✅ Rankings extraction successful! Found ${rankings.length} teams with ratings`);
    
    if (rankings.length > 0) {
      console.log("📋 Sample rankings data:");
      console.log(JSON.stringify(rankings.slice(0, 3), null, 2));
    }
  } catch (error) {
    console.error("❌ Rankings extraction failed:", error);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Testing complete!");
}

// Run the test
testExtractors().catch(console.error);
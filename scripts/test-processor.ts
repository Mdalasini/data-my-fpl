import { DataProcessor } from "./processor";

async function main() {
  console.log("🚀 Starting data processing...");
  
  const processor = new DataProcessor();
  
  try {
    // Test saveTeams method
    console.log("🧪 Testing saveTeams method...");
    await processor.saveTeams();
    console.log("\n");
    
    // Process fixtures with xG data
    await processor.processFixturesWithXG();
    console.log("\n");
    
    // Process team Elo ratings
    await processor.processTeamElos();
    
  } catch (error) {
    console.error("❌ Processing failed:", error);
    process.exit(1);
  }
}

main();
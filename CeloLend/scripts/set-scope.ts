import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Setting scope for deployed CeloLend contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // Configuration - UPDATE THESE VALUES
  const CELOLEND_ADDRESS = "0x882b5943E106C057040666F4682dd901c1E08A98"; // Replace with your deployed address
  const SCOPE_HASH = "1981536065571106722092969880896331232724889181651674157778378879891802756585"; // Replace with scope hash from Self tools
  const SCOPE_SEED = "celolend"; // Replace with your scope seed

  console.log("🔗 CeloLend Address:", CELOLEND_ADDRESS);
  console.log("🔑 Scope Hash:", SCOPE_HASH);
  console.log("🎯 Scope Seed:", SCOPE_SEED);

//   if (CELOLEND_ADDRESS === "YOUR_DEPLOYED_CELOLEND_ADDRESS") {
//     console.error("❌ Please update CELOLEND_ADDRESS in the script");
//     process.exit(1);
//   }

//   if (SCOPE_HASH === "YOUR_SCOPE_HASH") {
//     console.error("❌ Please update SCOPE_HASH in the script");
//     process.exit(1);
//   }

//   if (SCOPE_SEED === "YOUR_SCOPE_SEED") {
//     console.error("❌ Please update SCOPE_SEED in the script");
//     process.exit(1);
//   }

  try {
    // Step 1: Get the deployed CeloLend contract
    console.log("\n🔍 Step 1: Connecting to deployed CeloLend contract...");

    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = CeloLend.attach(CELOLEND_ADDRESS);

    console.log("✅ Connected to CeloLend contract");

    // Step 2: Set the new scope
    console.log("\n🎯 Step 2: Setting new scope...");
    console.log(`  Setting scope to: ${SCOPE_HASH}`);

    const tx = await celoLend.setScope(SCOPE_HASH);
    await tx.wait();

    console.log("✅ Scope set successfully!");

    // Step 3: Output summary
    console.log("\n🎉 SCOPE SETTING COMPLETE!");
    console.log("=".repeat(50));
    console.log("📋 SCOPE SUMMARY:");
    console.log("=".repeat(50));
    console.log(`🔗 CeloLend Address: ${CELOLEND_ADDRESS}`);
    console.log(`🎯 Scope Seed (for frontend): ${SCOPE_SEED}`);
    console.log(`🔑 Scope Hash (in contract): ${SCOPE_HASH}`);
    console.log("");
    console.log("📝 NEXT STEPS:");
    console.log("1. Update frontend addresses.ts with new CeloLend address");
    console.log(
      "2. Update frontend SelfVerificationFlow.tsx with scope seed: '" +
        SCOPE_SEED +
        "'"
    );
    console.log("3. Test the verification flow");

    // Step 4: Save scope info to file
    const scopeInfo = {
      timestamp: new Date().toISOString(),
      network: "alfajores",
      celoLendAddress: CELOLEND_ADDRESS,
      scopeSeed: SCOPE_SEED,
      scopeHash: SCOPE_HASH,
      configId:
        "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62",
    };

    const fs = require("fs");
    fs.writeFileSync("scope-config.json", JSON.stringify(scopeInfo, null, 2));
    console.log("\n💾 Scope info saved to: scope-config.json");
  } catch (error) {
    console.error("❌ Setting scope failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

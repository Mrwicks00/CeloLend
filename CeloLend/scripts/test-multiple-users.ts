import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Multiple User Verification");
  console.log("=".repeat(50));

  // Your deployed CeloLend contract address
  const CELOLEND_ADDRESS = "0x8f6415a4918d730f766031a7ea9ebcC8Ec1eB689";

  try {
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = CeloLend.attach(CELOLEND_ADDRESS);

    console.log("✅ Connected to CeloLend contract:", CELOLEND_ADDRESS);

    // Check current verification status
    console.log("\n📊 Current Contract State:");
    console.log("=".repeat(30));

    // Get some sample addresses to check
    const sampleAddresses = [
      "0xB24023434c3670E100068C925A87fE8F500d909a"
      
    ];

    for (const addr of sampleAddresses) {
      try {
        const isVerified = await celoLend.isUserVerified(addr);
        const userIdentifier = await celoLend.userIdentifiers(addr);
        console.log(
          `Address ${addr.slice(0, 10)}...: ${
            isVerified ? "✅ Verified" : "❌ Not Verified"
          }`
        );
        if (userIdentifier !== ethers.ZeroHash) {
          console.log(`  User ID: ${userIdentifier}`);
        }
      } catch (error) {
        console.log(`Address ${addr.slice(0, 10)}...: Error checking status`);
      }
    }

    console.log("\n📋 TESTING INSTRUCTIONS:");
    console.log("=".repeat(30));
    console.log("1. Create a NEW mock passport in Self app:");
    console.log("   - Tap 5 times on Self card");
    console.log("   - Create a new mock passport");
    console.log("   - Use a DIFFERENT wallet address");
    console.log("");
    console.log("2. Try to verify with the new passport + wallet");
    console.log("   - This should work because it's a new nullifier");
    console.log("");
    console.log("3. If it fails, the issue might be:");
    console.log("   - Same mock passport being reused");
    console.log("   - Same wallet address being reused");
    console.log("   - Contract configuration issue");
    console.log("");
    console.log("🔍 To debug further, check:");
    console.log("   - Are you using different mock passports?");
    console.log("   - Are you using different wallet addresses?");
    console.log("   - Is the scope hash correctly set?");

    // Check contract configuration
    console.log("\n🔧 Contract Configuration:");
    console.log("=".repeat(30));
    try {
      const scope = await celoLend.scope();
      const configId = await celoLend.configId();
      console.log(`Scope: ${scope}`);
      console.log(`Config ID: ${configId}`);
    } catch (error) {
      console.log("Could not read contract configuration");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

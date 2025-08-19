import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Debugging Verification Status");
  console.log("=".repeat(50));

  const CELOLEND_ADDRESS = "0xd8A50eb7DFab67b0127a6BCa934b6B5b74282E81";

  try {
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = CeloLend.attach(CELOLEND_ADDRESS);

    console.log("✅ Connected to CeloLend contract:", CELOLEND_ADDRESS);

    // Check the userIdentifiers mapping directly
    console.log("\n📊 Checking userIdentifiers mapping:");
    console.log("=".repeat(40));

    const testAddresses = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    ];

    for (const addr of testAddresses) {
      try {
        // Check the mapping directly
        const userIdentifier = await celoLend.userIdentifiers(addr);
        console.log(`Address ${addr.slice(0, 10)}...: ${userIdentifier}`);
        
        // Check if it's verified using the function
        const isVerified = await celoLend.isUserVerified(addr);
        console.log(`  isUserVerified: ${isVerified}`);
        
        if (userIdentifier !== ethers.ZeroHash) {
          console.log(`  ✅ Has user identifier: ${userIdentifier}`);
        } else {
          console.log(`  ❌ No user identifier`);
        }
        console.log("");
      } catch (error) {
        console.log(`Address ${addr.slice(0, 10)}...: Error - ${error.message}`);
      }
    }

    // Check the identifierToWallet mapping for any stored identifiers
    console.log("📋 Checking identifierToWallet mapping:");
    console.log("=".repeat(40));

    // Get recent events to see what identifiers were used
    const events = await celoLend.queryFilter(
      celoLend.filters.UserVerified(),
      "latest",
      "latest"
    );

    if (events.length > 0) {
      console.log(`Found ${events.length} recent UserVerified events`);
      // Note: We can't easily decode the event args without the full ABI
      // But we can see that events are being emitted
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Verification Events");
  console.log("=".repeat(50));

  // Your deployed CeloLend contract address
  const CELOLEND_ADDRESS = "0xd8A50eb7DFab67b0127a6BCa934b6B5b74282E81";

  try {
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = CeloLend.attach(CELOLEND_ADDRESS);

    console.log("✅ Connected to CeloLend contract:", CELOLEND_ADDRESS);

    // Get the UserVerified event signature
    const userVerifiedEventSignature = "UserVerified(address,bytes32,string)";
    const eventTopic = ethers.keccak256(
      ethers.toUtf8Bytes(userVerifiedEventSignature)
    );

    console.log("\n📊 Checking for UserVerified events:");
    console.log("=".repeat(40));

    // Get the latest block number
    const latestBlock = await ethers.provider.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Check events from the last 1000 blocks
    const fromBlock = Math.max(0, latestBlock - 1000);
    console.log(`Checking events from block ${fromBlock} to ${latestBlock}`);

    // Get UserVerified events
    const events = await celoLend.queryFilter(
      celoLend.filters.UserVerified(),
      fromBlock,
      latestBlock
    );

    if (events.length === 0) {
      console.log("❌ No UserVerified events found in the last 1000 blocks");
      console.log("\n🔍 This means:");
      console.log(
        "   - The contract's customVerificationHook is not being called"
      );
      console.log(
        "   - The Self Protocol verification is not reaching the contract"
      );
      console.log(
        "   - The verification might be simulated or going through a different path"
      );
    } else {
      console.log(`✅ Found ${events.length} UserVerified event(s):`);
      console.log("=".repeat(40));

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        console.log(`Event ${i + 1}:`);
        console.log(`  Block: ${event.blockNumber}`);
        console.log(`  Transaction: ${event.transactionHash}`);
        console.log("");
      }
    }

    // Also check current verification status for some addresses
    console.log("📋 Current Verification Status:");
    console.log("=".repeat(40));

    const sampleAddresses = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat default
      "0x92c7b8C73f9EfAA4D47545B1c0bFaf3375743e79", // Another Hardhat default
    ];

    for (const addr of sampleAddresses) {
      try {
        const isVerified = await celoLend.userIdentifiers(addr);
        console.log(
          `Address ${addr.slice(0, 10)}...: ${
            isVerified !== ethers.ZeroHash ? "✅ Verified" : "❌ Not Verified"
          }`
        );
        if (isVerified !== ethers.ZeroHash) {
          console.log(`  User ID: ${isVerified}`);
        }
      } catch (error) {
        console.log(`Address ${addr.slice(0, 10)}...: Error checking status`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking events:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

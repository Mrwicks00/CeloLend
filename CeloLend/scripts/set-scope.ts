import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Setting scope for CeloLend contract...");

  // Configuration - UPDATE THESE VALUES
  const CELOLEND_ADDRESS = "0x9a66C3b09eD66c7b7cf1ad3C04F87CCd022bbCf3"; // Replace with your deployed CeloLend address
  const SCOPE_HASH = "5481686980359857257105898219431995075985161095766020325523210795386920118180"; // Replace with your scope hash from tools.self.xyz
  const SCOPE_SEED = "celolend"; // Your scope seed (e.g., "celolend")

  console.log("📋 Configuration:");
  console.log("   CeloLend Address:", CELOLEND_ADDRESS);
  console.log("   Scope Hash:", SCOPE_HASH);
  console.log("   Scope Seed:", SCOPE_SEED);

  // if (CELOLEND_ADDRESS === "0x..." || SCOPE_HASH === "0x...") {
  //   console.error(
  //     "❌ Please update the configuration values in this script before running"
  //   );
  //   process.exit(1);
  // }

  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Attach to the deployed CeloLend contract
    console.log("\n🔗 Attaching to deployed CeloLend contract...");
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = CeloLend.attach(CELOLEND_ADDRESS) as any;

    // Verify contract exists
    const deployedCode = await deployer.provider.getCode(CELOLEND_ADDRESS);
    if (deployedCode === "0x") {
      throw new Error("No contract found at the specified address");
    }
    console.log("✅ Contract found at address");

    // Check current scope
    console.log("\n📊 Current contract state:");
    const currentScope = await celoLend.scope();
    const currentConfigId = await celoLend.configId();
    const owner = await celoLend.owner();

    console.log("   Current Scope:", currentScope.toString());
    console.log("   Current Config ID:", currentConfigId);
    console.log("   Contract Owner:", owner);

    // Verify we're the owner
    if (owner !== deployer.address) {
      console.error(
        "❌ You are not the contract owner. Only the owner can set the scope."
      );
      process.exit(1);
    }

    // Set the scope
    console.log("\n🔧 Setting new scope...");
    const scopeValue = ethers.getBigInt(SCOPE_HASH);
    console.log("   Converting scope hash to uint256:", scopeValue.toString());

    const tx = await celoLend.setScope(scopeValue);
    console.log("   Transaction hash:", tx.hash);

    await tx.wait();
    console.log("✅ Scope updated successfully!");

    // // Verify the change
    // console.log("\n🔍 Verifying scope update...");
    // const newScope = await celoLend.scope();
    // console.log("   New Scope:", newScope.toString());

    // if (newScope.toString() === scopeValue.toString()) {
    //   console.log("✅ Scope verification successful!");
    // } else {
    //   console.error("❌ Scope verification failed!");
    //   console.log("   Expected:", scopeValue.toString());
    //   console.log("   Actual:", newScope.toString());
    //   process.exit(1);
    // }

    // Test verification configuration
    console.log("\n🧪 Testing verification configuration...");

    // Test isUserVerified function
    const testAddress = "0xB24023434c3670E100068C925A87fE8F500d909a";
    const isVerified = await celoLend.isUserVerified(testAddress);
    console.log(
      "   Test verification check for",
      testAddress + ":",
      isVerified
    );

    // Test getUserIdentifier function
    const userIdentifier = await celoLend.getUserIdentifier(testAddress);
    console.log(
      "   Test user identifier for",
      testAddress + ":",
      userIdentifier
    );

    console.log("\n🎉 Scope configuration completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Contract address verified");
    console.log("   ✅ Owner permissions confirmed");
    console.log(
      "   ✅ Scope updated from",
      currentScope.toString(),
      "to",
      // newScope.toString()
    );
    console.log("   ✅ Verification functions tested");

    console.log("\n🚀 Next Steps:");
    console.log("1. Update your frontend configuration with the new scope");
    console.log("2. Test the Self Protocol integration");
    console.log("3. Verify that the customVerificationHook is being called");

    // Save configuration info
    const configInfo = {
      network: "alfajores",
      celoLendAddress: CELOLEND_ADDRESS,
      scopeHash: SCOPE_HASH,
      scopeSeed: SCOPE_SEED,
      scopeValue: scopeValue.toString(),
      configId: currentConfigId,
      owner: owner,
      updatedAt: new Date().toISOString(),
      transactionHash: tx.hash,
    };

    console.log("\n💾 Configuration Info:");
    console.log(JSON.stringify(configInfo, null, 2));
  } catch (error: any) {
    console.error("❌ Failed to set scope:", error);

    if (error.message && error.message.includes("execution reverted")) {
      console.error("\n💡 Possible issues:");
      console.error("   - You are not the contract owner");
      console.error("   - The contract address is incorrect");
      console.error("   - The scope hash format is invalid");
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

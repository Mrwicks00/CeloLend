import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Fresh CeloLend Contract for Testing");
  console.log("=".repeat(60));

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", await deployer.getAddress());

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "CELO");

  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance for deployment");
    process.exit(1);
  }

  // Use existing contract addresses (from your previous deployment)
  const existingAddresses = {
    CollateralVault: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    CreditScore: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    PriceOracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    MentoIntegration: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  };

  // Generate unique scope for this test deployment
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueScope = ethers.keccak256(ethers.toUtf8Bytes(`test-${timestamp}`));

  console.log("🔑 Generated unique scope for testing:", uniqueScope);

  try {
    // Deploy CeloLend with unique scope
    console.log("\n📦 Deploying CeloLend contract...");
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = await CeloLend.deploy(
      "0x68c931C9a534D37aa78094877F46fE46a49F1A51", // _identityVerificationHubV2
      uniqueScope, // _scope (unique for this test)
      "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62", // _configId
      existingAddresses.CollateralVault,
      existingAddresses.CreditScore,
      existingAddresses.PriceOracle,
      existingAddresses.MentoIntegration
    );

    await celoLend.waitForDeployment();
    const celoLendAddress = await celoLend.getAddress();

    console.log("✅ CeloLend deployed to:", celoLendAddress);

    // Configure permissions
    console.log("\n🔧 Configuring contract permissions...");

    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const collateralVault = CollateralVault.attach(
      existingAddresses.CollateralVault
    );
    await collateralVault.setAuthorizedContract(celoLendAddress, true);

    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = CreditScore.attach(existingAddresses.CreditScore);
    await creditScore.setAuthorizedContract(celoLendAddress, true);

    console.log("✅ Permissions configured");

    // Generate scope hash for this unique scope
    const scopeHash = ethers.keccak256(ethers.toUtf8Bytes(`test-${timestamp}`));

    // Save test deployment info
    const testInfo = {
      timestamp: new Date().toISOString(),
      testId: `test-${timestamp}`,
      celoLendAddress: celoLendAddress,
      scopeHash: scopeHash,
      scopeSeed: `test-${timestamp}`,
      configId:
        "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62",
      deployer: await deployer.getAddress(),
      network: "alfajores",
    };

    const fs = require("fs");
    fs.writeFileSync(
      `test-deployment-${timestamp}.json`,
      JSON.stringify(testInfo, null, 2)
    );

    console.log("\n🎉 TEST DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 TEST CONFIGURATION:");
    console.log("=".repeat(60));
    console.log(`🔗 CeloLend Address: ${celoLendAddress}`);
    console.log(`🎯 Scope Seed (for frontend): test-${timestamp}`);
    console.log(`🔑 Scope Hash: ${scopeHash}`);
    console.log(`📁 Config saved to: test-deployment-${timestamp}.json`);
    console.log("");
    console.log("📝 NEXT STEPS:");
    console.log("1. Update frontend addresses.ts with this CeloLend address");
    console.log(
      "2. Update frontend SelfVerificationFlow.tsx with scope seed: 'test-" +
        timestamp +
        "'"
    );
    console.log("3. Test verification with a fresh mock passport");
    console.log("4. For next test, run this script again for a fresh contract");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

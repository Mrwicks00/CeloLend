import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting CeloLend redeployment with new scope seed...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // New scope seed for frontend (20 characters or less)
  const NEW_SCOPE_SEED = "celolend-alfajores";
  console.log("🎯 New scope seed (for frontend):", NEW_SCOPE_SEED);

  // Scope hash for contract deployment (pre-computed from scope seed)
  const NEW_SCOPE_HASH =
    "19561646030708568037669157757961988791113161772575953176880693733521165562260";
  console.log("🔑 New scope hash (for contract):", NEW_SCOPE_HASH);

  // Get existing contract addresses (we'll reuse the other contracts)
  const existingAddresses = {
    MentoIntegration: "0xA1b20Efeb3Dce92344330beAE8e358621740eAF3",
    PriceOracle: "0x4cF9c155E2b3d54C56DfB82c548229AA700Abcb6",
    CollateralVault: "0xc727E73CCD6B6Dd1eB524d6e24d7CbC9FE15CdEc",
    CreditScore: "0xdeeB5eAE3082A7A8b3946d5e32E7998777dA20ea",
  };

  console.log("📋 Existing contract addresses:");
  Object.entries(existingAddresses).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });

  try {
    // Step 1: Deploy new CeloLend contract with new scope seed
    console.log("\n🔨 Step 1: Deploying new CeloLend contract...");

    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = await CeloLend.deploy(
      "0x68c931C9a534D37aa78094877F46fE46a49F1A51", // _identityVerificationHubV2
      NEW_SCOPE_HASH, // _scope (use scope hash, not scope seed)
      "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62", // _configId
      existingAddresses.CollateralVault, // _collateralVault
      existingAddresses.CreditScore, // _creditScore
      existingAddresses.PriceOracle, // _priceOracle
      existingAddresses.MentoIntegration // _mentoIntegration
    );

    await celoLend.deployed();
    console.log("✅ CeloLend deployed to:", celoLend.address);

    // Step 2: Configure the new CeloLend contract
    console.log("\n⚙️ Step 2: Configuring CeloLend contract...");

    // Set loan limits
    console.log("  Setting loan limits...");
    const minLoanAmount = ethers.utils.parseEther("10"); // 10 CELO
    const maxLoanAmount = ethers.utils.parseEther("10000"); // 10,000 CELO
    await celoLend.setLoanLimits(minLoanAmount, maxLoanAmount);
    console.log("  ✅ Loan limits set");

    // Set supported tokens (Mento stablecoins)
    console.log("  Setting supported tokens...");
    const supportedTokens = [
      "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // cUSD
      "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", // cEUR
      "0xE4D517785D091D3c54818832dB6094bcc2744545", // cREAL
      "0x2DEf4285787d58a2f811AF24755A8150622f4361", // cXOF
    ];

    for (const token of supportedTokens) {
      await celoLend.setSupportedToken(token, true);
      console.log(`  ✅ Token ${token} added as supported`);
    }

    // Step 3: Update other contracts to work with new CeloLend
    console.log("\n🔗 Step 3: Updating contract permissions...");

    // Update CollateralVault to authorize new CeloLend
    console.log("  Updating CollateralVault permissions...");
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const collateralVault = CollateralVault.attach(
      existingAddresses.CollateralVault
    );
    await collateralVault.setAuthorizedContract(celoLend.address, true);
    console.log("  ✅ CollateralVault authorized new CeloLend");

    // Update CreditScore to authorize new CeloLend
    console.log("  Updating CreditScore permissions...");
    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = CreditScore.attach(existingAddresses.CreditScore);
    await creditScore.setAuthorizedContract(celoLend.address, true);
    console.log("  ✅ CreditScore authorized new CeloLend");

    // Step 4: Verify deployment
    console.log("\n🔍 Step 4: Verifying deployment...");

    // Check contract state
    const actualMinLoan = await celoLend.minLoanAmount();
    const actualMaxLoan = await celoLend.maxLoanAmount();
    const actualScopeSeed = await celoLend.scopeSeed();
    const actualConfigId = await celoLend.configId();

    console.log("  Contract verification:");
    console.log(
      `    Min loan amount: ${ethers.utils.formatEther(actualMinLoan)} CELO`
    );
    console.log(
      `    Max loan amount: ${ethers.utils.formatEther(actualMaxLoan)} CELO`
    );
    console.log(`    Scope seed: ${actualScopeSeed}`);
    console.log(`    Config ID: ${actualConfigId}`);

    // Check supported tokens
    for (const token of supportedTokens) {
      const isSupported = await celoLend.supportedTokens(token);
      console.log(
        `    Token ${token}: ${
          isSupported ? "✅ Supported" : "❌ Not supported"
        }`
      );
    }

    // Step 5: Generate new scope hash (for frontend update)
    console.log("\n🎯 Step 5: Generating new scope hash...");

    // Pre-computed scope hash using Self Protocol tools
    const scopeHash =
      "0d9aa896fec2b388ed830219cf7d10ccbb002c1d730d65ef30b46e7061f60f0f";
    console.log(`  New scope hash: ${scopeHash}`);

    // Step 6: Output deployment summary
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("=".repeat(50));
    console.log(`🔗 New CeloLend Address: ${celoLend.address}`);
    console.log(`🎯 New Scope Seed: ${NEW_SCOPE_SEED}`);
    console.log(`🔑 New Scope Hash: ${scopeHash}`);
    console.log(
      `⚙️ Config ID: 0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62`
    );
    console.log("");
    console.log("📝 NEXT STEPS:");
    console.log("1. Update frontend addresses.ts with new CeloLend address");
    console.log("2. Update frontend addresses.ts with new scope hash");
    console.log("3. Test the new deployment");
    console.log("4. Update any documentation");

    // Step 7: Save deployment info to file
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: "alfajores",
      deployer: deployer.address,
      contracts: {
        CeloLend: celoLend.address,
        PriceOracle: existingAddresses.PriceOracle,
        CollateralVault: existingAddresses.CollateralVault,
        CreditScore: existingAddresses.CreditScore,
        MentoIntegration: existingAddresses.MentoIntegration,
      },
      selfProtocol: {
        scopeSeed: NEW_SCOPE_SEED,
        scopeHash: scopeHash,
        configId:
          "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62",
      },
      loanLimits: {
        minLoanAmount: ethers.utils.formatEther(minLoanAmount),
        maxLoanAmount: ethers.utils.formatEther(maxLoanAmount),
      },
      supportedTokens: supportedTokens,
    };

    const fs = require("fs");
    fs.writeFileSync(
      "deployment-celoLend-only.json",
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 Deployment info saved to: deployment-celoLend-only.json");
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

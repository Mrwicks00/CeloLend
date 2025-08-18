import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting CeloLend deployment with temporary scope...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

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
    // Step 1: Deploy new CeloLend contract with temporary scope (0)
    console.log(
      "\n🔨 Step 1: Deploying new CeloLend contract with temporary scope..."
    );

    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = await CeloLend.deploy(
      "0x68c931C9a534D37aa78094877F46fE46a49F1A51", // _identityVerificationHubV2
      0, // _scope (temporary, will be set properly after deployment)
      "0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc", // _configId
      existingAddresses.CollateralVault, // _collateralVault
      existingAddresses.CreditScore, // _creditScore
      existingAddresses.PriceOracle, // _priceOracle
      existingAddresses.MentoIntegration // _mentoIntegration
    );

    await celoLend.waitForDeployment();
    const celoLendAddress = await celoLend.getAddress();
    console.log("✅ CeloLend deployed to:", celoLendAddress);

    // Step 2: Configure the new CeloLend contract
    console.log("\n⚙️ Step 2: Configuring CeloLend contract...");

    // Set loan limits
    console.log("  Setting loan limits...");
    const minLoanAmount = ethers.parseEther("10"); // 10 CELO
    const maxLoanAmount = ethers.parseEther("10000"); // 10,000 CELO
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
    await collateralVault.setAuthorizedContract(celoLendAddress, true);
    console.log("  ✅ CollateralVault authorized new CeloLend");

    // Update CreditScore to authorize new CeloLend
    console.log("  Updating CreditScore permissions...");
    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = CreditScore.attach(existingAddresses.CreditScore);
    await creditScore.setAuthorizedContract(celoLendAddress, true);
    console.log("  ✅ CreditScore authorized new CeloLend");

    // Step 4: Verify deployment
    console.log("\n🔍 Step 4: Verifying deployment...");

    // Check contract state
    const actualMinLoan = await celoLend.minLoanAmount();
    const actualMaxLoan = await celoLend.maxLoanAmount();
    const actualConfigId = await celoLend.configId();

    console.log("  Contract verification:");
    console.log(
      `    Min loan amount: ${ethers.formatEther(actualMinLoan)} CELO`
    );
    console.log(
      `    Max loan amount: ${ethers.formatEther(actualMaxLoan)} CELO`
    );
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

    // Step 5: Output deployment summary
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("=".repeat(50));
    console.log(`🔗 New CeloLend Address: ${celoLendAddress}`);
    console.log(`🎯 Current Scope: 0 (temporary)`);
    console.log(
      `⚙️ Config ID: 0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62`
    );
    console.log("");
    console.log("📝 NEXT STEPS:");
    console.log("1. Go to https://tools.self.xyz/#scope-generator");
    console.log("2. Enter your website URL and desired scope seed");
    console.log("3. Copy the generated scope hash");
    console.log("4. Run the set-scope script with the new scope hash");
    console.log("5. Update frontend addresses.ts with new CeloLend address");
    console.log(
      "6. Update frontend SelfVerificationFlow.tsx with your scope seed"
    );

    // Step 6: Save deployment info to file
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: "alfajores",
      deployer: deployer.address,
      contracts: {
        CeloLend: celoLendAddress,
        PriceOracle: existingAddresses.PriceOracle,
        CollateralVault: existingAddresses.CollateralVault,
        CreditScore: existingAddresses.CreditScore,
        MentoIntegration: existingAddresses.MentoIntegration,
      },
      selfProtocol: {
        scopeSeed: "TO_BE_SET", // Will be set after using Self tools
        scopeHash: "TO_BE_SET", // Will be set after using Self tools
        configId:
          "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62",
      },
      loanLimits: {
        minLoanAmount: ethers.formatEther(minLoanAmount),
        maxLoanAmount: ethers.formatEther(maxLoanAmount),
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

import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting Core CeloLend System Deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // Step 1: Deploy MentoIntegration first (needed by PriceOracle)
  console.log("\n💱 Deploying MentoIntegration...");
  const MentoIntegration = await ethers.getContractFactory("MentoIntegration");
  const mentoIntegration = await MentoIntegration.deploy(true); // true = testnet
  await mentoIntegration.waitForDeployment();
  const mentoIntegrationAddress = await mentoIntegration.getAddress();
  console.log("✅ MentoIntegration deployed to:", mentoIntegrationAddress);

  // Step 2: Deploy PriceOracle (needs MentoIntegration)
  console.log("\n📊 Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(mentoIntegrationAddress);
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ PriceOracle deployed to:", priceOracleAddress);

  // Step 3: Deploy CreditScore
  console.log("\n🏆 Deploying CreditScore...");
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(); // No args needed
  await creditScore.waitForDeployment();
  const creditScoreAddress = await creditScore.getAddress();
  console.log("✅ CreditScore deployed to:", creditScoreAddress);

  // Step 4: Deploy CollateralVault
  console.log("\n🏦 Deploying CollateralVault...");
  const CollateralVault = await ethers.getContractFactory("CollateralVault");
  const collateralVault = await CollateralVault.deploy(); // No args needed
  await collateralVault.waitForDeployment();
  const collateralVaultAddress = await collateralVault.getAddress();
  console.log("✅ CollateralVault deployed to:", collateralVaultAddress);

  // Step 5: Deploy Treasury
  console.log("\n💰 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  // Use deployer as all treasury targets for now (can be updated later)
  const treasury = await Treasury.deploy(
    deployer.address, // developmentFund
    deployer.address, // insurancePool (placeholder)
    deployer.address, // emergencyReserve
    deployer.address // stakeholderRewards
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // Step 6: Deploy CeloLend (main contract)
  console.log("\n🌟 Deploying CeloLend main contract...");
  const CeloLend = await ethers.getContractFactory("CeloLend");

  // CeloLend constructor needs: _identityVerificationHubV2, _scope, _configId, _collateralVault, _creditScore, _priceOracle, _mentoIntegration
  const IDENTITY_VERIFICATION_HUB_V2 =
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51"; // Alfajores
  const TEMPORARY_SCOPE = 0; // Will be set later with script
  const CONFIG_ID =
    "0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc"; // Placeholder

  const celoLend = await CeloLend.deploy(
    IDENTITY_VERIFICATION_HUB_V2,
    TEMPORARY_SCOPE,
    CONFIG_ID,
    collateralVaultAddress,
    creditScoreAddress,
    priceOracleAddress,
    mentoIntegrationAddress
  );
  await celoLend.waitForDeployment();
  const celoLendAddress = await celoLend.getAddress();
  console.log("✅ CeloLend deployed to:", celoLendAddress);

  // Step 7: Deploy LoanRepayment
  console.log("\n💳 Deploying LoanRepayment...");
  const LoanRepayment = await ethers.getContractFactory("LoanRepayment");
  const loanRepayment = await LoanRepayment.deploy(
    celoLendAddress,
    collateralVaultAddress,
    priceOracleAddress
  );
  await loanRepayment.waitForDeployment();
  const loanRepaymentAddress = await loanRepayment.getAddress();
  console.log("✅ LoanRepayment deployed to:", loanRepaymentAddress);

  console.log("\n🔗 Setting up contract connections...");

  // Step 8: Connect contracts
  console.log("Setting CeloLend in CollateralVault...");
  await collateralVault.setCeloLend(celoLendAddress);

  console.log("Setting PriceOracle in CollateralVault...");
  await collateralVault.setPriceOracle(priceOracleAddress);

  console.log("Authorizing CeloLend in CollateralVault...");
  await collateralVault.setAuthorizedContract(celoLendAddress, true);

  console.log("Authorizing LoanRepayment in CollateralVault...");
  await collateralVault.setAuthorizedContract(loanRepaymentAddress, true);

  console.log("Setting LoanRepayment contract in CeloLend...");
  await celoLend.setLoanRepaymentContract(loanRepaymentAddress);

  console.log("Setting PriceOracle in CeloLend...");
  await celoLend.setPriceOracle(priceOracleAddress);

  console.log("Setting MentoIntegration in CeloLend...");
  await celoLend.setMentoIntegration(mentoIntegrationAddress);

  console.log("Setting MentoIntegration in PriceOracle...");
  await priceOracle.setMentoIntegration(mentoIntegrationAddress);

  console.log("Setting network mode for MentoIntegration (testnet)...");
  await mentoIntegration.setNetwork(true); // true = testnet

  console.log("Authorizing CeloLend in CreditScore...");
  await creditScore.setAuthorizedContract(celoLendAddress, true);

  console.log("Authorizing LoanRepayment in CreditScore...");
  await creditScore.setAuthorizedContract(loanRepaymentAddress, true);

  console.log("Authorizing contracts in Treasury...");
  await treasury.setAuthorizedDepositor(celoLendAddress, true);
  await treasury.setAuthorizedDepositor(loanRepaymentAddress, true);

  // Step 9: Initialize supported tokens
  console.log("\n🪙 Setting up supported tokens...");

  // Native CELO (address(0))
  console.log("Adding CELO token support...");
  await celoLend.setSupportedToken(ethers.ZeroAddress, true);
  await collateralVault.setSupportedCollateralToken(ethers.ZeroAddress, true);
  await priceOracle.setTokenSupport(ethers.ZeroAddress, true);

  // Add some mock token addresses for Mento stablecoins (Alfajores testnet)
  const mentoTokens = [
    "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // cUSD
    "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", // cEUR
    "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", // cREAL
  ];

  for (const tokenAddress of mentoTokens) {
    console.log(`Adding token support: ${tokenAddress}`);
    try {
      await celoLend.setSupportedToken(tokenAddress, true);
      await collateralVault.setSupportedCollateralToken(tokenAddress, true);
      await priceOracle.setTokenSupport(tokenAddress, true);
    } catch (error) {
      console.log(
        `Note: Could not add token ${tokenAddress} - may not exist on this network`
      );
    }
  }

  // Step 10: Set some reasonable default limits
  console.log("\n⚙️ Setting default loan parameters...");

  // These should already be set in the contract, but let's confirm
  console.log("Current min loan amount:", await celoLend.minLoanAmount());
  console.log("Current max loan amount:", await celoLend.maxLoanAmount());
  console.log(
    "Current min collateral ratio:",
    await celoLend.minCollateralRatio()
  );

  console.log("\n🎉 Core CeloLend System Deployment Complete!");
  console.log("\n📋 DEPLOYMENT SUMMARY:");
  console.log("=" * 50);
  console.log(`PriceOracle:      ${priceOracleAddress}`);
  console.log(`CreditScore:      ${creditScoreAddress}`);
  console.log(`MentoIntegration: ${mentoIntegrationAddress}`);
  console.log(`CollateralVault:  ${collateralVaultAddress}`);
  console.log(`Treasury:         ${treasuryAddress}`);
  console.log(`CeloLend:         ${celoLendAddress}`);
  console.log(`LoanRepayment:    ${loanRepaymentAddress}`);
  console.log("=" * 50);

  // Generate addresses.ts content for frontend
  console.log("\n📱 Frontend Integration:");
  console.log("Update your frontend addresses.ts with these values:");
  console.log(`
export const CONTRACT_ADDRESSES = {
  alfajores: {
    CeloLend: "${celoLendAddress}",
    PriceOracle: "${priceOracleAddress}",
    MentoIntegration: "${mentoIntegrationAddress}",
    CollateralVault: "${collateralVaultAddress}",
    CreditScore: "${creditScoreAddress}",
    Treasury: "${treasuryAddress}",
    LoanRepayment: "${loanRepaymentAddress}",
  },
} as const;
  `);

  // Step 11: Verify contracts on block explorer
  console.log("\n🔍 Verifying contracts on block explorer...");
  try {
    console.log("Verifying MentoIntegration...");
    await hre.run("verify:verify", {
      address: mentoIntegrationAddress,
      constructorArguments: [true], // isTestnet
    });
    console.log("✅ MentoIntegration verified");

    console.log("Verifying PriceOracle...");
    await hre.run("verify:verify", {
      address: priceOracleAddress,
      constructorArguments: [mentoIntegrationAddress],
    });
    console.log("✅ PriceOracle verified");

    console.log("Verifying CreditScore...");
    await hre.run("verify:verify", {
      address: creditScoreAddress,
      constructorArguments: [],
    });
    console.log("✅ CreditScore verified");

    console.log("Verifying CollateralVault...");
    await hre.run("verify:verify", {
      address: collateralVaultAddress,
      constructorArguments: [],
    });
    console.log("✅ CollateralVault verified");

    console.log("Verifying Treasury...");
    await hre.run("verify:verify", {
      address: treasuryAddress,
      constructorArguments: [
        deployer.address, // developmentFund
        deployer.address, // insurancePool
        deployer.address, // emergencyReserve
        deployer.address, // stakeholderRewards
      ],
    });
    console.log("✅ Treasury verified");

    console.log("Verifying CeloLend...");
    await hre.run("verify:verify", {
      address: celoLendAddress,
      constructorArguments: [
        IDENTITY_VERIFICATION_HUB_V2,
        TEMPORARY_SCOPE,
        CONFIG_ID,
        collateralVaultAddress,
        creditScoreAddress,
        priceOracleAddress,
        mentoIntegrationAddress,
      ],
    });
    console.log("✅ CeloLend verified");

    console.log("Verifying LoanRepayment...");
    await hre.run("verify:verify", {
      address: loanRepaymentAddress,
      constructorArguments: [
        celoLendAddress,
        collateralVaultAddress,
        priceOracleAddress,
      ],
    });
    console.log("✅ LoanRepayment verified");
  } catch (error) {
    console.log(
      "⚠️  Contract verification failed (this is normal for local/private networks)"
    );
    console.log("   Verification error:", error.message);
  }

  console.log("\n✅ Ready to test loan creation and repayment functionality!");
  console.log("🚀 Next steps:");
  console.log(
    "1. Run the set-scope script with your Self Protocol configuration"
  );
  console.log("2. Update frontend contract addresses");
  console.log("3. Test loan creation flow");
  console.log("4. Test loan repayment flow");
  console.log("5. Deploy advanced features when ready");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

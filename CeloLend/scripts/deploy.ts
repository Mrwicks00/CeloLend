import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting CeloLend deployment on Alfajores...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "CELO"
  );

  // Self Protocol configuration for Alfajores
  const SELF_HUB_ADDRESS =
    process.env.SELF_HUB_ADDRESS ||
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51";
  const SELF_SCOPE_HASH =
    process.env.SELF_SCOPE_HASH ||
    "10251133304428771345145886079637391408515248351029802124412184972058187105188";
  const SELF_CONFIG_ID =
    process.env.SELF_CONFIG_ID ||
    "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62";

  console.log("\n📋 Self Protocol Configuration:");
  console.log("Hub Address:", SELF_HUB_ADDRESS);
  console.log("Scope Hash:", SELF_SCOPE_HASH);
  console.log("Config ID:", SELF_CONFIG_ID);

  // 1. Deploy MentoIntegration first (no dependencies)
  console.log("\n🏦 Deploying MentoIntegration...");
  const MentoIntegration = await ethers.getContractFactory("MentoIntegration");
  const mentoIntegration = await MentoIntegration.deploy(true); // true = testnet
  await mentoIntegration.waitForDeployment();
  console.log(
    "✅ MentoIntegration deployed to:",
    await mentoIntegration.getAddress()
  );

  // 2. Deploy PriceOracle (depends on MentoIntegration)
  console.log("\n📊 Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(
    await mentoIntegration.getAddress()
  );
  await priceOracle.waitForDeployment();
  console.log("✅ PriceOracle deployed to:", await priceOracle.getAddress());

  // 3. Deploy CollateralVault
  console.log("\n🔒 Deploying CollateralVault...");
  const CollateralVault = await ethers.getContractFactory("CollateralVault");
  const collateralVault = await CollateralVault.deploy();
  await collateralVault.waitForDeployment();
  console.log(
    "✅ CollateralVault deployed to:",
    await collateralVault.getAddress()
  );

  // 4. Deploy CreditScore
  console.log("\n📈 Deploying CreditScore...");
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy();
  await creditScore.waitForDeployment();
  console.log("✅ CreditScore deployed to:", await creditScore.getAddress());

  // 5. Deploy main CeloLend contract
  console.log("\n💰 Deploying CeloLend main contract...");
  const CeloLend = await ethers.getContractFactory("CeloLend");
  const celoLend = await CeloLend.deploy(
    SELF_HUB_ADDRESS, // _identityVerificationHubV2
    SELF_SCOPE_HASH, // _scope
    SELF_CONFIG_ID, // _configId
    await collateralVault.getAddress(), // _collateralVault
    await creditScore.getAddress(), // _creditScore
    await priceOracle.getAddress(), // _priceOracle
    await mentoIntegration.getAddress() // _mentoIntegration
  );
  await celoLend.waitForDeployment();
  console.log("✅ CeloLend deployed to:", await celoLend.getAddress());

  // 6. Configure platform permissions
  console.log("\n⚙️  Configuring platform permissions...");

  // Set CeloLend as authorized contract in CreditScore
  console.log("Setting CeloLend as authorized contract in CreditScore...");
  const setCreditAuthTx = await creditScore.setAuthorizedContract(
    await celoLend.getAddress(),
    true
  );
  await setCreditAuthTx.wait();
  console.log("✅ CreditScore authorization configured");

  // Set PriceOracle in CollateralVault
  console.log("Setting PriceOracle in CollateralVault...");
  const setPriceOracleTx = await collateralVault.setPriceOracle(
    await priceOracle.getAddress()
  );
  await setPriceOracleTx.wait();
  console.log("✅ CollateralVault PriceOracle configured");

  // Set CeloLend as authorized contract in CollateralVault
  console.log("Setting CeloLend as authorized contract in CollateralVault...");
  const setVaultAuthTx = await collateralVault.setAuthorizedContract(
    await celoLend.getAddress(),
    true
  );
  await setVaultAuthTx.wait();
  console.log("✅ CollateralVault authorization configured");

  // 7. Initialize Mento tokens (should happen automatically in constructor)
  console.log("\n🏛️  Checking Mento token initialization...");
  const supportedTokens = await celoLend.getSupportedTokens();
  console.log("Supported tokens count:", supportedTokens.length);

  // 8. Display deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("PriceOracle:      ", await priceOracle.getAddress());
  console.log("MentoIntegration: ", await mentoIntegration.getAddress());
  console.log("CollateralVault:  ", await collateralVault.getAddress());
  console.log("CreditScore:      ", await creditScore.getAddress());
  console.log("CeloLend:         ", await celoLend.getAddress());
  console.log("=".repeat(50));

  // 9. Save deployment addresses to file
  const deploymentData = {
    network: "alfajores",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PriceOracle: await priceOracle.getAddress(),
      MentoIntegration: await mentoIntegration.getAddress(),
      CollateralVault: await collateralVault.getAddress(),
      CreditScore: await creditScore.getAddress(),
      CeloLend: await celoLend.getAddress(),
    },
    selfProtocol: {
      hubAddress: SELF_HUB_ADDRESS,
      scopeHash: SELF_SCOPE_HASH,
      configId: SELF_CONFIG_ID,
    },
  };

  console.log("\n💾 Deployment data:");
  console.log(JSON.stringify(deploymentData, null, 2));

  console.log("\n🔗 Next Steps:");
  console.log(
    "1. Create your Self Protocol configuration at: https://tools.self.xyz"
  );
  console.log("2. Update SELF_CONFIG_ID in your .env file");
  console.log("3. Verify contracts on Alfajores explorer if needed");
  console.log("4. Test with mock passport verification");

  console.log("\n✨ CeloLend deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

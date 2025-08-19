import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Verification helper function
async function verifyContract(
  contractAddress: string,
  constructorArguments: any[],
  contractName: string
) {
  const { network } = require("hardhat");
  if (network.name === "alfajores" && process.env.CELOSCAN_API_KEY) {
    console.log(`🔍 Verifying ${contractName} on Celoscan...`);
    try {
      const { run } = require("hardhat");
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: constructorArguments,
        network: "alfajores",
      });
      console.log(`✅ ${contractName} verified successfully!`);
    } catch (error: any) {
      console.log(`⚠️ ${contractName} verification failed:`, error.message);
      if (error.message.includes("already verified")) {
        console.log(`ℹ️ ${contractName} was already verified.`);
      }
    }
  } else if (!process.env.CELOSCAN_API_KEY) {
    console.log(
      `⏭️ Skipping ${contractName} verification: CELOSCAN_API_KEY not found in environment`
    );
  } else {
    console.log(
      `⏭️ Skipping ${contractName} verification: Not on alfajores network`
    );
  }
}

async function main() {
  console.log(
    "🚀 Starting CeloLend platform contracts deployment on Alfajores..."
  );

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "CELO"
  );

  const { network } = require("hardhat");
  console.log("\n📋 Deployment Configuration:");
  console.log("Network:", network.name);
  console.log(
    "Celoscan API Key:",
    process.env.CELOSCAN_API_KEY ? "✅ Available" : "❌ Not found"
  );

  try {
    // 1. Deploy MentoIntegration first (no dependencies)
    console.log("\n🏦 Deploying MentoIntegration...");
    const MentoIntegration = await ethers.getContractFactory(
      "MentoIntegration"
    );
    const mentoIntegration = await MentoIntegration.deploy(true); // true = testnet
    await mentoIntegration.waitForDeployment();
    const mentoIntegrationAddress = await mentoIntegration.getAddress();
    console.log("✅ MentoIntegration deployed to:", mentoIntegrationAddress);

    // Verify MentoIntegration
    await verifyContract(mentoIntegrationAddress, [true], "MentoIntegration");

    // 2. Deploy PriceOracle (depends on MentoIntegration)
    console.log("\n📊 Deploying PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(mentoIntegrationAddress);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("✅ PriceOracle deployed to:", priceOracleAddress);

    // Verify PriceOracle
    await verifyContract(
      priceOracleAddress,
      [mentoIntegrationAddress],
      "PriceOracle"
    );

    // 3. Deploy CollateralVault
    console.log("\n🔒 Deploying CollateralVault...");
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const collateralVault = await CollateralVault.deploy();
    await collateralVault.waitForDeployment();
    const collateralVaultAddress = await collateralVault.getAddress();
    console.log("✅ CollateralVault deployed to:", collateralVaultAddress);

    // Verify CollateralVault
    await verifyContract(collateralVaultAddress, [], "CollateralVault");

    // 4. Deploy CreditScore
    console.log("\n📈 Deploying CreditScore...");
    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = await CreditScore.deploy();
    await creditScore.waitForDeployment();
    const creditScoreAddress = await creditScore.getAddress();
    console.log("✅ CreditScore deployed to:", creditScoreAddress);

    // Verify CreditScore
    await verifyContract(creditScoreAddress, [], "CreditScore");

    // 5. Configure platform permissions
    console.log("\n⚙️ Configuring platform permissions...");

    // Set PriceOracle in CollateralVault
    console.log("Setting PriceOracle in CollateralVault...");
    const setPriceOracleTx = await collateralVault.setPriceOracle(
      priceOracleAddress
    );
    await setPriceOracleTx.wait();
    console.log("✅ CollateralVault PriceOracle configured");

    // 6. Display deployment summary
    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(60));
    console.log("MentoIntegration: ", mentoIntegrationAddress);
    console.log("PriceOracle:      ", priceOracleAddress);
    console.log("CollateralVault:  ", collateralVaultAddress);
    console.log("CreditScore:      ", creditScoreAddress);
    console.log("=".repeat(60));

    // 7. Save deployment addresses to file
    const deploymentData = {
      network: "alfajores",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        MentoIntegration: mentoIntegrationAddress,
        PriceOracle: priceOracleAddress,
        CollateralVault: collateralVaultAddress,
        CreditScore: creditScoreAddress,
      },
      verification: {
        celoscanApiKey: process.env.CELOSCAN_API_KEY
          ? "Available"
          : "Not found",
        network: network.name,
      },
    };

    console.log("\n💾 Deployment data:");
    console.log(JSON.stringify(deploymentData, null, 2));

    console.log("\n📋 Next Steps:");
    console.log("1. Update the contract addresses in deploy-celoLend-only.ts");
    console.log("2. Deploy CeloLend using: npm run deploy:celolend-only");
    console.log(
      "3. Set up Self Protocol configuration at: https://tools.self.xyz"
    );
    console.log("4. Update frontend configuration with new addresses");

    console.log("\n✨ Platform contracts deployment completed successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

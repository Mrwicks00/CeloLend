import { ethers } from "hardhat";

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
    "🚀 Deploying CeloLend contract with improved Self Protocol integration..."
  );

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address))
  );

  // Contract addresses (update these with your deployed addresses)
  const COLLATERAL_VAULT_ADDRESS = "0xbE4aB35983BCDE3f58f16b239dB44eF051736007"; // Replace with actual address
  const CREDIT_SCORE_ADDRESS = "0x48d87430e6a18eA9E2Fa7282091Dc5b975cDE11f"; // Replace with actual address
  const PRICE_ORACLE_ADDRESS = "0x8d2c60f1A979975CfaD46b1B9624F481bD757c65"; // Replace with actual address
  const MENTO_INTEGRATION_ADDRESS = "0x701552e8EAF283aa08423F70B287Fe483Db353d4"; // Replace with actual address

  // Self Protocol configuration
  const IDENTITY_VERIFICATION_HUB_V2 =
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51"; // Alfajores testnet
  const TEMPORARY_SCOPE = 0; // We'll set the actual scope after deployment
  const CONFIG_ID = "0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc"; // Replace with your config ID from tools.self.xyz

  console.log("🔧 Self Protocol Configuration:");
  console.log("   Hub Address:", IDENTITY_VERIFICATION_HUB_V2);
  console.log("   Temporary Scope:", TEMPORARY_SCOPE);
  console.log("   Config ID:", CONFIG_ID);

  // Check for required contract addresses
  // if (
  //   COLLATERAL_VAULT_ADDRESS === "0x..." ||
  //   CREDIT_SCORE_ADDRESS === "0x..." ||
  //   PRICE_ORACLE_ADDRESS === "0x..." ||
  //   MENTO_INTEGRATION_ADDRESS === "0x..."
  // ) {
  //   console.error(
  //     "❌ Please update the contract addresses in this script before running"
  //   );
  //   console.error(
  //     "   Run the main deploy.ts script first to get the platform contract addresses"
  //   );
  //   process.exit(1);
  // }

  try {
    // Deploy CeloLend contract
    console.log("\n📦 Deploying CeloLend contract...");
    const CeloLend = await ethers.getContractFactory("CeloLend");
    const celoLend = await CeloLend.deploy(
      IDENTITY_VERIFICATION_HUB_V2,
      TEMPORARY_SCOPE,
      CONFIG_ID,
      COLLATERAL_VAULT_ADDRESS,
      CREDIT_SCORE_ADDRESS,
      PRICE_ORACLE_ADDRESS,
      MENTO_INTEGRATION_ADDRESS
    );

    await celoLend.waitForDeployment();
    const celoLendAddress = await celoLend.getAddress();
    console.log("✅ CeloLend deployed to:", celoLendAddress);

    // Verify CeloLend contract
    const constructorArgs = [
      IDENTITY_VERIFICATION_HUB_V2,
      TEMPORARY_SCOPE,
      CONFIG_ID,
      COLLATERAL_VAULT_ADDRESS,
      CREDIT_SCORE_ADDRESS,
      PRICE_ORACLE_ADDRESS,
      MENTO_INTEGRATION_ADDRESS,
    ];
    await verifyContract(celoLendAddress, constructorArgs, "CeloLend");

    // Configure platform permissions after CeloLend deployment
    console.log("\n⚙️ Configuring platform permissions...");

    // Set CeloLend as authorized contract in CreditScore
    console.log("Setting CeloLend as authorized contract in CreditScore...");
    const CreditScore = await ethers.getContractFactory("CreditScore");
    const creditScore = CreditScore.attach(CREDIT_SCORE_ADDRESS) as any;
    const setCreditAuthTx = await creditScore.setAuthorizedContract(
      celoLendAddress,
      true
    );
    await setCreditAuthTx.wait();
    console.log("✅ CreditScore authorization configured");

    // Set CeloLend as authorized contract in CollateralVault
    console.log(
      "Setting CeloLend as authorized contract in CollateralVault..."
    );
    const CollateralVault = await ethers.getContractFactory("CollateralVault");
    const collateralVault = CollateralVault.attach(
      COLLATERAL_VAULT_ADDRESS
    ) as any;
    const setVaultAuthTx = await collateralVault.setAuthorizedContract(
      celoLendAddress,
      true
    );
    await setVaultAuthTx.wait();
    console.log("✅ CollateralVault authorization configured");

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const deployedCode = await deployer.provider.getCode(celoLendAddress);
    if (deployedCode === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }
    console.log("✅ Contract code verified at address");

    // Get contract info
    console.log("\n📊 Contract Information:");
    console.log("   Owner:", await celoLend.owner());
    console.log("   Config ID:", await celoLend.configId());
    console.log("   Scope:", await celoLend.scope());
    console.log(
      "   Min Loan Amount:",
      ethers.formatEther(await celoLend.minLoanAmount())
    );
    console.log(
      "   Max Loan Amount:",
      ethers.formatEther(await celoLend.maxLoanAmount())
    );
    console.log("   Platform Fee Rate:", await celoLend.platformFeeRate());

    // Test verification configuration functions
    console.log("\n🧪 Testing verification configuration functions...");

    // Test setConfigId
    // console.log("   Testing setConfigId...");
    // const newConfigId =
    //   "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    // await celoLend.setConfigId(newConfigId);
    // console.log("   ✅ Config ID updated to:", await celoLend.configId());

    // Test setScope (we'll set the actual scope later)
    console.log("   Testing setScope...");
    const testScope = 12345;
    await celoLend.setScope(testScope);
    console.log("   ✅ Scope updated to:", await celoLend.scope());

    // Note: resetVerificationState function is available for testing purposes
    console.log(
      "   ✅ Verification configuration functions tested successfully"
    );

    console.log("\n🎉 CeloLend deployment completed successfully!");
    console.log("\n📋 Next Steps:");
    console.log(
      "1. Update the contract addresses in this script with your actual deployed addresses"
    );
    console.log(
      "2. Use tools.self.xyz to generate your actual scope hash with the deployed contract address"
    );
    console.log("3. Run the set-scope.ts script to set the actual scope");
    console.log("4. Test the Self Protocol integration with the frontend");

    // Save deployment info
    const deploymentInfo = {
      network: "alfajores",
      deployer: deployer.address,
      celoLendAddress: celoLendAddress,
      identityVerificationHub: IDENTITY_VERIFICATION_HUB_V2,
      temporaryScope: TEMPORARY_SCOPE,
      configId: CONFIG_ID,
      deploymentTime: new Date().toISOString(),
      constructorParams: {
        identityVerificationHubV2: IDENTITY_VERIFICATION_HUB_V2,
        scope: TEMPORARY_SCOPE,
        configId: CONFIG_ID,
        collateralVault: COLLATERAL_VAULT_ADDRESS,
        creditScore: CREDIT_SCORE_ADDRESS,
        priceOracle: PRICE_ORACLE_ADDRESS,
        mentoIntegration: MENTO_INTEGRATION_ADDRESS,
      },
      authorization: {
        creditScoreAuthorized: true,
        collateralVaultAuthorized: true,
        authorizationTransactions: {
          creditScore: setCreditAuthTx.hash,
          collateralVault: setVaultAuthTx.hash,
        },
      },
      verification: {
        celoscanApiKey: process.env.CELOSCAN_API_KEY
          ? "Available"
          : "Not found",
        constructorArguments: constructorArgs,
      },
    };

    console.log("\n💾 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
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

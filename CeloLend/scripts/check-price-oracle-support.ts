import { ethers } from "hardhat";

async function main() {
  const priceOracleAddress = "0x8d2c60f1A979975CfaD46b1B9624F481bD757c65";

  // Get the contract instance
  const priceOracle = await ethers.getContractAt(
    "PriceOracle",
    priceOracleAddress
  );

  console.log("=== Checking Price Oracle Native Token Support ===");

  // Check if native token is supported in price oracle
  const nativeTokenSupported = await priceOracle.supportedTokens(
    ethers.ZeroAddress
  );
  console.log(
    "Native token (CELO) supported in PriceOracle:",
    nativeTokenSupported
  );

  if (nativeTokenSupported) {
    // Try to get the price
    try {
      const price = await priceOracle.getLatestPrice(ethers.ZeroAddress);
      console.log("Native token price:", ethers.formatUnits(price, 8), "USD");
    } catch (error: any) {
      console.log("Error getting native token price:", error.message);
    }
  } else {
    console.log("❌ Native token is not supported in PriceOracle!");

    // Check if we can add support
    const [signer] = await ethers.getSigners();
    const owner = await priceOracle.owner();

    if (signer.address.toLowerCase() === owner.toLowerCase()) {
      console.log("Adding native token support to PriceOracle...");
      try {
        const tx = await priceOracle
          .connect(signer)
          .setTokenSupport(ethers.ZeroAddress, true);
        console.log("Transaction hash:", tx.hash);
        await tx.wait();
        console.log("✅ Native token support added to PriceOracle!");
      } catch (error: any) {
        console.log("❌ Failed to add support:", error.message);
      }
    }
  }

  // Get all supported tokens
  console.log("\nGetting all supported tokens in PriceOracle...");
  const [tokens, supported, decimals] =
    await priceOracle.getAllSupportedTokens();

  console.log("Supported tokens in PriceOracle:");
  for (let i = 0; i < tokens.length; i++) {
    console.log(`${tokens[i]} (${decimals[i]} decimals): ${supported[i]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

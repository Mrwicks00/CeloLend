import { ethers } from "hardhat";

async function main() {
  const celoLendAddress = "0x9a66C3b09eD66c7b7cf1ad3C04F87CCd022bbCf3";
  const celoLend = await ethers.getContractAt("CeloLend", celoLendAddress);

  console.log("=== CeloLend Supported Tokens Debug ===");

  try {
    // Get supported tokens list
    console.log("\n1. Getting supported tokens list...");
    const supportedTokensList = await celoLend.getSupportedTokens();
    console.log("Supported tokens list:", supportedTokensList);

    // Check if native token (address(0)) is supported
    console.log("\n2. Checking native token (CELO) support...");
    const nativeTokenSupported = await celoLend.supportedTokens(
      ethers.ZeroAddress
    );
    console.log("Native token (address(0)) supported:", nativeTokenSupported);

    // Check each token individually
    console.log("\n3. Checking individual token support:");
    for (const token of supportedTokensList) {
      const isSupported = await celoLend.supportedTokens(token);
      console.log(`Token ${token}: ${isSupported}`);
    }

    // Try to get Mento tokens
    console.log("\n4. Getting Mento integration info...");
    const mentoIntegrationAddress = await celoLend.mentoIntegration();
    console.log("MentoIntegration address:", mentoIntegrationAddress);

    if (mentoIntegrationAddress !== ethers.ZeroAddress) {
      const mentoIntegration = await ethers.getContractAt(
        "MentoIntegration",
        mentoIntegrationAddress
      );
      const [mentoTokens, symbols, decimals] =
        await mentoIntegration.getSupportedStablecoins();

      console.log("\nMento tokens:");
      for (let i = 0; i < mentoTokens.length; i++) {
        console.log(
          `${symbols[i]}: ${mentoTokens[i]} (${decimals[i]} decimals)`
        );
        const isSupported = await celoLend.supportedTokens(mentoTokens[i]);
        console.log(`  Supported in CeloLend: ${isSupported}`);
      }
    }

    // Check what happens when we try to use native token for loan
    console.log("\n5. Testing native token usage...");
    const testAmount = ethers.parseEther("100");
    const testDuration = 30 * 24 * 3600; // 30 days
    const testCollateralAmount = ethers.parseEther("150");
    const testInterestRate = 1000; // 10%

    console.log("Test parameters:");
    console.log("- Loan amount:", ethers.formatEther(testAmount), "CELO");
    console.log("- Duration:", testDuration / (24 * 3600), "days");
    console.log(
      "- Collateral amount:",
      ethers.formatEther(testCollateralAmount),
      "CELO"
    );
    console.log("- Interest rate:", testInterestRate / 100, "%");
    console.log("- Loan token address:", ethers.ZeroAddress);
    console.log("- Collateral token address:", ethers.ZeroAddress);

    // Try to estimate gas for creating loan request
    try {
      const [signer] = await ethers.getSigners();
      const gasEstimate = await celoLend
        .connect(signer)
        .createLoanRequest.estimateGas(
          testAmount,
          ethers.ZeroAddress, // loan token (CELO)
          testInterestRate,
          testDuration,
          testCollateralAmount,
          ethers.ZeroAddress, // collateral token (CELO)
          { value: testCollateralAmount } // Send CELO as collateral
        );
      console.log("Gas estimate succeeded:", gasEstimate.toString());
    } catch (error: any) {
      console.log("Gas estimate failed:", error.message);
      if (error.message.includes("Token not supported")) {
        console.log("ERROR: Native token (CELO) is not supported!");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

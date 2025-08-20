import { ethers } from "hardhat";

async function main() {
  const celoLendAddress = "0x9a66C3b09eD66c7b7cf1ad3C04F87CCd022bbCf3";

  // Get the contract instance
  const celoLend = await ethers.getContractAt("CeloLend", celoLendAddress);

  console.log("=== Adding Native Token (CELO) Support ===");

  // Get the signer (should be the owner)
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Check current owner
  const owner = await celoLend.owner();
  console.log("Contract owner:", owner);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("ERROR: Signer is not the contract owner!");
    console.error("You need to use the owner address to add token support");
    return;
  }

  // Check current native token support status
  const nativeTokenSupported = await celoLend.supportedTokens(
    ethers.ZeroAddress
  );
  console.log("Native token (CELO) currently supported:", nativeTokenSupported);

  if (nativeTokenSupported) {
    console.log("Native token is already supported!");
    return;
  }

  console.log("Adding native token (CELO) support...");

  try {
    // Add native token support
    const tx = await celoLend
      .connect(signer)
      .setSupportedToken(ethers.ZeroAddress, true);
    console.log("Transaction hash:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);

    // Verify the change
    const updatedSupport = await celoLend.supportedTokens(ethers.ZeroAddress);
    console.log("Native token (CELO) now supported:", updatedSupport);

    // Get updated supported tokens list
    const supportedTokens = await celoLend.getSupportedTokens();
    console.log("Updated supported tokens:", supportedTokens);

    console.log("✅ Native token (CELO) support added successfully!");
  } catch (error: any) {
    console.error("❌ Failed to add native token support:");
    console.error(error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

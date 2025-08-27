import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing cREAL Support...\n");

  try {
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Signer address:", signer.address);

    // Get the CeloLend contract
    const celoLendAddress = "0xC93F278471594324242F911Fb4343D9bC2e57Dbc";
    const celoLend = await ethers.getContractAt("CeloLend", celoLendAddress);

    // Check if signer is owner
    const owner = await celoLend.owner();
    if (signer.address !== owner) {
      throw new Error("❌ Only contract owner can add supported tokens!");
    }

    // Add cREAL as supported token in CeloLend
    const cREALAddress = "0xe4d517785d091d3c54818832db6094bcc2744545";
    console.log("➕ Adding cREAL support in CeloLend:", cREALAddress);

    const tx1 = await celoLend.setSupportedToken(cREALAddress, true);
    await tx1.wait();

    console.log("✅ cREAL successfully added as supported token in CeloLend!");

    // Verify it was added to CeloLend
    const isSupported = await celoLend.supportedTokens(cREALAddress);
    console.log("🔍 cREAL supported in CeloLend:", isSupported);

    // Also add cREAL as supported collateral token in CollateralVault
    const collateralVaultAddress = await celoLend.collateralVault();
    const collateralVault = await ethers.getContractAt(
      "CollateralVault",
      collateralVaultAddress
    );

    console.log("➕ Adding cREAL support in CollateralVault:", cREALAddress);

    const tx2 = await collateralVault.setSupportedCollateralToken(
      cREALAddress,
      true
    );
    await tx2.wait();

    console.log("✅ cREAL successfully added as supported collateral token!");

    // Verify it was added to CollateralVault
    const isCollateralSupported = await collateralVault.isTokenSupported(
      cREALAddress
    );
    console.log("🔍 cREAL supported as collateral:", isCollateralSupported);
  } catch (error) {
    console.error(
      "💥 Error:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

main()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

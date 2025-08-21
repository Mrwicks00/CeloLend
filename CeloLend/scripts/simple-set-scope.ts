import { ethers } from "hardhat";

async function main() {
  // UPDATE THESE VALUES
  const CELOLEND_ADDRESS = "0xd78bC1F155b68CfA5CDda366E60C46a96afCd157"; // Your deployed CeloLend address
  const SCOPE_HASH =
    "3136980176717524484005940176752065794906353342553466435733151033902264440377"; // Your scope hash

  console.log("Setting scope for CeloLend...");
  console.log("Address:", CELOLEND_ADDRESS);
  console.log("Scope:", SCOPE_HASH);

  const [deployer] = await ethers.getSigners();
  const CeloLend = await ethers.getContractFactory("CeloLend");
  const celoLend = CeloLend.attach(CELOLEND_ADDRESS);

  const tx = await celoLend.setScope(ethers.getBigInt(SCOPE_HASH));
  await tx.wait();

  console.log("✅ Scope set successfully!");
  console.log("Transaction:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

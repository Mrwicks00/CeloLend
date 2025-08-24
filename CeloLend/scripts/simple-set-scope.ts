import { ethers } from "hardhat";

async function main() {
  // UPDATE THESE VALUES
  const CELOLEND_ADDRESS = "0xC93F278471594324242F911Fb4343D9bC2e57Dbc"; // Your deployed CeloLend address
  const SCOPE_HASH =
    "11062218128614317686196553676006547537492994331274935636004202511044291673113"; // Your scope hash

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

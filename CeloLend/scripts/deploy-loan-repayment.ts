import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying LoanRepayment contract...");

  // Read existing deployment data
  const deploymentPath = path.join(
    __dirname,
    "../deployment-celoLend-only.json"
  );
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const celoLendAddress = deploymentData.contracts.CeloLend;
  const collateralVaultAddress = deploymentData.contracts.CollateralVault;
  const priceOracleAddress = deploymentData.contracts.PriceOracle;

  console.log("Using existing contract addresses:");
  console.log("CeloLend:", celoLendAddress);
  console.log("CollateralVault:", collateralVaultAddress);
  console.log("PriceOracle:", priceOracleAddress);

  // Deploy LoanRepayment contract
  const LoanRepayment = await ethers.getContractFactory("LoanRepayment");
  const loanRepayment = await LoanRepayment.deploy(
    celoLendAddress,
    collateralVaultAddress,
    priceOracleAddress
  );

  await loanRepayment.waitForDeployment();
  const loanRepaymentAddress = await loanRepayment.getAddress();

  console.log("LoanRepayment deployed to:", loanRepaymentAddress);

  // Update CeloLend contract to point to LoanRepayment
  const celoLend = await ethers.getContractAt("CeloLend", celoLendAddress);

  console.log("Setting LoanRepayment contract address in CeloLend...");
  const setRepaymentTx = await celoLend.setLoanRepaymentContract(
    loanRepaymentAddress
  );
  await setRepaymentTx.wait();
  console.log("LoanRepayment contract address set successfully!");

  // Update deployment file
  deploymentData.contracts.LoanRepayment = loanRepaymentAddress;
  deploymentData.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

  console.log("\n=== Deployment Summary ===");
  console.log("LoanRepayment:", loanRepaymentAddress);
  console.log("Integration: Complete");
  console.log("Deployment file updated");

  // Verify deployment
  console.log("\n=== Verification ===");
  try {
    const repaymentContractFromCeloLend =
      await celoLend.loanRepaymentContract();
    console.log(
      "LoanRepayment address in CeloLend:",
      repaymentContractFromCeloLend
    );
    console.log(
      "Integration verified:",
      repaymentContractFromCeloLend === loanRepaymentAddress
    );
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



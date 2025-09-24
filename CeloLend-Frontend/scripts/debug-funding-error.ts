import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../lib/contracts/addresses";
import { CELO_LEND_ABI } from "../lib/contracts/abi";

// Debug script to identify the exact cause of loan funding revert
async function debugFundingError() {
  console.log("🔍 Debugging Loan Funding Error...\n");

  // Connect to Alfajores testnet
  const provider = new ethers.JsonRpcProvider(
    "https://alfajores-forno.celo-testnet.org"
  );
  const celoLendAddress = CONTRACT_ADDRESSES.alfajores.CeloLend;

  console.log("📡 Connected to Alfajores testnet");
  console.log("📍 CeloLend contract:", celoLendAddress);
  console.log();

  // Create contract instance
  const celoLend = new ethers.Contract(
    celoLendAddress,
    CELO_LEND_ABI,
    provider
  );

  try {
    // 1. Check contract state
    console.log("1️⃣ Contract State Check:");
    const platformFeeRate = await celoLend.platformFeeRate();
    const minLoanAmount = await celoLend.minLoanAmount();
    const maxLoanAmount = await celoLend.maxLoanAmount();
    const feeCollector = await celoLend.feeCollector();

    console.log(
      "  Platform fee rate:",
      platformFeeRate.toString(),
      "basis points"
    );
    console.log(
      "  Min loan amount:",
      ethers.formatEther(minLoanAmount),
      "CELO"
    );
    console.log(
      "  Max loan amount:",
      ethers.formatEther(maxLoanAmount),
      "CELO"
    );
    console.log("  Fee collector:", feeCollector);
    console.log();

    // 2. Check active loan requests
    console.log("2️⃣ Active Loan Requests:");
    try {
      const activeRequests = await celoLend.getActiveLoanRequests();
      console.log("  Total active requests:", activeRequests.length);

      if (activeRequests.length > 0) {
        const firstRequestId = activeRequests[0];
        const request = await celoLend.getLoanRequest(firstRequestId);
        const totalFunded = await celoLend.totalFundedByLoan(firstRequestId);
        const remaining = request.amount - totalFunded;

        console.log("  First request ID:", firstRequestId.toString());
        console.log(
          "  Request amount:",
          ethers.formatEther(request.amount),
          "CELO"
        );
        console.log("  Total funded:", ethers.formatEther(totalFunded), "CELO");
        console.log("  Remaining:", ethers.formatEther(remaining), "CELO");
        console.log("  Token address:", request.tokenAddress);
        console.log("  Is active:", request.isActive);
        console.log("  Is funded:", request.isFunded);
        console.log("  Borrower:", request.borrower);
      }
    } catch (error) {
      console.log("  ❌ Error fetching loan requests:", error.message);
    }
    console.log();

    // 3. Check contract dependencies
    console.log("3️⃣ Contract Dependencies:");
    try {
      const collateralVault = await celoLend.collateralVault();
      const creditScore = await celoLend.creditScore();
      const priceOracle = await celoLend.priceOracle();
      const mentoIntegration = await celoLend.mentoIntegration();
      const loanRepaymentContract = await celoLend.loanRepaymentContract();

      console.log("  CollateralVault:", collateralVault);
      console.log("  CreditScore:", creditScore);
      console.log("  PriceOracle:", priceOracle);
      console.log("  MentoIntegration:", mentoIntegration);
      console.log("  LoanRepayment:", loanRepaymentContract);

      // Check if contracts are valid (not zero address)
      const contracts = [
        { name: "CollateralVault", address: collateralVault },
        { name: "CreditScore", address: creditScore },
        { name: "PriceOracle", address: priceOracle },
        { name: "MentoIntegration", address: mentoIntegration },
        { name: "LoanRepayment", address: loanRepaymentContract },
      ];

      for (const contract of contracts) {
        if (contract.address === ethers.ZeroAddress) {
          console.log(`  ❌ ${contract.name} is not set (zero address)`);
        } else {
          console.log(`  ✅ ${contract.name} is set`);
        }
      }
    } catch (error) {
      console.log("  ❌ Error checking dependencies:", error.message);
    }
    console.log();

    // 4. Test gas estimation for a small amount
    console.log("4️⃣ Gas Estimation Test:");
    try {
      const activeRequests = await celoLend.getActiveLoanRequests();
      if (activeRequests.length > 0) {
        const loanId = activeRequests[0];
        const request = await celoLend.getLoanRequest(loanId);
        const totalFunded = await celoLend.totalFundedByLoan(loanId);
        const remaining = request.amount - totalFunded;

        if (remaining > 0) {
          const testAmount =
            remaining > ethers.parseEther("0.01")
              ? ethers.parseEther("0.01")
              : remaining;

          console.log(
            "  Testing with amount:",
            ethers.formatEther(testAmount),
            "CELO"
          );

          try {
            const gasEstimate = await celoLend.fundLoan.estimateGas(
              loanId,
              testAmount,
              { value: testAmount }
            );
            console.log("  ✅ Gas estimate:", gasEstimate.toString());
            console.log("  ✅ Transaction simulation successful!");
          } catch (gasError) {
            console.log("  ❌ Gas estimation failed:", gasError.message);

            // Analyze the error
            if (gasError.message.includes("Native token transfer failed")) {
              console.log(
                "  💡 Issue: Native token transfer to LoanAgreement failed"
              );
              console.log(
                "  💡 This suggests a problem in LoanAgreement constructor"
              );
            } else if (gasError.message.includes("Fee transfer failed")) {
              console.log("  💡 Issue: Fee transfer to fee collector failed");
              console.log(
                "  💡 Check if fee collector can receive native tokens"
              );
            } else if (
              gasError.message.includes(
                "Failed to initialize repayment tracking"
              )
            ) {
              console.log("  💡 Issue: LoanRepayment initialization failed");
              console.log("  💡 Check LoanRepayment contract");
            } else {
              console.log("  💡 Unknown error - check contract logic");
            }
          }
        } else {
          console.log("  ⏭️  No remaining amount to fund");
        }
      } else {
        console.log("  ⏭️  No active loan requests found");
      }
    } catch (error) {
      console.log("  ❌ Error in gas estimation:", error.message);
    }
    console.log();

    // 5. Check fee collector balance and status
    console.log("5️⃣ Fee Collector Check:");
    try {
      const feeCollector = await celoLend.feeCollector();
      if (feeCollector !== ethers.ZeroAddress) {
        const balance = await provider.getBalance(feeCollector);
        console.log(
          "  Fee collector balance:",
          ethers.formatEther(balance),
          "CELO"
        );
        console.log("  Fee collector address:", feeCollector);

        // Check if it's a contract
        const code = await provider.getCode(feeCollector);
        if (code === "0x") {
          console.log("  ⚠️  Fee collector is an EOA (not a contract)");
        } else {
          console.log("  ✅ Fee collector is a contract");
        }
      } else {
        console.log("  ❌ Fee collector not set (zero address)");
      }
    } catch (error) {
      console.log("  ❌ Error checking fee collector:", error.message);
    }
    console.log();

    // 6. Summary and recommendations
    console.log("📊 Summary & Recommendations:");
    console.log("  Common causes of 'transaction execution reverted':");
    console.log("  1. ❌ Fee collector cannot receive native tokens");
    console.log("  2. ❌ LoanAgreement constructor validation failing");
    console.log("  3. ❌ LoanRepayment contract not properly deployed");
    console.log("  4. ❌ Insufficient gas limit");
    console.log("  5. ❌ Contract dependency not properly set");
    console.log();
    console.log("  Next steps:");
    console.log("  1. Check the gas estimation error above");
    console.log("  2. Verify all contract addresses are correct");
    console.log("  3. Ensure fee collector can receive CELO");
    console.log("  4. Check LoanAgreement constructor parameters");
    console.log("  5. Verify LoanRepayment contract is deployed and working");
  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

// Run the debug script
if (require.main === module) {
  debugFundingError().catch(console.error);
}

export { debugFundingError };

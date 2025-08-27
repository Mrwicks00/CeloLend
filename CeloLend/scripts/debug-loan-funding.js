const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Starting Loan Funding Debug with Hardhat...\n");

  try {
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Signer address:", signer.address);
    console.log(
      "💰 Signer balance:",
      ethers.formatEther(await signer.getBalance()),
      "CELO\n"
    );

    // Get the CeloLend contract
    const celoLendAddress = "0xC93F278471594324242F911Fb4343D9bC2e57Dbc"; // Update with your deployed address
    const celoLend = await ethers.getContractAt("CeloLend", celoLendAddress);

    console.log("📋 CeloLend contract:", celoLendAddress);

    // Check if contract is deployed
    const code = await ethers.provider.getCode(celoLendAddress);
    if (code === "0x") {
      throw new Error("❌ CeloLend contract not deployed at this address!");
    }
    console.log("✅ CeloLend contract deployed\n");

    // 1. Basic contract info
    console.log("🏗️  Contract Basics:");
    try {
      const owner = await celoLend.owner();
      console.log("  Owner:", owner);

      const feeCollector = await celoLend.feeCollector();
      console.log("  Fee Collector:", feeCollector);

      const platformFeeRate = await celoLend.platformFeeRate();
      console.log(
        "  Platform Fee Rate:",
        platformFeeRate.toString(),
        "basis points"
      );

      const minLoanAmount = await celoLend.minLoanAmount();
      console.log(
        "  Min Loan Amount:",
        ethers.formatEther(minLoanAmount),
        "tokens"
      );

      const maxLoanAmount = await celoLend.maxLoanAmount();
      console.log(
        "  Max Loan Amount:",
        ethers.formatEther(maxLoanAmount),
        "tokens"
      );

      const minCollateralRatio = await celoLend.minCollateralRatio();
      console.log(
        "  Min Collateral Ratio:",
        minCollateralRatio.toString(),
        "basis points"
      );
    } catch (error) {
      console.log("  ❌ Error reading contract state:", error.message);
    }
    console.log();

    // 2. Dependent contracts
    console.log("🔗 Dependent Contracts:");
    try {
      const collateralVault = await celoLend.collateralVault();
      const creditScore = await celoLend.creditScore();
      const priceOracle = await celoLend.priceOracle();
      const mentoIntegration = await celoLend.mentoIntegration();

      console.log("  Collateral Vault:", collateralVault);
      console.log("  Credit Score:", creditScore);
      console.log("  Price Oracle:", priceOracle);
      console.log("  Mento Integration:", mentoIntegration);

      // Check if these contracts are deployed
      const vaultCode = await ethers.provider.getCode(collateralVault);
      const creditCode = await ethers.provider.getCode(creditScore);
      const oracleCode = await ethers.provider.getCode(priceOracle);
      const mentoCode = await ethers.provider.getCode(mentoIntegration);

      console.log(
        "  ✅ Collateral Vault:",
        vaultCode !== "0x" ? "Deployed" : "❌ Not Deployed"
      );
      console.log(
        "  ✅ Credit Score:",
        creditCode !== "0x" ? "Deployed" : "❌ Not Deployed"
      );
      console.log(
        "  ✅ Price Oracle:",
        oracleCode !== "0x" ? "Deployed" : "❌ Not Deployed"
      );
      console.log(
        "  ✅ Mento Integration:",
        mentoCode !== "0x" ? "Deployed" : "❌ Not Deployed"
      );
    } catch (error) {
      console.log("  ❌ Error reading dependent contracts:", error.message);
    }
    console.log();

    // 3. List all available loan IDs
    console.log("📋 Available Loan IDs:");
    try {
      const activeLoanRequests = await celoLend.getActiveLoanRequests();
      const nextId = await celoLend.nextLoanId();

      console.log("  Next Loan ID:", nextId.toString());
      console.log("  Active Loan Requests:", activeLoanRequests.length);

      if (activeLoanRequests.length > 0) {
        console.log("  Active Loan IDs:");
        for (const loanId of activeLoanRequests) {
          try {
            const request = await celoLend.getLoanRequest(loanId);
            const totalFunded = await celoLend.totalFundedByLoan(loanId);
            const progress = (
              (Number(totalFunded) / Number(request.amount)) *
              100
            ).toFixed(2);
            const tokenType =
              request.tokenAddress === ethers.ZeroAddress ? "CELO" : "ERC20";

            console.log(
              `    ID ${loanId}: ${ethers.formatEther(
                request.amount
              )} ${tokenType} - ${progress}% funded`
            );
          } catch (error) {
            console.log(`    ID ${loanId}: Error reading details`);
          }
        }
      } else {
        console.log("  No active loan requests found");
      }

      // Also check for any existing loans (not just active requests)
      console.log("  Checking for existing loans...");
      let foundLoans = 0;
      for (let i = 1; i < Number(nextId); i++) {
        try {
          const request = await celoLend.getLoanRequest(i);
          if (request.borrower !== ethers.ZeroAddress) {
            foundLoans++;
            const totalFunded = await celoLend.totalFundedByLoan(i);
            const progress = (
              (Number(totalFunded) / Number(request.amount)) *
              100
            ).toFixed(2);
            const tokenType =
              request.tokenAddress === ethers.ZeroAddress ? "CELO" : "ERC20";
            const status = request.isFunded
              ? "FUNDED"
              : request.isActive
              ? "ACTIVE"
              : "INACTIVE";

            console.log(
              `    ID ${i}: ${ethers.formatEther(
                request.amount
              )} ${tokenType} - ${progress}% funded - ${status}`
            );
          }
        } catch (error) {
          // Loan doesn't exist, skip
        }
      }

      if (foundLoans === 0) {
        console.log("  No existing loans found");
      }
    } catch (error) {
      console.log("  ❌ Error listing loan IDs:", error.message);
    }
    console.log();

    // 4. Check specific loan details (use first available or specified)
    let loanIdToCheck = 1; // Default to first loan
    if (activeLoanRequests && activeLoanRequests.length > 0) {
      loanIdToCheck = Number(activeLoanRequests[0]);
    }

    console.log("📝 Loan Request Details (ID:", loanIdToCheck, "):");
    try {
      const request = await celoLend.getLoanRequest(loanIdToCheck);
      console.log("  Borrower:", request.borrower);
      console.log("  Amount:", ethers.formatEther(request.amount), "tokens");
      console.log(
        "  Token Type:",
        request.tokenAddress === ethers.ZeroAddress ? "Native CELO" : "ERC20"
      );
      console.log(
        "  Interest Rate:",
        request.interestRate.toString(),
        "basis points"
      );
      console.log("  Duration:", request.duration.toString(), "seconds");
      console.log(
        "  Collateral Amount:",
        ethers.formatEther(request.collateralAmount),
        "tokens"
      );
      console.log("  Collateral Token:", request.collateralToken);
      console.log("  Is Active:", request.isActive);
      console.log("  Is Funded:", request.isFunded);
      console.log(
        "  Created At:",
        new Date(Number(request.createdAt) * 1000).toISOString()
      );

      // Check if borrower is verified
      try {
        const isVerified = await celoLend.isUserVerified(request.borrower);
        console.log("  Borrower Verified:", isVerified);
      } catch (error) {
        console.log("  Borrower Verified: ❌ Error checking");
      }
    } catch (error) {
      console.log("  ❌ Error reading loan request:", error.message);
      console.log("  This might be the issue - loan ID might not exist!");
      return;
    }
    console.log();

    // 5. Check funding progress
    console.log("💰 Funding Progress:");
    try {
      const totalFunded = await celoLend.totalFundedByLoan(loanIdToCheck);
      const netAmount = await celoLend.netAmountHeldByLoan(loanIdToCheck);
      const remaining = request.amount - totalFunded;

      console.log("  Total Funded:", ethers.formatEther(totalFunded), "tokens");
      console.log(
        "  Net Amount Held:",
        ethers.formatEther(netAmount),
        "tokens"
      );
      console.log(
        "  Remaining to Fund:",
        ethers.formatEther(remaining),
        "tokens"
      );
      console.log(
        "  Funding Progress:",
        ((Number(totalFunded) / Number(request.amount)) * 100).toFixed(2) + "%"
      );

      // Check if loan is fully funded
      if (totalFunded >= request.amount) {
        console.log("  ✅ Loan is fully funded!");

        // Check if LoanAgreement was deployed
        const loanContractAddress = await celoLend.loanContracts(loanIdToCheck);
        if (loanContractAddress !== ethers.ZeroAddress) {
          console.log("  Loan Agreement deployed at:", loanContractAddress);

          // Check if the deployed contract can receive native tokens
          const loanContractCode = await ethers.provider.getCode(
            loanContractAddress
          );
          if (loanContractCode !== "0x") {
            console.log("  ✅ Loan Agreement contract deployed");

            // Try to get contract balance
            try {
              const loanContractBalance = await ethers.provider.getBalance(
                loanContractAddress
              );
              console.log(
                "  Loan Agreement balance:",
                ethers.formatEther(loanContractBalance),
                "CELO"
              );
            } catch (error) {
              console.log(
                "  ❌ Error checking loan contract balance:",
                error.message
              );
            }
          } else {
            console.log("  ❌ Loan Agreement contract not properly deployed");
          }
        } else {
          console.log("  ❌ Loan Agreement not deployed yet");
        }
      } else {
        console.log("  ⏳ Loan is partially funded");
      }
    } catch (error) {
      console.log("  ❌ Error reading funding progress:", error.message);
    }
    console.log();

    // 6. Check lender contributions
    console.log("👥 Lender Contributions:");
    try {
      const lenders = await celoLend.getLendersByLoan(loanIdToCheck);
      console.log("  Number of Lenders:", lenders.length);

      for (let i = 0; i < lenders.length; i++) {
        const lender = lenders[i];
        const contribution = await celoLend.lenderContribution(
          loanIdToCheck,
          lender
        );
        console.log(
          `  Lender ${i + 1}: ${lender} - ${ethers.formatEther(
            contribution
          )} tokens`
        );
      }
    } catch (error) {
      console.log("  ❌ Error reading lender contributions:", error.message);
    }
    console.log();

    // 7. Check supported tokens
    console.log("🪙 Supported Tokens:");
    try {
      const supportedTokensList = await celoLend.getSupportedTokensList();
      console.log("  Number of supported tokens:", supportedTokensList.length);

      for (const token of supportedTokensList) {
        const isSupported = await celoLend.supportedTokens(token);
        console.log(
          `  ${token}: ${isSupported ? "✅ Supported" : "❌ Not Supported"}`
        );
      }
    } catch (error) {
      console.log("  ❌ Error reading supported tokens:", error.message);
    }
    console.log();

    // 8. Check contract balances
    console.log("🏦 Contract Balances:");
    try {
      const celoLendBalance = await ethers.provider.getBalance(celoLendAddress);
      console.log(
        "  CeloLend Contract:",
        ethers.formatEther(celoLendBalance),
        "CELO"
      );

      const feeCollector = await celoLend.feeCollector();
      const feeCollectorBalance = await ethers.provider.getBalance(
        feeCollector
      );
      console.log(
        "  Fee Collector:",
        ethers.formatEther(feeCollectorBalance),
        "CELO"
      );
    } catch (error) {
      console.log("  ❌ Error reading contract balances:", error.message);
    }
    console.log();

    // 9. Test transaction simulation
    console.log("🧪 Transaction Simulation:");
    try {
      const request = await celoLend.getLoanRequest(loanIdToCheck);
      const totalFunded = await celoLend.totalFundedByLoan(loanIdToCheck);
      const remaining = request.amount - totalFunded;

      if (remaining > 0) {
        const testAmount =
          remaining > ethers.parseEther("0.1")
            ? ethers.parseEther("0.1")
            : remaining;
        console.log(
          "  Testing with amount:",
          ethers.formatEther(testAmount),
          "CELO"
        );

        // Estimate gas
        try {
          const gasEstimate = await celoLend.fundLoan.estimateGas(
            loanIdToCheck,
            testAmount,
            { value: testAmount }
          );
          console.log("  ✅ Gas estimate:", gasEstimate.toString());
          console.log("  ✅ Transaction simulation successful!");
        } catch (gasError) {
          console.log("  ❌ Gas estimation failed:", gasError.message);
          console.log("  🚨 This is likely where your issue is!");

          // Try to get more details
          if (gasError.message.includes("Native token transfer failed")) {
            console.log(
              "  💡 The issue is in the native token transfer to LoanAgreement"
            );
            console.log("  💡 Check if LoanAgreement constructor is failing");
          }
        }

        // Check if wallet has enough balance
        const walletBalance = await signer.getBalance();
        if (walletBalance >= testAmount) {
          console.log("  ✅ Wallet has sufficient balance");
        } else {
          console.log("  ❌ Insufficient wallet balance");
        }
      } else {
        console.log("  ⏭️  Loan is already fully funded, skipping simulation");
      }
    } catch (error) {
      console.log("  ❌ Error simulating transaction:", error.message);
      console.log("  This is likely where the issue is!");
    }
    console.log();

    // 10. Summary and recommendations
    console.log("📊 Summary & Recommendations:");
    console.log("  Based on the debug information above:");
    console.log("  1. Check if all dependent contracts are properly deployed");
    console.log(
      "  2. Verify the LoanAgreement contract constructor parameters"
    );
    console.log("  3. Ensure the fee collector can receive native tokens");
    console.log("  4. Check if there are any constructor validation issues");
    console.log("  5. Verify all contract addresses are correct");
    console.log();
  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

// Execute the script
main()
  .then(() => {
    console.log("✅ Debug script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug script failed:", error);
    process.exit(1);
  });



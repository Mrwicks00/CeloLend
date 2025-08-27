import { ethers } from "ethers";
import { CeloLend__factory } from "../lib/contracts/abi/celoLend";
import { CollateralVault__factory } from "../lib/contracts/abi/collateralVault";
import { CreditScore__factory } from "../lib/contracts/abi/creditScore";
import { PriceOracle__factory } from "../lib/contracts/abi/priceOracle";
import { getContractAddress } from "../lib/contracts/addresses";

// Configuration
const RPC_URL = "https://alfajores-forno.celo-testnet.org"; // Change to your network
const PRIVATE_KEY = "YOUR_PRIVATE_KEY"; // Replace with your private key
const LOAN_ID = "1"; // Replace with the loan ID you're trying to fund

async function debugLoanFunding() {
  console.log("🔍 Starting Loan Funding Debug...\n");

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(
      "📡 Connected to network:",
      await provider.getNetwork().then((n) => n.name)
    );
    console.log("👤 Wallet address:", wallet.address);
    console.log(
      "💰 Wallet balance:",
      ethers.formatEther(await provider.getBalance(wallet.address)),
      "CELO\n"
    );

    // Get contract instances
    const celoLendAddress = getContractAddress("CeloLend");
    const celoLend = CeloLend__factory.connect(celoLendAddress, wallet);

    console.log("📋 Contract Addresses:");
    console.log("  CeloLend:", celoLendAddress);

    // Check if contracts are deployed
    const code = await provider.getCode(celoLendAddress);
    if (code === "0x") {
      throw new Error("❌ CeloLend contract not deployed at this address!");
    }
    console.log("  ✅ CeloLend contract deployed\n");

    // 1. Check CeloLend contract state
    console.log("🏗️  CeloLend Contract State:");
    try {
      const owner = await celoLend.owner();
      console.log("  Owner:", owner);

      const feeCollector = await celoLend.feeCollector();
      console.log("  Fee Collector:", feeCollector);

      const feeCollectorBalance = await provider.getBalance(feeCollector);
      console.log(
        "  Fee Collector Balance:",
        ethers.formatEther(feeCollectorBalance),
        "CELO"
      );

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

    // 2. Check dependent contracts
    console.log("🔗 Dependent Contracts:");
    try {
      const collateralVaultAddress = await celoLend.collateralVault();
      console.log("  Collateral Vault:", collateralVaultAddress);

      const creditScoreAddress = await celoLend.creditScore();
      console.log("  Credit Score:", creditScoreAddress);

      const priceOracleAddress = await celoLend.priceOracle();
      console.log("  Price Oracle:", priceOracleAddress);

      const mentoIntegrationAddress = await celoLend.mentoIntegration();
      console.log("  Mento Integration:", mentoIntegrationAddress);

      const loanRepaymentAddress = await celoLend.loanRepaymentContract();
      console.log("  Loan Repayment:", loanRepaymentAddress || "Not set");

      // Check if these contracts are deployed
      const vaultCode = await provider.getCode(collateralVaultAddress);
      const creditCode = await provider.getCode(creditScoreAddress);
      const oracleCode = await provider.getCode(priceOracleAddress);
      const mentoCode = await provider.getCode(mentoIntegrationAddress);

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

    // 3. Check loan request details
    console.log("📝 Loan Request Details (ID:", LOAN_ID, "):");
    try {
      const request = await celoLend.getLoanRequest(LOAN_ID);
      console.log("  Borrower:", request.borrower);
      console.log("  Amount:", ethers.formatEther(request.amount), "tokens");
      console.log("  Token Address:", request.tokenAddress);
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
      return; // Can't continue without loan request
    }
    console.log();

    // 4. Check funding progress
    console.log("💰 Funding Progress:");
    try {
      const totalFunded = await celoLend.totalFundedByLoan(LOAN_ID);
      const netAmount = await celoLend.netAmountHeldByLoan(LOAN_ID);
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
        const loanContractAddress = await celoLend.loanContracts(LOAN_ID);
        if (loanContractAddress !== ethers.ZeroAddress) {
          console.log("  Loan Agreement deployed at:", loanContractAddress);

          // Check if the deployed contract can receive native tokens
          const loanContractCode = await provider.getCode(loanContractAddress);
          if (loanContractCode !== "0x") {
            console.log("  ✅ Loan Agreement contract deployed");

            // Try to get contract balance
            try {
              const loanContractBalance = await provider.getBalance(
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

    // 5. Check lender contributions
    console.log("👥 Lender Contributions:");
    try {
      const lenders = await celoLend.getLendersByLoan(LOAN_ID);
      console.log("  Number of Lenders:", lenders.length);

      for (let i = 0; i < lenders.length; i++) {
        const lender = lenders[i];
        const contribution = await celoLend.lenderContribution(LOAN_ID, lender);
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

    // 6. Check supported tokens
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

    // 7. Check contract balances
    console.log("🏦 Contract Balances:");
    try {
      const celoLendBalance = await provider.getBalance(celoLendAddress);
      console.log(
        "  CeloLend Contract:",
        ethers.formatEther(celoLendBalance),
        "CELO"
      );

      const feeCollector = await celoLend.feeCollector();
      const feeCollectorBalance = await provider.getBalance(feeCollector);
      console.log(
        "  Fee Collector:",
        ethers.formatEther(feeCollectorBalance),
        "CELO"
      );
    } catch (error) {
      console.log("  ❌ Error reading contract balances:", error.message);
    }
    console.log();

    // 8. Test transaction simulation
    console.log("🧪 Transaction Simulation:");
    try {
      const request = await celoLend.getLoanRequest(LOAN_ID);
      const remaining =
        request.amount - (await celoLend.totalFundedByLoan(LOAN_ID));

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
        const gasEstimate = await celoLend.fundLoan.estimateGas(
          LOAN_ID,
          testAmount,
          { value: testAmount }
        );
        console.log("  ✅ Gas estimate:", gasEstimate.toString());

        // Check if wallet has enough balance
        const walletBalance = await provider.getBalance(wallet.address);
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

    // 9. Summary and recommendations
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

// Run the debug script
if (require.main === module) {
  debugLoanFunding()
    .then(() => {
      console.log("✅ Debug script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Debug script failed:", error);
      process.exit(1);
    });
}

export { debugLoanFunding };



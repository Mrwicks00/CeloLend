import { ethers } from "ethers";

// Configuration - UPDATE THESE VALUES
const RPC_URL = "https://alfajores-forno.celo-testnet.org"; // Your network RPC
const LOAN_ID = "1"; // The loan ID you're trying to fund (will be auto-detected if not found)
const CELOLEND_ADDRESS = "0xC93F278471594324242F911Fb4343D9bC2e57Dbc"; // Your CeloLend contract address

// Basic ABI for the functions we need
const CELOLEND_ABI = [
  "function owner() view returns (address)",
  "function feeCollector() view returns (address)",
  "function platformFeeRate() view returns (uint256)",
  "function collateralVault() view returns (address)",
  "function creditScore() view returns (address)",
  "function priceOracle() view returns (address)",
  "function mentoIntegration() view returns (address)",
  "function loanRepaymentContract() view returns (address)",
  "function getLoanRequest(uint256) view returns (tuple(uint256 id, address borrower, uint256 amount, address tokenAddress, uint256 interestRate, uint256 duration, uint256 collateralAmount, address collateralToken, bool isActive, bool isFunded, uint256 createdAt))",
  "function totalFundedByLoan(uint256) view returns (uint256)",
  "function netAmountHeldByLoan(uint256) view returns (uint256)",
  "function loanContracts(uint256) view returns (address)",
  "function getLendersByLoan(uint256) view returns (address[])",
  "function lenderContribution(uint256, address) view returns (uint256)",
  "function supportedTokens(address) view returns (bool)",
  "function getSupportedTokensList() view returns (address[])",
  "function isUserVerified(address) view returns (bool)",
  "function fundLoan(uint256, uint256) payable",
  "function getActiveLoanRequests() view returns (uint256[])",
  "function nextLoanId() view returns (uint256)",
];

// Function to list all available loan IDs
async function listAllLoanIds(celoLend: ethers.Contract) {
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

    return activeLoanRequests;
  } catch (error) {
    console.log("  ❌ Error listing loan IDs:", error.message);
    return [];
  }
  console.log();
}

async function debugLoanFunding() {
  console.log("🔍 Starting Simple Loan Funding Debug...\n");

  try {
    // Setup provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log(
      "📡 Connected to network:",
      await provider.getNetwork().then((n) => n.name)
    );
    console.log(
      "🔍 Specified loan ID:",
      LOAN_ID,
      "(will auto-detect if not found)"
    );
    console.log("📋 CeloLend contract:", CELOLEND_ADDRESS);
    console.log();

    // Check if contract is deployed
    const code = await provider.getCode(CELOLEND_ADDRESS);
    if (code === "0x") {
      throw new Error("❌ CeloLend contract not deployed at this address!");
    }
    console.log("✅ CeloLend contract deployed\n");

    // Create contract instance
    const celoLend = new ethers.Contract(
      CELOLEND_ADDRESS,
      CELOLEND_ABI,
      provider
    );

    // 0. List all available loan IDs first
    await listAllLoanIds(celoLend);

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
    } catch (error) {
      console.log("  ❌ Error reading basic info:", error.message);
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

      // Check if deployed
      const vaultCode = await provider.getCode(collateralVault);
      const creditCode = await provider.getCode(creditScore);
      const oracleCode = await provider.getCode(priceOracle);
      const mentoCode = await provider.getCode(mentoIntegration);

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

    // 3. Loan request details
    console.log("📝 Loan Request Details:");

    // Check if the specified loan ID exists, if not use the first available one
    let loanIdToCheck = LOAN_ID;
    try {
      const testRequest = await celoLend.getLoanRequest(LOAN_ID);
      if (testRequest.borrower === ethers.ZeroAddress) {
        console.log(
          "  ⚠️  Specified loan ID doesn't exist, will check first available loan"
        );
        const activeLoans = await celoLend.getActiveLoanRequests();
        if (activeLoans.length > 0) {
          loanIdToCheck = activeLoans[0].toString();
          console.log("  🔄 Using first available loan ID:", loanIdToCheck);
        }
      }
    } catch (error) {
      console.log(
        "  ⚠️  Specified loan ID doesn't exist, will check first available loan"
      );
      const activeLoans = await celoLend.getActiveLoanRequests();
      if (activeLoans.length > 0) {
        loanIdToCheck = activeLoans[0].toString();
        console.log("  🔄 Using first available loan ID:", loanIdToCheck);
      }
    }

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

      // Check borrower verification
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

    // 4. Funding status
    console.log("💰 Funding Status:");
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
      console.log("  Remaining:", ethers.formatEther(remaining), "tokens");
      console.log(
        "  Progress:",
        ((Number(totalFunded) / Number(request.amount)) * 100).toFixed(2) + "%"
      );

      if (totalFunded >= request.amount) {
        console.log("  ✅ Loan is fully funded!");

        // Check if LoanAgreement was deployed
        const loanContractAddress = await celoLend.loanContracts(LOAN_ID);
        if (loanContractAddress !== ethers.ZeroAddress) {
          console.log("  Loan Agreement deployed at:", loanContractAddress);

          const loanContractCode = await provider.getCode(loanContractAddress);
          if (loanContractCode !== "0x") {
            console.log("  ✅ Loan Agreement contract deployed");

            const loanContractBalance = await provider.getBalance(
              loanContractAddress
            );
            console.log(
              "  Loan Agreement balance:",
              ethers.formatEther(loanContractBalance),
              "CELO"
            );
          } else {
            console.log("  ❌ Loan Agreement contract not properly deployed");
          }
        } else {
          console.log("  ❌ Loan Agreement not deployed yet");
        }
      }
    } catch (error) {
      console.log("  ❌ Error reading funding status:", error.message);
    }
    console.log();

    // 5. Test gas estimation
    console.log("🧪 Gas Estimation Test:");
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

        // Try to estimate gas
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
      } else {
        console.log("  ⏭️  Loan is already fully funded");
      }
    } catch (error) {
      console.log("  ❌ Error in gas estimation test:", error.message);
    }
    console.log();

    // 6. Summary
    console.log("📊 Summary:");
    console.log(
      "  If gas estimation failed with 'Native token transfer failed':"
    );
    console.log("  1. The LoanAgreement contract deployment is succeeding");
    console.log("  2. But the transfer of CELO to it is failing");
    console.log("  3. This suggests an issue in LoanAgreement constructor");
    console.log("  4. Or the contract can't receive native tokens");
    console.log();
  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

// Run the script
debugLoanFunding()
  .then(() => {
    console.log("✅ Debug completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });

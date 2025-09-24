// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./CeloLend.sol";
import "./CreditScore.sol";

/**
 * @title UserData
 * @dev Handles user data aggregation and analytics
 */
contract UserData is Ownable {
    CeloLend public immutable celoLend;
    CreditScore public immutable creditScore;

    struct UserLoanData {
        uint256 loanId;
        uint256 amount;
        address tokenAddress;
        uint256 interestRate;
        uint256 duration;
        uint256 collateralAmount;
        address collateralToken;
        bool isActive;
        bool isFunded;
        uint256 createdAt;
        uint256 totalFunded;
    }

    struct UserStats {
        uint256 totalLoans;
        uint256 activeLoans;
        uint256 totalBorrowed;
        uint256 totalLent;
        uint256 creditScore;
        bool isVerified;
    }

    constructor(
        address payable _celoLend,
        address _creditScore
    ) Ownable(msg.sender) {
        celoLend = CeloLend(_celoLend);
        creditScore = CreditScore(_creditScore);
    }

    /**
     * @dev Get all user data
     */
    function getAllUserData(
        address user
    ) external view returns (UserStats memory) {
        uint256[] memory userLoans = celoLend.getUserLoans(user);
        uint256[] memory lenderLoans = celoLend.getLenderLoans(user);

        uint256 totalBorrowed = 0;
        uint256 totalLent = 0;
        uint256 activeLoans = 0;

        // Calculate borrowed amounts
        for (uint256 i = 0; i < userLoans.length; i++) {
            try celoLend.getLoanRequest(userLoans[i]) returns (
                CeloLend.LoanRequest memory request
            ) {
                totalBorrowed += request.amount;
                if (request.isActive && !request.isFunded) {
                    activeLoans++;
                }
            } catch {
                // Skip invalid loans
            }
        }

        // Simplified lent amount calculation - skip multi-lender logic
        totalLent = lenderLoans.length * 1000; // Placeholder amount

        // Get credit score
        uint256 userCreditScore = 0;
        try creditScore.getCreditScore(user) returns (uint256 score) {
            userCreditScore = score;
        } catch {
            // Default to 0
        }

        return
            UserStats({
                totalLoans: userLoans.length,
                activeLoans: activeLoans,
                totalBorrowed: totalBorrowed,
                totalLent: totalLent,
                creditScore: userCreditScore,
                isVerified: celoLend.isUserVerified(user)
            });
    }

    /**
     * @dev Get detailed loan information
     */
    function getLoanFullDetails(
        uint256 loanId
    ) external view returns (UserLoanData memory) {
        try celoLend.getLoanRequest(loanId) returns (
            CeloLend.LoanRequest memory request
        ) {
            uint256 totalFunded = celoLend.totalFundedByLoan(loanId);

            return
                UserLoanData({
                    loanId: request.id,
                    amount: request.amount,
                    tokenAddress: request.tokenAddress,
                    interestRate: request.interestRate,
                    duration: request.duration,
                    collateralAmount: request.collateralAmount,
                    collateralToken: request.collateralToken,
                    isActive: request.isActive,
                    isFunded: request.isFunded,
                    createdAt: request.createdAt,
                    totalFunded: totalFunded
                });
        } catch {
            // Return empty data if loan doesn't exist
            return
                UserLoanData({
                    loanId: 0,
                    amount: 0,
                    tokenAddress: address(0),
                    interestRate: 0,
                    duration: 0,
                    collateralAmount: 0,
                    collateralToken: address(0),
                    isActive: false,
                    isFunded: false,
                    createdAt: 0,
                    totalFunded: 0
                });
        }
    }

    /**
     * @dev Get user's loan history
     */
    function getUserLoanHistory(
        address user
    ) external view returns (UserLoanData[] memory) {
        uint256[] memory userLoans = celoLend.getUserLoans(user);
        UserLoanData[] memory loanData = new UserLoanData[](userLoans.length);

        for (uint256 i = 0; i < userLoans.length; i++) {
            loanData[i] = this.getLoanFullDetails(userLoans[i]);
        }

        return loanData;
    }

    /**
     * @dev Get user's lending history
     */
    function getUserLendingHistory(
        address user
    ) external view returns (UserLoanData[] memory) {
        uint256[] memory lenderLoans = celoLend.getLenderLoans(user);
        UserLoanData[] memory loanData = new UserLoanData[](lenderLoans.length);

        for (uint256 i = 0; i < lenderLoans.length; i++) {
            loanData[i] = this.getLoanFullDetails(lenderLoans[i]);
        }

        return loanData;
    }
}

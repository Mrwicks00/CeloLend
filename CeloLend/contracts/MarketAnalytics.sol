// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./CeloLend.sol";
import "./PriceOracle.sol";
import "./CreditScore.sol";

/**
 * @title MarketAnalytics
 * @dev Handles market data and analytics for the CeloLend platform
 */
contract MarketAnalytics is Ownable {
    CeloLend public immutable celoLend;
    PriceOracle public immutable priceOracle;
    CreditScore public immutable creditScore;

    struct MarketData {
        uint256 totalActiveLoans;
        uint256 totalVolume;
        uint256 averageInterestRate;
        uint256 totalLenders;
        uint256 totalBorrowers;
    }

    struct TokenAnalytics {
        address token;
        string symbol;
        uint256 totalVolume;
        uint256 activeLoans;
        uint256 averageRate;
        uint256 price;
    }

    constructor(
        address payable _celoLend,
        address _priceOracle,
        address _creditScore
    ) Ownable(msg.sender) {
        celoLend = CeloLend(_celoLend);
        priceOracle = PriceOracle(_priceOracle);
        creditScore = CreditScore(_creditScore);
    }

    /**
     * @dev Get market data for credit rating
     */
    function getMarketDataForRating(
        address user
    )
        external
        view
        returns (
            uint256 totalVolume,
            uint256 activeLoans,
            uint256 averageRate,
            uint256 creditScoreValue,
            bool isVerified
        )
    {
        // Get user's loan history
        uint256[] memory userLoans = celoLend.getUserLoans(user);
        activeLoans = userLoans.length;

        // Calculate total volume and average rate
        for (uint256 i = 0; i < userLoans.length; i++) {
            try celoLend.getLoanRequest(userLoans[i]) returns (
                CeloLend.LoanRequest memory request
            ) {
                totalVolume += request.amount;
                averageRate += request.interestRate;
            } catch {
                // Skip invalid loans
            }
        }

        if (activeLoans > 0) {
            averageRate = averageRate / activeLoans;
        }

        // Get credit score
        try creditScore.getCreditScore(user) returns (uint256 score) {
            creditScoreValue = score;
        } catch {
            creditScoreValue = 0;
        }

        // Check if user is verified
        isVerified = celoLend.isUserVerified(user);
    }

    /**
     * @dev Get market overview statistics
     */
    function getMarketOverview() external view returns (MarketData memory) {
        uint256[] memory activeRequests = celoLend.getActiveLoanRequests();
        uint256 totalVolume = 0;
        uint256 totalRates = 0;
        uint256 totalLenders = 0;
        uint256 totalBorrowers = 0;

        // Track unique lenders and borrowers using arrays
        address[] memory uniqueLenders = new address[](100); // Max 100 unique lenders
        address[] memory uniqueBorrowers = new address[](100); // Max 100 unique borrowers
        uint256 lenderCount = 0;
        uint256 borrowerCount = 0;

        for (uint256 i = 0; i < activeRequests.length; i++) {
            try celoLend.getLoanRequest(activeRequests[i]) returns (
                CeloLend.LoanRequest memory request
            ) {
                totalVolume += request.amount;
                totalRates += request.interestRate;

                // Check if borrower is already counted
                bool borrowerExists = false;
                for (uint256 k = 0; k < borrowerCount; k++) {
                    if (uniqueBorrowers[k] == request.borrower) {
                        borrowerExists = true;
                        break;
                    }
                }
                if (!borrowerExists && borrowerCount < 100) {
                    uniqueBorrowers[borrowerCount] = request.borrower;
                    borrowerCount++;
                    totalBorrowers++;
                }

                // Simplified lender counting - skip multi-lender logic
                // Just count the loan as having one lender
                totalLenders++;
            } catch {
                // Skip invalid requests
            }
        }

        uint256 averageRate = activeRequests.length > 0
            ? totalRates / activeRequests.length
            : 0;

        return
            MarketData({
                totalActiveLoans: activeRequests.length,
                totalVolume: totalVolume,
                averageInterestRate: averageRate,
                totalLenders: totalLenders,
                totalBorrowers: totalBorrowers
            });
    }

    /**
     * @dev Get token analytics
     */
    function getTokenAnalytics(
        address token
    ) external view returns (TokenAnalytics memory) {
        uint256[] memory activeRequests = celoLend.getActiveLoanRequests();
        uint256 totalVolume = 0;
        uint256 activeLoans = 0;
        uint256 totalRates = 0;

        for (uint256 i = 0; i < activeRequests.length; i++) {
            try celoLend.getLoanRequest(activeRequests[i]) returns (
                CeloLend.LoanRequest memory request
            ) {
                if (request.tokenAddress == token) {
                    totalVolume += request.amount;
                    activeLoans++;
                    totalRates += request.interestRate;
                }
            } catch {
                // Skip invalid requests
            }
        }

        uint256 averageRate = activeLoans > 0 ? totalRates / activeLoans : 0;
        uint256 price = 0;

        try priceOracle.getLatestPrice(token) returns (uint256 tokenPrice) {
            price = tokenPrice;
        } catch {
            // Price not available
        }

        return
            TokenAnalytics({
                token: token,
                symbol: "", // Would need to get from token contract
                totalVolume: totalVolume,
                activeLoans: activeLoans,
                averageRate: averageRate,
                price: price
            });
    }

    /**
     * @dev Get all active loan requests (simplified)
     */
    function getAllActiveRequests() external view returns (uint256[] memory) {
        return celoLend.getActiveLoanRequests();
    }
}

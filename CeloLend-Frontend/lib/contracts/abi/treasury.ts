export const TREASURY_ABI = [
    {
        "inputs": [
          {
            "internalType": "address",
            "name": "_developmentFund",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_insurancePool",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_emergencyReserve",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_stakeholderRewards",
            "type": "address"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "ReentrancyGuardReentrantCall",
        "type": "error"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "authorized",
            "type": "bool"
          }
        ],
        "name": "AuthorizationUpdated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "string",
            "name": "target",
            "type": "string"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "newAddress",
            "type": "address"
          }
        ],
        "name": "DistributionTargetUpdated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "revenueType",
            "type": "string"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "depositor",
            "type": "address"
          }
        ],
        "name": "RevenueDeposited",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "stakeholderAmount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "developmentAmount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "insuranceAmount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "emergencyAmount",
            "type": "uint256"
          }
        ],
        "name": "RevenueDistributed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "purpose",
            "type": "string"
          }
        ],
        "name": "Withdrawal",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "BASIS_POINTS",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "DEVELOPMENT_SHARE",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "EMERGENCY_SHARE",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "INSURANCE_SHARE",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "STAKEHOLDER_SHARE",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "authorizedDepositors",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "depositInsurancePremium",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "depositLiquidationPenalty",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "depositPlatformFees",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "developmentFund",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "distributeRevenue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "distributedRevenue",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "stakeholderRewards",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "developmentFund",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "insurancePool",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emergencyReserve",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "emergencyReserve",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "emergencyWithdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "getDistributionHistory",
        "outputs": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "stakeholderRewards",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "developmentFund",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "insurancePool",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "emergencyReserve",
                "type": "uint256"
              }
            ],
            "internalType": "struct Treasury.RevenueDistribution",
            "name": "distribution",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "lastDistribution",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "getPendingDistribution",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "stakeholderAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "developmentAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "insuranceAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emergencyAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalPending",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "getTotalRevenue",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "totalPlatformFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLiquidationPenalties",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalInsurancePremiums",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalEarlyWithdrawalFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "currentBalance",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getTreasuryMetrics",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "totalTokenTypes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalValueUSD",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastActivityTime",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "insurancePool",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "lastDistributionTime",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "revenueByToken",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "platformFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liquidationPenalties",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "insurancePremiums",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "earlyWithdrawalFees",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "authorized",
            "type": "bool"
          }
        ],
        "name": "setAuthorizedDepositor",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "stakeholderRewards",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "tokenBalances",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "target",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "newAddress",
            "type": "address"
          }
        ],
        "name": "updateDistributionTarget",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "stateMutability": "payable",
        "type": "receive"
      }
] as const;  
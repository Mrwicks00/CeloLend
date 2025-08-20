// Contract addresses for CeloLend platform
export const CONTRACT_ADDRESSES = {
  // Alfajores Testnet
  alfajores: {
    CeloLend: "0x9a66C3b09eD66c7b7cf1ad3C04F87CCd022bbCf3",
    PriceOracle: "0x8d2c60f1A979975CfaD46b1B9624F481bD757c65",
    MentoIntegration: "0x701552e8EAF283aa08423F70B287Fe483Db353d4",
    CollateralVault: "0xbE4aB35983BCDE3f58f16b239dB44eF051736007",
    CreditScore: "0x48d87430e6a18eA9E2Fa7282091Dc5b975cDE11f",
  },
  // Celo Mainnet (placeholder for future deployment)
  celo: {
    CeloLend: "",
    PriceOracle: "",
    MentoIntegration: "",
    CollateralVault: "",
    CreditScore: "",
  },
} as const;

// Self Protocol configuration
export const SELF_PROTOCOL_CONFIG = {
  alfajores: {
    hubAddress: "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
    scopeHash: "5481686980359857257105898219431995075985161095766020325523210795386920118180",
    configId: "0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc",
  },
  celo: {
    hubAddress: "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF", // Mainnet Hub
    scopeHash: "", // To be configured for mainnet
    configId: "", // To be configured for mainnet
  },
} as const;

// Network configurations
export const SUPPORTED_NETWORKS = {
  alfajores: {
    chainId: 44787,
    name: "Alfajores Testnet",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    blockExplorer: "https://alfajores.celoscan.io",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
  },
  celo: {
    chainId: 42220,
    name: "Celo Mainnet",
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
  },
} as const;

// Helper function to get contract address for current network
export function getContractAddress(
  contractName: keyof typeof CONTRACT_ADDRESSES.alfajores,
  chainId: number = 44787 // Default to Alfajores
): string {
  const network = chainId === 42220 ? "celo" : "alfajores";
  return CONTRACT_ADDRESSES[network][contractName];
}

// Helper function to get Self Protocol config for current network
export function getSelfProtocolConfig(chainId: number = 44787) {
  const network = chainId === 42220 ? "celo" : "alfajores";
  return SELF_PROTOCOL_CONFIG[network];
}

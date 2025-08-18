// Contract addresses for CeloLend platform
export const CONTRACT_ADDRESSES = {
  // Alfajores Testnet
  alfajores: {
    CeloLend: "0xD4581E5aaD1e4669a5403E9eAcAD6F6E5696B1A2",
    PriceOracle: "0x4cF9c155E2b3d54C56DfB82c548229AA700Abcb6",
    MentoIntegration: "0xA1b20Efeb3Dce92344330beAE8e358621740eAF3",
    CollateralVault: "0xc727E73CCD6B6Dd1eB524d6e24d7CbC9FE15CdEc",
    CreditScore: "0xdeeB5eAE3082A7A8b3946d5e32E7998777dA20ea",
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
    scopeHash: "10251133304428771345145886079637391408515248351029802124412184972058187105188",
    configId: "0x04ffced1e767b034d19b10013e1dab7baf1ed5d94113b4cb9a63a042bf49eb62",
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

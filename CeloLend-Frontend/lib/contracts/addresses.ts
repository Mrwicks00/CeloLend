// Contract addresses for CeloLend platform
export const CONTRACT_ADDRESSES = {
  // Alfajores Testnet
  alfajores: {
    CeloLend: "0xC93F278471594324242F911Fb4343D9bC2e57Dbc",
    PriceOracle: "0x98795Bf49B5ed75AE6ab5410275a247D04BAabD1",
    MentoIntegration: "0x8c6a57eaC8975Dfb4304aB1f9cE2e2034B85c75f",
    CollateralVault: "0x1e8a097E2942292264dFd840cE2328056Fec716c",
    CreditScore: "0xADF62F72fFa3853B0f4e6c4bBFa1A9E7625acA7a",
    Treasury: "0xcBe1f9dD7D64fce92Cf27B7E761cF0590a312DB8",
    LoanRepayment: "0x189295182AF517D2B35DAb85f98d87B289b39524",
  },
  // Celo Mainnet (placeholder for future deployment)
  celo: {
    CeloLend: "",
    PriceOracle: "",
    MentoIntegration: "",
    CollateralVault: "",
    CreditScore: "",
    Treasury: "",
    LoanRepayment: "",
  },
} as const;

// Self Protocol configuration
export const SELF_PROTOCOL_CONFIG = {
  alfajores: {
    hubAddress: "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
    scopeHash:
      "11062218128614317686196553676006547537492994331274935636004202511044291673113",
    configId:
      "0xc52f992ebee4435b00b65d2c74b12435e96359d1ccf408041528414e6ea687bc",
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

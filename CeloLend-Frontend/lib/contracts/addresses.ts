// Contract addresses for CeloLend platform
export const CONTRACT_ADDRESSES = {
  // Alfajores Testnet
  alfajores: {
    CeloLend: "0xd78bC1F155b68CfA5CDda366E60C46a96afCd157",
    PriceOracle: "0xa026Ec1c594F335894E219993A094c1BAA5625Ee",
    MentoIntegration: "0x7747C13D20c3A6056Fc2648f5768db070e6174D2",
    CollateralVault: "0x20Fb97286Bb548b10A9238b50B623Fc20F76948E",
    CreditScore: "0x790928c746e1D26ee09FC6fb072C412b2256E05D",
    Treasury: "0x55DAe23e3c48d5c71BbCC3FBD2Ae529dbceDD20F",
    LoanRepayment: "0x544267D93C5bC3e735ab7659c8f365457E11bab3",
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
      "3136980176717524484005940176752065794906353342553466435733151033902264440377",
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

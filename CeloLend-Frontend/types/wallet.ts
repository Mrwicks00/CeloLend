import type { User } from "@privy-io/react-auth";

export interface WalletState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Wallet info
  address: string | null;
  balance: string;
  chainId: number;
  
  // Connection state
  isConnected: boolean;
  isWrongNetwork: boolean;
}

export interface WalletActions {
  // Authentication
  login: () => void;
  logout: () => void;
  
  // Network management
  switchToAlfajores: () => Promise<void>;
  switchToCelo: () => Promise<void>;
  
  // Wallet operations
  refreshBalance: () => Promise<void>;
  sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
}

export type WalletContextType = WalletState & WalletActions;

// Network types
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Transaction types
export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface TransactionResponse {
  hash: string;
  wait: () => Promise<TransactionReceipt>;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: number;
}

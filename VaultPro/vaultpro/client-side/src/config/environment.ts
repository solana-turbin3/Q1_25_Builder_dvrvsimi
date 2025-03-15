import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Environment-specific configuration
export const ENV = {
  NETWORK: WalletAdapterNetwork.Devnet,
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
  EXPLORER_URL: process.env.REACT_APP_EXPLORER_URL || "https://explorer.solana.com"
};

// Feature flags
export const FEATURES = {
  ENABLE_LOGS: process.env.NODE_ENV !== "production",
  ENABLE_DEVTOOLS: process.env.NODE_ENV !== "production"
}; 
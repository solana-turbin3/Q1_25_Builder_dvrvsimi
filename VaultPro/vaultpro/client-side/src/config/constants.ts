import { PublicKey } from '@solana/web3.js';

// Program IDs and other constants
export const PROGRAM_ID = new PublicKey('7Q3LjNPGEBbXrLSyvaamCGctDnM2SpEKqY92LuM8Ec8V');

// Network constants
export const NETWORK = {
  MAINNET: "mainnet-beta",
  TESTNET: "testnet",
  DEVNET: "devnet",
  LOCALNET: "http://127.0.0.1:8899"
};

// UI constants
export const UI = {
  TOAST_DURATION: 5000,
  MAX_TRANSACTION_HISTORY: 10
};

// Other constants
export const MULTISIG_SEED = 'multisig';
export const VAULT_AUTHORITY_SEED = 'vault-authority';
export const TRANSACTION_SEED = 'transaction'; 
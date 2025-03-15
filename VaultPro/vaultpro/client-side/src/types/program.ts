import { PublicKey } from '@solana/web3.js';

// Program account types based on vaultpro.ts
export interface MultisigState {
  name: string;
  owners: PublicKey[];
  threshold: number;
  nonce: number;
  ownerSetSeqno: number;
  bump: number;
  initialized: boolean;
  vaultCount: number;
  vaults: VaultInfo[];
  defaultTimelock: number;
  roles: Role[];
  frozen: boolean;
}

export interface Transaction {
  multisig: PublicKey;
  proposer: PublicKey;
  instructionData: Uint8Array;
  approvers: PublicKey[];
  createdAt: number;
  executeAfter: number | null;
  status: TransactionStatus;
  ownerSetSeqno: number;
  bump: number;
}

export enum TransactionStatus {
  Active = 0,
  Executed = 1,
  Rejected = 2,
}

export enum RoleType {
  Admin = 0,
  Approver = 1,
  Proposer = 2,
  Executor = 3,
  Owner = 0,
  Delegate = 1
}

export interface Role {
  roleType: RoleType;
  user: PublicKey;
  canPropose: boolean;
  canApprove: boolean;
  canExecute: boolean;
  canModifyRoles: boolean;
  maxAmount: number | null;
  validUntil: number | null;
}

export interface VaultInfo {
  mint: PublicKey;
  vault: PublicKey;
}

export interface InstructionData {
  moduleId: number;
  instructionId: number;
  data: Uint8Array;
} 
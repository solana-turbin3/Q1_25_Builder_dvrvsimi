// tests/utils/instructions.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import { Vaultpro } from "../../target/types/vaultpro";

// Module identifiers
export const MODULE_TOKEN_MANAGEMENT = 0;
export const MODULE_ACCESS_CONTROL = 1;
export const MODULE_MULTISIG_MANAGEMENT = 2;
export const MODULE_TRANSACTION = 3;

// Token Management Instructions
export const TOKEN_INSTRUCTION_CREATE_VAULT = 0;
export const TOKEN_INSTRUCTION_DEPOSIT = 1;
export const TOKEN_INSTRUCTION_WITHDRAW = 2;

// Access Control Instructions
export const ACCESS_INSTRUCTION_MANAGE_OWNER = 0;
export const ACCESS_INSTRUCTION_CHANGE_THRESHOLD = 1;
export const ACCESS_INSTRUCTION_SET_ROLE = 2;

// Multisig Management Instructions
export const MULTISIG_INSTRUCTION_INITIALIZE = 0;
export const MULTISIG_INSTRUCTION_SET_TIMELOCK = 1;
export const MULTISIG_INSTRUCTION_FREEZE_VAULT = 2;

// Transaction Instructions
export const TRANSACTION_INSTRUCTION_REJECT = 0;
export const TRANSACTION_INSTRUCTION_REVOKE_APPROVAL = 1;
export const TRANSACTION_INSTRUCTION_FREEZE = 4;

// RoleType enum
export enum RoleType {
  Admin = 0,
  Approver = 1,
  Proposer = 2,
  Executor = 3,
}

// Access Control Instructions
export async function serializeManageOwnerInstruction(owner: PublicKey, isAdd: boolean): Promise<Buffer> {
  const data = {
    owner: owner,
    isAdd: isAdd,
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('ManageOwnerInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_MANAGE_OWNER]),
    serializedData,
  ]);
}

export async function serializeChangeThresholdInstruction(newThreshold: number): Promise<Buffer> {
  const data = {
    newThreshold: newThreshold,
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('ChangeThresholdInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_CHANGE_THRESHOLD]),
    serializedData,
  ]);
}

export async function serializeSetRoleInstruction(
  user: PublicKey, 
  roleType: RoleType, 
  canPropose: boolean,
  canApprove: boolean,
  canExecute: boolean,
  canModifyRoles: boolean
): Promise<Buffer> {
  const data = {
    user: user,
    roleType: roleType,
    canPropose: canPropose,
    canApprove: canApprove,
    canExecute: canExecute,
    canModifyRoles: canModifyRoles,
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('SetRoleInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_SET_ROLE]),
    serializedData,
  ]);
}

// Multisig Management Instructions
export async function serializeSetTimelockInstruction(duration: number): Promise<Buffer> {
  const data = {
    duration: new anchor.BN(duration),
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('SetTimelockInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_SET_TIMELOCK]),
    serializedData,
  ]);
}

export async function serializeFreezeVaultInstruction(freeze: boolean): Promise<Buffer> {
  const data = {
    freeze: freeze,
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('FreezeVaultInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_FREEZE_VAULT]),
    serializedData,
  ]);
}

// Token Management Instructions
export async function serializeWithdrawInstruction(
  tokenMint: PublicKey,
  recipient: PublicKey,
  amount: number
): Promise<Buffer> {
  const data = {
    tokenMint: tokenMint,
    recipient: recipient,
    amount: new anchor.BN(amount),
  };
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('WithdrawInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_TOKEN_MANAGEMENT, TOKEN_INSTRUCTION_WITHDRAW]),
    serializedData,
  ]);
}

// Transaction Instructions
export async function serializeRejectTransactionInstruction(): Promise<Buffer> {
  // No additional data for this instruction
  const data = {};
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('RejectTransactionInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_TRANSACTION, TRANSACTION_INSTRUCTION_REJECT]),
    serializedData,
  ]);
}

export async function serializeRevokeApprovalInstruction(): Promise<Buffer> {
  // No additional data for this instruction
  const data = {};
  
  const borsh = new BorshCoder(anchor.workspace.Vaultpro.idl as anchor.Idl);
  const serializedData = borsh.types.encode('RevokeApprovalInstruction', data);
  
  return Buffer.concat([
    Buffer.from([MODULE_TRANSACTION, TRANSACTION_INSTRUCTION_REVOKE_APPROVAL]),
    serializedData,
  ]);
}
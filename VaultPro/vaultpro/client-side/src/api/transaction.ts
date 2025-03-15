import { PublicKey, SystemProgram, Transaction as SolanaTransaction } from '@solana/web3.js';
import { connection } from './utils/rpc';
import { PROGRAM_ID } from '../config/constants';
import { findTransactionPda } from '../utils/pda';
import { Transaction, InstructionData } from '../types/program';

/**
 * Create a new transaction
 */
export async function createTransaction(
  wallet: any,
  multisigPda: PublicKey,
  nonce: number,
  instructionData: Uint8Array,
  timelock: number | null
): Promise<PublicKey> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Find transaction PDA
  const [transactionPda] = findTransactionPda(new PublicKey(PROGRAM_ID), multisigPda, nonce);

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: true },
      { pubkey: transactionPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([
      227, 193, 53, 239, 55, 126, 112, 105, // discriminator for createTransaction
      ...serializeBytes(instructionData),
      ...serializeOptionI64(timelock)
    ])
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');

  return transactionPda;
}

/**
 * Approve a transaction
 */
export async function approveTransaction(
  wallet: any,
  multisigPda: PublicKey,
  transactionPda: PublicKey
): Promise<void> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: false },
      { pubkey: transactionPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([224, 39, 88, 181, 36, 59, 155, 122]) // discriminator for approveTransaction
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');
}

/**
 * Execute a transaction
 */
export async function executeTransaction(
  wallet: any,
  multisigPda: PublicKey,
  transactionPda: PublicKey,
  proposer: PublicKey
): Promise<void> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: false },
      { pubkey: transactionPda, isSigner: false, isWritable: true },
      { pubkey: proposer, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([231, 173, 49, 91, 235, 24, 68, 19]) // discriminator for executeTransaction
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');
}

// Helper functions for serialization
function serializeBytes(bytes: Uint8Array): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return Uint8Array.from([...len, ...bytes]);
}

function serializeOptionI64(value: number | null): Uint8Array {
  if (value === null) {
    return new Uint8Array([0]); // None
  }
  
  const buffer = new ArrayBuffer(9); // 1 byte for Some + 8 bytes for i64
  const view = new DataView(buffer);
  view.setUint8(0, 1); // Some
  view.setBigInt64(1, BigInt(value), true);
  
  return new Uint8Array(buffer);
} 
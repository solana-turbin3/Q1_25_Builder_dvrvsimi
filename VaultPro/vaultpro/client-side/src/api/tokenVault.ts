import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction as SolanaTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { connection } from './utils/rpc';
import { PROGRAM_ID } from '../config/constants';
import { findVaultPda, findVaultAuthorityPda } from '../utils/pda';

/**
 * Create a token vault
 */
export async function createTokenVault(
  wallet: any,
  multisigPda: PublicKey,
  mint: PublicKey
): Promise<PublicKey> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Find PDAs
  const [vaultAuthorityPda] = findVaultAuthorityPda(new PublicKey(PROGRAM_ID), multisigPda);
  const [tokenVaultPda] = findVaultPda(new PublicKey(PROGRAM_ID), multisigPda, mint);

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: true },
      { pubkey: tokenVaultPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: vaultAuthorityPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([161, 29, 12, 45, 127, 88, 61, 49]) // discriminator for createTokenVault
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');

  return tokenVaultPda;
}

/**
 * Deposit tokens to a vault
 */
export async function deposit(
  wallet: any,
  multisigPda: PublicKey,
  tokenVault: PublicKey,
  depositorTokenAccount: PublicKey,
  tokenMint: PublicKey,
  amount: bigint
): Promise<void> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: true },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([
      242, 35, 198, 137, 82, 225, 242, 182, // discriminator for deposit
      ...serializeU64(amount)
    ])
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');
}

// Helper function for serialization
function serializeU64(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, value, true);
  return new Uint8Array(buffer);
} 
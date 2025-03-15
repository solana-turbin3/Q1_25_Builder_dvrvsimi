import { PublicKey } from '@solana/web3.js';
import * as buffer from 'buffer';

/**
 * Find the multisig PDA
 */
export function findMultisigPda(programId: PublicKey, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('multisig'),
      Buffer.from(name)
    ],
    programId
  );
}

/**
 * Find the vault authority PDA
 */
export function findVaultAuthorityPda(programId: PublicKey, multisigPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('authority'),
      multisigPda.toBuffer()
    ],
    programId
  );
}

/**
 * Find the transaction PDA
 */
export function findTransactionPda(programId: PublicKey, multisigPda: PublicKey, nonce: number): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(1);
  nonceBuffer.writeUInt8(nonce);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('transaction'),
      multisigPda.toBuffer(),
      nonceBuffer
    ],
    programId
  );
}

/**
 * Find the vault PDA
 */
export function findVaultPda(programId: PublicKey, multisigPda: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      multisigPda.toBuffer(),
      mint.toBuffer()
    ],
    programId
  );
} 
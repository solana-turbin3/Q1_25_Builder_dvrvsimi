// tests/utils/pda.ts
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

/**
 * Find the multisig PDA
 */
export function findMultisigPda(programId: PublicKey, name: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("multisig"), Buffer.from(name)],
    programId
  );
}

/**
 * Find the vault authority PDA
 */
export function findVaultAuthorityPda(programId: PublicKey, multisigPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), multisigPda.toBuffer()],
    programId
  );
}

/**
 * Find the vault PDA
 */
export function findVaultPda(
  programId: PublicKey, 
  multisigPda: PublicKey, 
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), multisigPda.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

/**
 * Find the transaction PDA
 */
export function findTransactionPda(
  programId: PublicKey, 
  multisigPda: PublicKey,
  nonce: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("transaction"),
      multisigPda.toBuffer(),
      new Uint8Array([nonce]),
    ],
    programId
  );
}
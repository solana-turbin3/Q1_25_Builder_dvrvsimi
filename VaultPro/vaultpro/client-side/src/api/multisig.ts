import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction as SolanaTransaction } from '@solana/web3.js';
import { connection } from './utils/rpc';
import { PROGRAM_ID } from '../config/constants';
import { findMultisigPda, findVaultAuthorityPda, findTransactionPda } from '../utils/pda';
import { MultisigState } from '../types/program';

/**
 * Initialize a new multisig
 */
export async function initializeMultisig(
  wallet: any,
  name: string,
  owners: PublicKey[],
  threshold: number
): Promise<{ multisigPda: PublicKey, vaultAuthorityPda: PublicKey }> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  // Find PDAs
  const [multisigPda] = findMultisigPda(new PublicKey(PROGRAM_ID), name);
  const [vaultAuthorityPda] = findVaultAuthorityPda(new PublicKey(PROGRAM_ID), multisigPda);

  // Create instruction
  const instruction = {
    programId: new PublicKey(PROGRAM_ID),
    keys: [
      { pubkey: multisigPda, isSigner: false, isWritable: true },
      { pubkey: vaultAuthorityPda, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([
      220, 130, 117, 21, 27, 227, 78, 213, // discriminator for initializeMultisig
      ...serializeString(name),
      ...serializePublicKeyArray(owners),
      threshold
    ])
  };

  // Create and send transaction
  const transaction = new SolanaTransaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');

  return { multisigPda, vaultAuthorityPda };
}

/**
 * Fetch a multisig account
 */
export async function fetchMultisig(multisigPda: PublicKey): Promise<MultisigState> {
  try {
    const accountInfo = await connection.getAccountInfo(multisigPda);
    if (!accountInfo) throw new Error('Multisig account not found');
    
    // In a real implementation, you would properly decode the account data
    // This is a placeholder that returns mock data
    console.log("Account data received:", accountInfo.data);
    
    // Return placeholder for now
    return {
      name: 'Multisig',
      owners: [],
      threshold: 2,
      nonce: 0,
      ownerSetSeqno: 0,
      bump: 0,
      initialized: true,
      vaultCount: 0,
      vaults: [],
      defaultTimelock: 0,
      roles: [],
      frozen: false
    };
  } catch (error) {
    console.error("Error fetching multisig:", error);
    throw new Error(`Failed to fetch multisig: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper functions for serialization
function serializeString(str: string): Uint8Array {
  const bytes = new TextEncoder().encode(str);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return Uint8Array.from([...len, ...bytes]);
}

function serializePublicKeyArray(keys: PublicKey[]): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, keys.length, true);
  
  const serialized = keys.map(key => key.toBytes()).flat();
  return Uint8Array.from([...len, ...serialized]);
} 
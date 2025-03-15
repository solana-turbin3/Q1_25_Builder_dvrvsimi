import { useState } from 'react';
import { PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '../config/constants';
import { ENV } from '../config/environment';

// Create a connection to use
const connection = new Connection(
  ENV.RPC_ENDPOINT || 'https://api.devnet.solana.com',
  'confirmed'
);

export function useMultisig(multisigPda: PublicKey | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMultisig = async (wallet: any, name: string, owners: PublicKey[], threshold: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if wallet is connected
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      
      const publicKey = wallet.publicKey;
      console.log("Using wallet:", publicKey.toString());
      
      // Find the PDA for the multisig account
      const [multisigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("multisig"), Buffer.from(name)],
        PROGRAM_ID
      );
      
      // Find the vault authority PDA
      const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), multisigPda.toBuffer()],
        PROGRAM_ID
      );
      
      console.log("Multisig PDA:", multisigPda.toString());
      console.log("Vault Authority PDA:", vaultAuthorityPda.toString());
      
      // Create the transaction
      const transaction = new Transaction();
      
      // Create data buffer for the instruction
      // Using the correct discriminator from the IDL
      const discriminator = Buffer.from([220, 130, 117, 21, 27, 227, 78, 213]); // initialize_multisig discriminator
      
      // Serialize the name as a string (4-byte length prefix + bytes)
      const nameBuffer = Buffer.from(name);
      const nameLength = Buffer.alloc(4);
      nameLength.writeUInt32LE(nameBuffer.length, 0);
      
      // Serialize the owners array (4-byte length prefix + pubkeys)
      const ownersLength = Buffer.alloc(4);
      ownersLength.writeUInt32LE(owners.length, 0);
      
      // Combine all parts into the instruction data
      const instructionData = Buffer.concat([
        discriminator,
        nameLength,
        nameBuffer,
        ownersLength,
        Buffer.concat(owners.map(owner => owner.toBuffer())),
        Buffer.from([threshold]) // threshold as a single byte
      ]);
      
      // Add instruction to create multisig
      transaction.add({
        keys: [
          { pubkey: multisigPda, isSigner: false, isWritable: true },
          { pubkey: vaultAuthorityPda, isSigner: false, isWritable: false },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
      
      // Get a recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log("Transaction created, sending...");
      
      // Sign and send the transaction
      const signature = await wallet.sendTransaction(transaction, connection);
      
      console.log("Transaction sent:", signature);
      await connection.confirmTransaction(signature, 'confirmed');
      
      return multisigPda;
    } catch (err) {
      console.error("Error in createMultisig:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createMultisig,
    loading,
    error
  };
} 
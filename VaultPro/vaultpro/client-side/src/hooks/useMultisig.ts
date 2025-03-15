import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { fetchMultisig, initializeMultisig } from '../api/multisig';
import { MultisigState } from '../types/program';
import { useWalletContext } from '../contexts/WalletContext';

export function useMultisig(multisigPda: PublicKey | null) {
  const [multisig, setMultisig] = useState<MultisigState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const wallet = useWalletContext();

  useEffect(() => {
    if (multisigPda) {
      fetchMultisigData();
    }
  }, [multisigPda]);

  const fetchMultisigData = async () => {
    if (!multisigPda) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMultisig(multisigPda);
      setMultisig(data);
    } catch (err) {
      console.error('Error fetching multisig:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const createMultisig = useCallback(
    async (
      wallet: any,
      name: string,
      owners: PublicKey[],
      threshold: number
    ): Promise<PublicKey> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Log transaction details for debugging
        console.log("Creating multisig with:", {
          name,
          owners: owners.map(o => o.toString()),
          threshold
        });
        
        // Your transaction code here
        // ...
        
        // Return the multisig PDA
        return new PublicKey("..."); // Replace with actual PDA
      } catch (err) {
        console.error("Error in createMultisig:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { multisig, loading, error, createMultisig, fetchMultisigData };
} 
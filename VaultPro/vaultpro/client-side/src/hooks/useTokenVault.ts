import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createTokenVault, deposit } from '../api/tokenVault';

export function useTokenVault() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const createVault = async (
    wallet: any,
    multisigPda: PublicKey,
    mint: PublicKey
  ) => {
    setLoading(true);
    setError(null);
    try {
      const vaultPda = await createTokenVault(wallet, multisigPda, mint);
      return vaultPda;
    } catch (err) {
      console.error('Error creating token vault:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const depositTokens = async (
    wallet: any,
    multisigPda: PublicKey,
    tokenVault: PublicKey,
    depositorTokenAccount: PublicKey,
    tokenMint: PublicKey,
    amount: bigint
  ) => {
    setLoading(true);
    setError(null);
    try {
      await deposit(wallet, multisigPda, tokenVault, depositorTokenAccount, tokenMint, amount);
    } catch (err) {
      console.error('Error depositing tokens:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    loading, 
    error, 
    createVault, 
    depositTokens 
  };
} 
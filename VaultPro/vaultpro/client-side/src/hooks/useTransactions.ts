import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createTransaction, approveTransaction, executeTransaction } from '../api/transaction';
import { connection } from '../api/utils/rpc';

export function useTransactions() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');

  const proposeTransaction = async (
    wallet: any,
    multisigPda: PublicKey,
    nonce: number,
    instructionData: Uint8Array,
    timelock: number | null = null
  ) => {
    setLoading(true);
    setError(null);
    try {
      const transactionPda = await createTransaction(wallet, multisigPda, nonce, instructionData, timelock);
      return transactionPda;
    } catch (err) {
      console.error('Error proposing transaction:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const approve = async (
    wallet: any,
    multisigPda: PublicKey,
    transactionPda: PublicKey
  ) => {
    setLoading(true);
    setError(null);
    try {
      await approveTransaction(wallet, multisigPda, transactionPda);
    } catch (err) {
      console.error('Error approving transaction:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const execute = async (
    wallet: any,
    multisigPda: PublicKey,
    transactionPda: PublicKey,
    proposer: PublicKey
  ) => {
    setLoading(true);
    setError(null);
    setStatus('pending');
    try {
      const signature = await executeTransaction(wallet, multisigPda, transactionPda, proposer);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        setStatus('failed');
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      setStatus('confirmed');
    } catch (err) {
      setStatus('failed');
      console.error('Error executing transaction:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    loading, 
    error, 
    status,
    proposeTransaction, 
    approve, 
    execute 
  };
} 
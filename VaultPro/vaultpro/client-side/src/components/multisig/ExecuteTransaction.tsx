import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTransactions } from '../../hooks/useTransactions';

interface ExecuteTransactionProps {
  multisigPda: PublicKey;
  transactionPda: PublicKey;
  proposer: PublicKey;
}

export function ExecuteTransaction({ multisigPda, transactionPda, proposer }: ExecuteTransactionProps) {
  const wallet = useWalletContext();
  const { execute, loading, error } = useTransactions();
  
  const [success, setSuccess] = useState(false);

  const handleExecute = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      await execute(wallet, multisigPda, transactionPda, proposer);
      setSuccess(true);
    } catch (err) {
      console.error('Error executing transaction:', err);
      alert(`Error executing transaction: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="execute-transaction">
      <h2>Execute Transaction</h2>
      
      {success ? (
        <div className="success-message">
          <p>Transaction executed successfully!</p>
        </div>
      ) : (
        <div>
          <p>Transaction: {transactionPda.toString()}</p>
          <p>Proposer: {proposer.toString()}</p>
          
          <button 
            onClick={handleExecute} 
            disabled={loading || !wallet.connected}
          >
            {loading ? 'Executing...' : 'Execute Transaction'}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </div>
      )}
    </div>
  );
} 
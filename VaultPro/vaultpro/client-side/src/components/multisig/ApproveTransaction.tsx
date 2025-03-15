import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTransactions } from '../../hooks/useTransactions';

interface ApproveTransactionProps {
  multisigPda: PublicKey;
  transactionPda: PublicKey;
}

export function ApproveTransaction({ multisigPda, transactionPda }: ApproveTransactionProps) {
  const wallet = useWalletContext();
  const { approve, loading, error } = useTransactions();
  
  const [success, setSuccess] = useState(false);

  const handleApprove = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      await approve(wallet, multisigPda, transactionPda);
      setSuccess(true);
    } catch (err) {
      console.error('Error approving transaction:', err);
      alert(`Error approving transaction: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="approve-transaction">
      <h2>Approve Transaction</h2>
      
      {success ? (
        <div className="success-message">
          <p>Transaction approved successfully!</p>
        </div>
      ) : (
        <div>
          <p>Transaction: {transactionPda.toString()}</p>
          
          <button 
            onClick={handleApprove} 
            disabled={loading || !wallet.connected}
          >
            {loading ? 'Approving...' : 'Approve Transaction'}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </div>
      )}
    </div>
  );
} 
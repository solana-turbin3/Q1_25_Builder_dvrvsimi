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
    <div className="approve-transaction card-container">
      <div className="card-header">
        <h2>Approve Transaction</h2>
        <div className="card-subtitle">Sign off on a pending transaction</div>
      </div>
      
      {success ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Transaction Approved!</h3>
          <p>You have successfully approved this transaction.</p>
          <button 
            className="primary-button"
            onClick={() => setSuccess(false)}
          >
            Approve Another Transaction
          </button>
        </div>
      ) : (
        <div className="animated-form">
          <div className="transaction-info-box">
            <div className="transaction-info-item">
              <span>Transaction:</span>
              <span className="address">{transactionPda.toString().slice(0, 4)}...{transactionPda.toString().slice(-4)}</span>
            </div>
            <div className="transaction-info-item">
              <span>Multisig:</span>
              <span className="address">{multisigPda.toString().slice(0, 4)}...{multisigPda.toString().slice(-4)}</span>
            </div>
          </div>
          
          <p className="info-text">
            By approving this transaction, you are confirming that you have reviewed the transaction details and agree to its execution.
          </p>
          
          <button 
            onClick={handleApprove} 
            className="primary-button"
            disabled={loading || !wallet.connected}
          >
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span> Approving...
              </span>
            ) : (
              'Approve Transaction'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </div>
      )}
    </div>
  );
} 
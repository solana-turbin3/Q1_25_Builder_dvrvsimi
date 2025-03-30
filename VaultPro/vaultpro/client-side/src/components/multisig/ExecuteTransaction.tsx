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
  const { execute, loading, error, status } = useTransactions();
  
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
    <div className="execute-transaction card-container">
      <div className="card-header">
        <h2>Execute Transaction</h2>
        <div className="card-subtitle">Finalize an approved transaction</div>
      </div>
      
      {success ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Transaction Executed!</h3>
          <p>The transaction has been successfully executed on the blockchain.</p>
          <button 
            className="primary-button"
            onClick={() => setSuccess(false)}
          >
            Execute Another Transaction
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
            <div className="transaction-info-item">
              <span>Proposer:</span>
              <span className="address">{proposer.toString().slice(0, 4)}...{proposer.toString().slice(-4)}</span>
            </div>
            {status !== 'idle' && (
              <div className="transaction-info-item">
                <span>Status:</span>
                <span className={`transaction-status status-${status}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            )}
          </div>
          
          <p className="info-text">
            Executing this transaction will finalize it on the blockchain. Make sure it has received the required number of approvals.
          </p>
          
          <button 
            onClick={handleExecute} 
            className="primary-button"
            disabled={loading || !wallet.connected}
          >
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span> Executing...
              </span>
            ) : (
              'Execute Transaction'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </div>
      )}
    </div>
  );
} 
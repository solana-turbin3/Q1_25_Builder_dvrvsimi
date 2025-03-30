import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTransactions } from '../../hooks/useTransactions';
import { InstructionData } from '../../types/program';

interface CreateTransactionProps {
  multisigPda: PublicKey;
  nonce: number;
}

export function CreateTransaction({ multisigPda, nonce }: CreateTransactionProps) {
  const wallet = useWalletContext();
  const { proposeTransaction, loading, error } = useTransactions();
  
  const [moduleId, setModuleId] = useState(0);
  const [instructionId, setInstructionId] = useState(0);
  const [data, setData] = useState('');
  const [timelock, setTimelock] = useState('');
  const [success, setSuccess] = useState(false);
  const [transactionPda, setTransactionPda] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Parse data as hex string
      const dataBytes = data ? Buffer.from(data.replace(/0x/i, ''), 'hex') : Buffer.alloc(0);
      
      // Create instruction data - ensure proper format based on IDL
      const instructionData = new Uint8Array([
        moduleId, 
        instructionId,
        ...new Uint8Array(dataBytes)
      ]);
      
      // Parse timelock if provided
      const timelockValue = timelock ? parseInt(timelock) : null;
      
      // Create transaction
      const txPda = await proposeTransaction(
        wallet,
        multisigPda,
        nonce,
        instructionData,
        timelockValue
      );
      
      setTransactionPda(txPda.toString());
      setSuccess(true);
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert(`Error creating transaction: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getModuleDescription = (id: number) => {
    switch(id) {
      case 0: return "Manage owners, threshold, and roles";
      case 1: return "Manage token vaults and transfers";
      case 2: return "Manage transaction settings";
      default: return "";
    }
  };

  return (
    <div className="create-transaction card-container">
      <div className="card-header">
        <h2>Create Transaction</h2>
        <div className="card-subtitle">Propose a new transaction for approval</div>
      </div>
      
      {success && transactionPda ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Transaction Created Successfully!</h3>
          <p>Transaction Address:</p>
          <div className="transaction-address">{transactionPda}</div>
          <p className="info-text">Share this address with other signers for approval.</p>
          <button 
            className="primary-button"
            onClick={() => {
              setSuccess(false);
              setTransactionPda(null);
            }}
          >
            Create Another Transaction
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animated-form">
          <div className="form-group">
            <label htmlFor="moduleId">Module:</label>
            <select
              id="moduleId"
              value={moduleId}
              onChange={(e) => setModuleId(parseInt(e.target.value))}
              required
              className="animated-input"
            >
              <option value={0}>Access Control (0)</option>
              <option value={1}>Token Management (1)</option>
              <option value={2}>Transaction Management (2)</option>
            </select>
            <small className="module-description">{getModuleDescription(moduleId)}</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="instructionId">Instruction ID:</label>
            <input
              type="number"
              id="instructionId"
              value={instructionId}
              onChange={(e) => setInstructionId(parseInt(e.target.value))}
              min={0}
              required
              className="animated-input"
            />
            <small>Specific operation to perform within the selected module</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="data">Instruction Data (hex):</label>
            <input
              type="text"
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Optional: 0x..."
              className="animated-input"
            />
            <small>Additional parameters for the instruction (hexadecimal format)</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="timelock">Timelock (seconds from now):</label>
            <input
              type="number"
              id="timelock"
              value={timelock}
              onChange={(e) => setTimelock(e.target.value)}
              placeholder="Optional: delay execution"
              min={0}
              className="animated-input"
            />
            <small>Time delay before transaction can be executed (0 for immediate)</small>
          </div>
          
          <div className="transaction-info-box">
            <div className="transaction-info-item">
              <span>Multisig:</span>
              <span className="address">{multisigPda.toString().slice(0, 4)}...{multisigPda.toString().slice(-4)}</span>
            </div>
            <div className="transaction-info-item">
              <span>Nonce:</span>
              <span>{nonce}</span>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading || !wallet.connected}
          >
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span> Creating...
              </span>
            ) : (
              'Create Transaction'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
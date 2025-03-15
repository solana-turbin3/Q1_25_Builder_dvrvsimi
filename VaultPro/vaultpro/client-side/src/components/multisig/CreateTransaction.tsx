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

  return (
    <div className="create-transaction">
      <h2>Create Transaction</h2>
      
      {success && transactionPda ? (
        <div className="success-message">
          <p>Transaction created successfully!</p>
          <p>Transaction Address: {transactionPda}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="moduleId">Module ID:</label>
            <select
              id="moduleId"
              value={moduleId}
              onChange={(e) => setModuleId(parseInt(e.target.value))}
              required
            >
              <option value={0}>Access Control (0)</option>
              <option value={1}>Token Management (1)</option>
              <option value={2}>Transaction Management (2)</option>
            </select>
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
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="data">Instruction Data (hex):</label>
            <input
              type="text"
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Optional: 0x..."
            />
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
            />
          </div>
          
          <button type="submit" disabled={loading || !wallet.connected}>
            {loading ? 'Creating...' : 'Create Transaction'}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
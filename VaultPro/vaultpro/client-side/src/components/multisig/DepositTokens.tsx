import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTokenVault } from '../../hooks/useTokenVault';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { connection } from '../../api/utils/rpc';

interface DepositTokensProps {
  multisigPda: PublicKey;
  tokenVault: PublicKey;
  tokenMint: PublicKey;
}

export function DepositTokens({ multisigPda, tokenVault, tokenMint }: DepositTokensProps) {
  const wallet = useWalletContext();
  const { depositTokens, loading, error } = useTokenVault();
  
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);
  const [decimals, setDecimals] = useState(6);

  const fetchTokenDecimals = async () => {
    try {
      const info = await connection.getTokenSupply(tokenMint);
      setDecimals(info.value.decimals);
    } catch (err) {
      console.error("Error fetching token decimals:", err);
      setDecimals(6);
    }
  };

  useEffect(() => {
    if (tokenMint) {
      fetchTokenDecimals();
    }
  }, [tokenMint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Convert amount to lamports using the correct decimals
      const multiplier = Math.pow(10, decimals);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * multiplier));
      
      // Get the user's associated token account
      const depositorTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );
      
      // Deposit tokens
      await depositTokens(
        wallet,
        multisigPda,
        tokenVault,
        depositorTokenAccount,
        tokenMint,
        amountBigInt
      );
      
      setSuccess(true);
    } catch (err) {
      console.error('Error depositing tokens:', err);
      alert(`Error depositing tokens: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="deposit-tokens">
      <h2>Deposit Tokens</h2>
      
      {success ? (
        <div className="success-message">
          <p>Tokens deposited successfully!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount:</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to deposit"
              step="0.000001"
              min="0"
              required
            />
          </div>
          
          <button type="submit" disabled={loading || !wallet.connected}>
            {loading ? 'Depositing...' : 'Deposit Tokens'}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
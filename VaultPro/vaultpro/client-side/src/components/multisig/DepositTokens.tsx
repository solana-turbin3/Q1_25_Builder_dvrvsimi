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
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTokenInfo = async () => {
    try {
      setIsLoading(true);
      // Get token decimals
      const info = await connection.getTokenSupply(tokenMint);
      setDecimals(info.value.decimals);
      
      // Get user's token balance if wallet is connected
      if (wallet.publicKey) {
        const tokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          wallet.publicKey
        );
        
        try {
          const balance = await connection.getTokenAccountBalance(tokenAccount);
          setTokenBalance(Number(balance.value.uiAmount));
        } catch (err) {
          console.log("Token account might not exist yet");
          setTokenBalance(0);
        }
      }
    } catch (err) {
      console.error("Error fetching token info:", err);
      setDecimals(6);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tokenMint) {
      fetchTokenInfo();
    }
  }, [tokenMint, wallet.publicKey]);

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
      
      // Refresh token balance after deposit
      fetchTokenInfo();
    } catch (err) {
      console.error('Error depositing tokens:', err);
      alert(`Error depositing tokens: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleMaxAmount = () => {
    if (tokenBalance !== null) {
      setAmount(tokenBalance.toString());
    }
  };

  return (
    <div className="deposit-tokens card-container">
      <div className="card-header">
        <h2>Deposit Tokens</h2>
        <div className="card-subtitle">Send tokens to your multisig vault</div>
      </div>
      
      {success ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Tokens Deposited Successfully!</h3>
          <p>Your tokens have been transferred to the multisig vault.</p>
          <button 
            className="primary-button"
            onClick={() => setSuccess(false)}
          >
            Make Another Deposit
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animated-form">
          <div className="form-group">
            <label htmlFor="amount">Amount to Deposit:</label>
            <div className="input-with-button">
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                step="0.000001"
                min="0"
                required
                className="animated-input"
              />
              <button 
                type="button" 
                className="max-button"
                onClick={handleMaxAmount}
                disabled={tokenBalance === null}
              >
                MAX
              </button>
            </div>
            {tokenBalance !== null && (
              <small className="balance-info">
                Available: {tokenBalance.toLocaleString()} tokens
              </small>
            )}
          </div>
          
          <div className="token-info-box">
            <div className="token-info-item">
              <span>Token Mint:</span>
              <span className="token-address">{tokenMint.toString().slice(0, 4)}...{tokenMint.toString().slice(-4)}</span>
            </div>
            <div className="token-info-item">
              <span>Vault Address:</span>
              <span className="token-address">{tokenVault.toString().slice(0, 4)}...{tokenVault.toString().slice(-4)}</span>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading || !wallet.connected || isLoading}
          >
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span> Depositing...
              </span>
            ) : (
              'Deposit Tokens'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
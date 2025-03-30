import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTokenVault } from '../../hooks/useTokenVault';

interface CreateTokenVaultProps {
  multisigPda: PublicKey;
}

export function CreateTokenVault({ multisigPda }: CreateTokenVaultProps) {
  const wallet = useWalletContext();
  const { createVault: createTokenVault, loading, error } = useTokenVault();
  
  const [tokenMint, setTokenMint] = useState('');
  const [success, setSuccess] = useState(false);
  const [vaultPda, setVaultPda] = useState<string | null>(null);
  const [mintPda, setMintPda] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Validate token mint
      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(tokenMint);
      } catch (err) {
        throw new Error('Invalid token mint address');
      }
      
      // Create token vault
      const { vault, mint } = await createTokenVault(wallet, multisigPda, mintPubkey);
      setVaultPda(vault.toString());
      setMintPda(mint.toString());
      setSuccess(true);
    } catch (err) {
      console.error('Error creating token vault:', err);
      alert(`Error creating token vault: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="create-token-vault card-container">
      <div className="card-header">
        <h2>Create Token Vault</h2>
        <div className="card-subtitle">Set up a new token vault for your multisig</div>
      </div>
      
      {success && vaultPda && mintPda ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Token Vault Created Successfully!</h3>
          <div className="vault-details">
            <div className="vault-detail-item">
              <span className="label">Vault Address:</span>
              <span className="value">{vaultPda}</span>
            </div>
            <div className="vault-detail-item">
              <span className="label">Token Mint:</span>
              <span className="value">{mintPda}</span>
            </div>
          </div>
          <button 
            className="primary-button"
            onClick={() => {
              setSuccess(false);
              setVaultPda(null);
              setMintPda(null);
              setTokenMint('');
            }}
          >
            Create Another Vault
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animated-form">
          <div className="form-group">
            <label htmlFor="tokenMint">Token Mint Address:</label>
            <input
              id="tokenMint"
              type="text"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              placeholder="Enter token mint address"
              required
              className="animated-input"
            />
            <small>The SPL token mint address for the vault</small>
          </div>
          
          <div className="multisig-info-box">
            <div className="multisig-info-item">
              <span>Multisig:</span>
              <span className="address">{multisigPda.toString().slice(0, 4)}...{multisigPda.toString().slice(-4)}</span>
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
              'Create Token Vault'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useTokenVault } from '../../hooks/useTokenVault';

interface CreateTokenVaultProps {
  multisigPda: PublicKey;
}

export function CreateTokenVault({ multisigPda }: CreateTokenVaultProps) {
  const wallet = useWalletContext();
  const { createVault, loading, error } = useTokenVault();
  
  const [mintAddress, setMintAddress] = useState('');
  const [success, setSuccess] = useState(false);
  const [vaultPda, setVaultPda] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Validate mint address
      const mint = new PublicKey(mintAddress);
      
      // Create the token vault
      const vault = await createVault(wallet, multisigPda, mint);
      setVaultPda(vault.toString());
      setSuccess(true);
    } catch (err) {
      console.error('Error creating token vault:', err);
      alert(`Error creating token vault: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="create-token-vault">
      <h2>Create Token Vault</h2>
      
      {success && vaultPda ? (
        <div className="success-message">
          <p>Token vault created successfully!</p>
          <p>Vault Address: {vaultPda}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="mint">Token Mint Address:</label>
            <input
              type="text"
              id="mint"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
              placeholder="Enter token mint address"
              required
            />
          </div>
          
          <button type="submit" disabled={loading || !wallet.connected}>
            {loading ? 'Creating...' : 'Create Token Vault'}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
} 
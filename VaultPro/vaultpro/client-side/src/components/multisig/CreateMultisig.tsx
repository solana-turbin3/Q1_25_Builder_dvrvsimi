import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useMultisig } from '../../hooks/useMultisig';
import ClientOnly from '../ClientOnly';

export function CreateMultisig() {
  const wallet = useWalletContext();
  const { createMultisig, loading, error } = useMultisig(null);
  
  const [name, setName] = useState('');
  const [ownersInput, setOwnersInput] = useState('');
  const [threshold, setThreshold] = useState(2);
  const [success, setSuccess] = useState(false);
  const [multisigPda, setMultisigPda] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form for new submission
  const resetForm = () => {
    setName('');
    setOwnersInput('');
    setThreshold(2);
    setSuccess(false);
    setMultisigPda(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Just proceed with the transaction - no wallet checks
    setIsSubmitting(true);
    
    try {
      // Parse owners from input (comma-separated list of public keys)
      const ownersList = ownersInput.split(',')
        .map(key => key.trim())
        .filter(key => key.length > 0)
        .map(key => {
          try {
            return new PublicKey(key);
          } catch (err) {
            throw new Error(`Invalid public key: ${key}`);
          }
        });
      
      // Add the current wallet if not already included
      if (wallet.publicKey && !ownersList.some(owner => owner.equals(wallet.publicKey))) {
        ownersList.push(wallet.publicKey);
      }
      
      // Validate threshold
      if (threshold <= 0 || threshold > ownersList.length) {
        alert(`Threshold must be between 1 and ${ownersList.length}`);
        setIsSubmitting(false);
        return;
      }
      
      // Create the multisig
      const pda = await createMultisig(wallet, name, ownersList, threshold);
      setMultisigPda(pda.toString());
      setSuccess(true);
    } catch (err) {
      console.error('Error creating multisig:', err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientOnly>
      <div className="create-multisig">
        <h2>Create New Multisig</h2>
        
        {success && multisigPda ? (
          <div className="success-message">
            <p>Multisig created successfully!</p>
            <p>Multisig Address: {multisigPda}</p>
            <button onClick={resetForm} className="secondary-button">Create Another Multisig</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Multisig Name:</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="owners">Owners (comma-separated public keys):</label>
              <textarea
                id="owners"
                value={ownersInput}
                onChange={(e) => setOwnersInput(e.target.value)}
                placeholder="Enter public keys separated by commas"
                rows={4}
              />
              <small>Your wallet will be automatically added as an owner if not included.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="threshold">Threshold:</label>
              <input
                type="number"
                id="threshold"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                min={1}
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={isSubmitting ? 'disabled' : ''}
            >
              {isSubmitting ? 'Creating...' : 'Create Multisig'}
            </button>
            
            {error && <p className="error-message">{error.message}</p>}
          </form>
        )}
      </div>
    </ClientOnly>
  );
}
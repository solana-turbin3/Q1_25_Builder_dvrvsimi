import React, { useState, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletContext } from '../../contexts/WalletContext';
import { useMultisig } from '../../hooks/useMultisig';

export function CreateMultisig() {
  const wallet = useWalletContext();
  const { createMultisig, loading, error } = useMultisig(null);
  
  const [name, setName] = useState('');
  const [owners, setOwners] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState(1);
  const [success, setSuccess] = useState(false);
  const [multisigPda, setMultisigPda] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddOwner = () => {
    setOwners([...owners, '']);
    // Keep threshold valid when adding owners
    if (threshold > owners.length) {
      setThreshold(owners.length + 1);
    }
  };

  const handleRemoveOwner = (index: number) => {
    if (owners.length > 1) {
      const newOwners = [...owners];
      newOwners.splice(index, 1);
      setOwners(newOwners);
      
      // Adjust threshold if needed
      if (threshold > newOwners.length) {
        setThreshold(newOwners.length);
      }
    }
  };

  const handleOwnerChange = (index: number, value: string) => {
    const newOwners = [...owners];
    newOwners[index] = value;
    setOwners(newOwners);
  };

  const handleCopyAddress = () => {
    if (multisigPda) {
      navigator.clipboard.writeText(multisigPda);
      setCopied(true);
      
      // Clear previous timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Reset copied state after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setMultisigPda(null);
    setName('');
    setOwners(['']);
    setThreshold(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Validate owners
      const validOwners = owners.filter(owner => owner.trim() !== '');
      if (validOwners.length === 0) {
        throw new Error('At least one owner is required');
      }
      
      // Convert owner strings to PublicKeys
      const ownerPubkeys = validOwners.map(owner => {
        try {
          return new PublicKey(owner);
        } catch (err) {
          throw new Error(`Invalid public key: ${owner}`);
        }
      });
      
      // Create multisig
      const pda = await createMultisig(wallet, name, ownerPubkeys, threshold);
      setMultisigPda(pda.toString());
      setSuccess(true);
    } catch (err) {
      console.error('Error creating multisig:', err);
      alert(`Error creating multisig: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="create-multisig card-container">
      <div className="card-header">
        <h2>Create Multisig</h2>
        <div className="card-subtitle">Set up a new multisig wallet</div>
      </div>
      
      {success && multisigPda ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Multisig Created Successfully!</h3>
          <p>Your multisig address:</p>
          <div className="multisig-address">{multisigPda}</div>
          
          <div className="success-actions">
            <button 
              className="action-button copy-button"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <>
                  <span className="action-icon">✓</span>
                  Copied!
                </>
              ) : (
                <>
                  <span className="action-icon">📋</span>
                  Copy Address
                </>
              )}
            </button>
            
            <button 
              className="action-button close-button"
              onClick={handleClose}
            >
              <span className="action-icon">✖</span>
              Close
            </button>
          </div>
          
          <button 
            className="primary-button"
            onClick={() => {
              setSuccess(false);
              setMultisigPda(null);
              setName('');
              setOwners(['']);
              setThreshold(1);
            }}
          >
            Create Another Multisig
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animated-form">
          <div className="form-group">
            <label htmlFor="name">Multisig Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your multisig"
              required
              className="animated-input"
            />
            <small>A unique identifier for your multisig wallet</small>
          </div>
          
          <div className="form-group">
            <label>Owners:</label>
            {owners.map((owner, index) => (
              <div key={index} className="owner-input-container">
                <div className="owner-input-group">
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => handleOwnerChange(index, e.target.value)}
                    placeholder={`Owner ${index + 1} public key`}
                    className="animated-input"
                  />
                  <button 
                    type="button" 
                    className="remove-button"
                    onClick={() => handleRemoveOwner(index)}
                    disabled={owners.length <= 1}
                  >
                    ✕
                  </button>
                </div>
                {index === 0 && wallet.publicKey && (
                  <button 
                    type="button" 
                    className="use-wallet-button"
                    onClick={() => handleOwnerChange(0, wallet.publicKey!.toString())}
                  >
                    Use My Wallet
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              className="add-button"
              onClick={handleAddOwner}
            >
              + Add Owner
            </button>
          </div>
          
          <div className="form-group">
            <label htmlFor="threshold">Approval Threshold:</label>
            <div className="threshold-container">
              <div className="threshold-dots">
                {Array.from({ length: owners.length }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`threshold-dot ${i < threshold ? 'active' : ''}`}
                    onClick={() => setThreshold(i + 1)}
                    aria-label={`Set threshold to ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="threshold-text">
                <span className="threshold-number">{threshold}</span> of {owners.length} required
              </div>
              <div className="threshold-description">
                {threshold === 1 && owners.length > 1 ? (
                  <span className="threshold-warning">⚠️ Any single owner can approve transactions</span>
                ) : threshold === owners.length ? (
                  <span>All owners must approve each transaction</span>
                ) : (
                  <span>At least {threshold} owners must approve each transaction</span>
                )}
              </div>
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
              'Create Multisig'
            )}
          </button>
          
          {error && <p className="error-message">{error.message}</p>}
        </form>
      )}
    </div>
  );
}
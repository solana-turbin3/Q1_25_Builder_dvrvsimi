import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useMultisig } from '../../hooks/useMultisig';
import { MultisigState } from '../../types/program';

interface MultisigDetailsProps {
  multisigPda: PublicKey;
}

export function MultisigDetails({ multisigPda }: MultisigDetailsProps) {
  const { multisig, loading, error } = useMultisig(multisigPda);
  
  if (loading) {
    return <div className="loading">Loading multisig details...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error.message}</div>;
  }
  
  if (!multisig) {
    return <div className="error-message">Multisig not found</div>;
  }
  
  return (
    <div className="multisig-details">
      <h2>Multisig Details</h2>
      
      <div className="detail-item">
        <span className="label">Name:</span>
        <span className="value">{multisig.name}</span>
      </div>
      
      <div className="detail-item">
        <span className="label">Threshold:</span>
        <span className="value">{multisig.threshold} of {multisig.owners.length}</span>
      </div>
      
      <div className="detail-item">
        <span className="label">Owners:</span>
        <div className="owners-list">
          {multisig.owners.map((owner, index) => (
            <div key={index} className="owner-item">
              {owner.toString()}
            </div>
          ))}
        </div>
      </div>
      
      <div className="detail-item">
        <span className="label">Vaults:</span>
        <div className="vaults-list">
          {multisig.vaults.length > 0 ? (
            multisig.vaults.map((vault, index) => (
              <div key={index} className="vault-item">
                <div>Mint: {vault.mint.toString()}</div>
                <div>Vault: {vault.vault.toString()}</div>
              </div>
            ))
          ) : (
            <div>No vaults created yet</div>
          )}
        </div>
      </div>
      
      <div className="detail-item">
        <span className="label">Default Timelock:</span>
        <span className="value">{multisig.defaultTimelock} seconds</span>
      </div>
      
      <div className="detail-item">
        <span className="label">Status:</span>
        <span className="value">{multisig.frozen ? 'Frozen' : 'Active'}</span>
      </div>
    </div>
  );
} 
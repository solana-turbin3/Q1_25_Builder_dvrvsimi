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
    return (
      <div className="multisig-details card-container">
        <div className="card-header">
          <h2>Multisig Details</h2>
          <div className="card-subtitle">View multisig configuration and status</div>
        </div>
        <div className="animated-form">
          <div className="loading-state">
            <div className="spinner large-spinner"></div>
            <p>Loading multisig details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="multisig-details card-container">
        <div className="card-header">
          <h2>Multisig Details</h2>
          <div className="card-subtitle">View multisig configuration and status</div>
        </div>
        <div className="animated-form">
          <div className="error-message">{error.message}</div>
        </div>
      </div>
    );
  }
  
  if (!multisig) {
    return (
      <div className="multisig-details card-container">
        <div className="card-header">
          <h2>Multisig Details</h2>
          <div className="card-subtitle">View multisig configuration and status</div>
        </div>
        <div className="animated-form">
          <div className="error-message">Multisig not found</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="multisig-details card-container">
      <div className="card-header">
        <h2>Multisig Details</h2>
        <div className="card-subtitle">View multisig configuration and status</div>
      </div>
      
      <div className="animated-form">
        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-icon">📋</div>
            <h3 className="detail-card-title">Basic Information</h3>
          </div>
          <div className="detail-item">
            <span className="label">Name:</span>
            <span className="value">{multisig.name}</span>
          </div>
          <div className="detail-item">
            <span className="label">Address:</span>
            <span className="value address">{multisigPda.toString()}</span>
          </div>
          <div className="detail-item">
            <span className="label">Threshold:</span>
            <span className="value">{multisig.threshold} of {multisig.owners.length}</span>
          </div>
          <div className="detail-item">
            <span className="label">Status:</span>
            <span className={`value status-badge ${multisig.frozen ? 'status-frozen' : 'status-active'}`}>
              {multisig.frozen ? 'Frozen' : 'Active'}
            </span>
          </div>
        </div>
        
        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-icon">👥</div>
            <h3 className="detail-card-title">Owners</h3>
          </div>
          <div className="owners-list">
            {multisig.owners.map((owner, index) => (
              <div key={index} className="owner-item">
                <span className="owner-number">{index + 1}</span>
                <span className="owner-address">{owner.toString()}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-icon">🏦</div>
            <h3 className="detail-card-title">Vaults</h3>
          </div>
          {multisig.vaults.length > 0 ? (
            <div className="vaults-list">
              {multisig.vaults.map((vault, index) => (
                <div key={index} className="vault-item">
                  <div className="vault-info">
                    <span className="vault-label">Mint:</span>
                    <span className="vault-value">{vault.mint.toString()}</span>
                  </div>
                  <div className="vault-info">
                    <span className="vault-label">Vault:</span>
                    <span className="vault-value">{vault.vault.toString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No vaults created yet</p>
              <p className="empty-state-hint">Create a token vault to store and manage tokens</p>
            </div>
          )}
        </div>
        
        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-card-icon">⚙️</div>
            <h3 className="detail-card-title">Settings</h3>
          </div>
          <div className="detail-item">
            <span className="label">Default Timelock:</span>
            <span className="value">{multisig.defaultTimelock} seconds</span>
          </div>
          <div className="detail-item">
            <span className="label">Owner Set Sequence:</span>
            <span className="value">{multisig.ownerSetSeqno}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
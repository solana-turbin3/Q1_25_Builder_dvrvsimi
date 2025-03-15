import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletContextProvider } from './contexts/WalletContext';
import { WalletConnect } from './components/wallet/WalletConnect';
import { CreateMultisig } from './components/multisig/CreateMultisig';
import { CreateTokenVault } from './components/multisig/CreateTokenVault';
import { DepositTokens } from './components/multisig/DepositTokens';
import { CreateTransaction } from './components/multisig/CreateTransaction';
import { ApproveTransaction } from './components/multisig/ApproveTransaction';
import { ExecuteTransaction } from './components/multisig/ExecuteTransaction';
import { MultisigDetails } from './components/multisig/MultisigDetails';
import ClientOnly from './components/ClientOnly';
import { WalletDebug } from './components/debug/WalletDebug';

function App() {
  const [activeTab, setActiveTab] = useState('create-multisig');
  const [multisigPda, setMultisigPda] = useState<PublicKey | null>(null);
  const [tokenVault, setTokenVault] = useState<PublicKey | null>(null);
  const [tokenMint, setTokenMint] = useState<PublicKey | null>(null);
  const [transactionPda, setTransactionPda] = useState<PublicKey | null>(null);
  const [proposer, setProposer] = useState<PublicKey | null>(null);
  const [nonce, setNonce] = useState(0);

  const handleMultisigInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setMultisigPda(new PublicKey(e.target.value));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  const handleTokenVaultInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setTokenVault(new PublicKey(e.target.value));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  const handleTokenMintInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setTokenMint(new PublicKey(e.target.value));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  const handleTransactionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setTransactionPda(new PublicKey(e.target.value));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  const handleProposerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setProposer(new PublicKey(e.target.value));
    } catch (err) {
      console.error('Invalid public key:', err);
    }
  };

  return (
    <WalletContextProvider>
      <WalletDebug />
      <div className="App">
        <header className="App-header">
          <h1>VaultPro</h1>
          <p>A secure multisig wallet for Solana</p>
          <WalletConnect />
        </header>
        
        <ClientOnly>
          <main>
            <div className="tabs">
              <button 
                className={activeTab === 'create-multisig' ? 'active' : ''} 
                onClick={() => setActiveTab('create-multisig')}
              >
                Create Multisig
              </button>
              <button 
                className={activeTab === 'create-vault' ? 'active' : ''} 
                onClick={() => setActiveTab('create-vault')}
              >
                Create Vault
              </button>
              <button 
                className={activeTab === 'deposit' ? 'active' : ''} 
                onClick={() => setActiveTab('deposit')}
              >
                Deposit Tokens
              </button>
              <button 
                className={activeTab === 'create-tx' ? 'active' : ''} 
                onClick={() => setActiveTab('create-tx')}
              >
                Create Transaction
              </button>
              <button 
                className={activeTab === 'approve-tx' ? 'active' : ''} 
                onClick={() => setActiveTab('approve-tx')}
              >
                Approve Transaction
              </button>
              <button 
                className={activeTab === 'execute-tx' ? 'active' : ''} 
                onClick={() => setActiveTab('execute-tx')}
              >
                Execute Transaction
              </button>
              <button 
                className={activeTab === 'multisig-details' ? 'active' : ''} 
                onClick={() => setActiveTab('multisig-details')}
              >
                Multisig Details
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'create-multisig' && (
                <CreateMultisig />
              )}
              
              {activeTab === 'create-vault' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  {multisigPda && (
                    <CreateTokenVault multisigPda={multisigPda} />
                  )}
                </div>
              )}
              
              {activeTab === 'deposit' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Token Vault Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter token vault address" 
                      onChange={handleTokenVaultInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Token Mint Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter token mint address" 
                      onChange={handleTokenMintInput}
                    />
                  </div>
                  
                  {multisigPda && tokenVault && tokenMint && (
                    <DepositTokens 
                      multisigPda={multisigPda} 
                      tokenVault={tokenVault} 
                      tokenMint={tokenMint} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'create-tx' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Nonce:</label>
                    <input 
                      type="number" 
                      value={nonce}
                      onChange={(e) => setNonce(parseInt(e.target.value))}
                      min={0}
                    />
                  </div>
                  
                  {multisigPda && (
                    <CreateTransaction 
                      multisigPda={multisigPda} 
                      nonce={nonce} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'approve-tx' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Transaction Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter transaction address" 
                      onChange={handleTransactionInput}
                    />
                  </div>
                  
                  {multisigPda && transactionPda && (
                    <ApproveTransaction 
                      multisigPda={multisigPda} 
                      transactionPda={transactionPda} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'execute-tx' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Transaction Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter transaction address" 
                      onChange={handleTransactionInput}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Proposer Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter proposer address" 
                      onChange={handleProposerInput}
                    />
                  </div>
                  
                  {multisigPda && transactionPda && proposer && (
                    <ExecuteTransaction 
                      multisigPda={multisigPda} 
                      transactionPda={transactionPda} 
                      proposer={proposer} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'multisig-details' && (
                <div>
                  <div className="input-group">
                    <label>Multisig Address:</label>
                    <input 
                      type="text" 
                      placeholder="Enter multisig address" 
                      onChange={handleMultisigInput}
                    />
                  </div>
                  
                  {multisigPda && (
                    <MultisigDetails multisigPda={multisigPda} />
                  )}
                </div>
              )}
            </div>
          </main>
        </ClientOnly>
      </div>
    </WalletContextProvider>
  );
}

export default App; 
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
import { Logo } from './components/brand/Logo';
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

  const handleNonceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setNonce(parseInt(e.target.value));
    } catch (err) {
      console.error('Invalid nonce:', err);
    }
  };

  return (
    <WalletContextProvider>
      <WalletDebug />
      <div className="App">
        <header className="App-header">
          <Logo />
          <h1>VaultPro</h1>
          <p>A secure multisig wallet for Solana</p>
          <WalletConnect />
        </header>
        
        <ClientOnly>
          <main>
            <nav className="app-navigation">
              <div className="nav-tabs">
                <button 
                  className={`nav-tab ${activeTab === 'create-multisig' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create-multisig')}
                >
                  <span className="tab-icon">🔐</span>
                  <span className="tab-text">Create Multisig</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'create-vault' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create-vault')}
                >
                  <span className="tab-icon">🏦</span>
                  <span className="tab-text">Create Vault</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'deposit-tokens' ? 'active' : ''}`}
                  onClick={() => setActiveTab('deposit-tokens')}
                >
                  <span className="tab-icon">💰</span>
                  <span className="tab-text">Deposit Tokens</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'create-transaction' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create-transaction')}
                >
                  <span className="tab-icon">📝</span>
                  <span className="tab-text">Create Transaction</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'approve-transaction' ? 'active' : ''}`}
                  onClick={() => setActiveTab('approve-transaction')}
                >
                  <span className="tab-icon">✅</span>
                  <span className="tab-text">Approve Transaction</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'execute-transaction' ? 'active' : ''}`}
                  onClick={() => setActiveTab('execute-transaction')}
                >
                  <span className="tab-icon">🚀</span>
                  <span className="tab-text">Execute Transaction</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'multisig-details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('multisig-details')}
                >
                  <span className="tab-icon">📊</span>
                  <span className="tab-text">Multisig Details</span>
                </button>
              </div>
            </nav>

            <div className="tab-content">
              {activeTab === 'create-multisig' && (
                <CreateMultisig />
              )}
              
              {activeTab === 'create-vault' && (
                <div>
                  {!multisigPda ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Create Token Vault</h2>
                        <div className="card-subtitle">First, enter a multisig address</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CreateTokenVault multisigPda={multisigPda} />
                  )}
                </div>
              )}
              
              {activeTab === 'deposit-tokens' && (
                <div>
                  {!multisigPda || !tokenVault || !tokenMint ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Deposit Tokens</h2>
                        <div className="card-subtitle">Enter the required addresses</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                            value={multisigPda?.toString() || ''}
                          />
                        </div>
                        <div className="form-group">
                          <label>Token Vault Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter token vault address" 
                            onChange={handleTokenVaultInput}
                            className="animated-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Token Mint Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter token mint address" 
                            onChange={handleTokenMintInput}
                            className="animated-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DepositTokens 
                      multisigPda={multisigPda} 
                      tokenVault={tokenVault} 
                      tokenMint={tokenMint} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'create-transaction' && (
                <div>
                  {!multisigPda ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Create Transaction</h2>
                        <div className="card-subtitle">Enter the required information</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Nonce:</label>
                          <input 
                            type="number" 
                            placeholder="Enter nonce" 
                            onChange={handleNonceInput}
                            className="animated-input"
                            value={nonce}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CreateTransaction multisigPda={multisigPda} nonce={nonce} />
                  )}
                </div>
              )}
              
              {activeTab === 'approve-transaction' && (
                <div>
                  {!multisigPda || !transactionPda ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Approve Transaction</h2>
                        <div className="card-subtitle">Enter the required addresses</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                            value={multisigPda?.toString() || ''}
                          />
                        </div>
                        <div className="form-group">
                          <label>Transaction Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter transaction address" 
                            onChange={handleTransactionInput}
                            className="animated-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ApproveTransaction 
                      multisigPda={multisigPda} 
                      transactionPda={transactionPda} 
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'execute-transaction' && (
                <div>
                  {!multisigPda || !transactionPda || !proposer ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Execute Transaction</h2>
                        <div className="card-subtitle">Enter the required addresses</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                            value={multisigPda?.toString() || ''}
                          />
                        </div>
                        <div className="form-group">
                          <label>Transaction Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter transaction address" 
                            onChange={handleTransactionInput}
                            className="animated-input"
                            value={transactionPda?.toString() || ''}
                          />
                        </div>
                        <div className="form-group">
                          <label>Proposer Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter proposer address" 
                            onChange={handleProposerInput}
                            className="animated-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  {!multisigPda ? (
                    <div className="input-prompt card-container">
                      <div className="card-header">
                        <h2>Multisig Details</h2>
                        <div className="card-subtitle">Enter a multisig address to view details</div>
                      </div>
                      <div className="animated-form">
                        <div className="form-group">
                          <label>Multisig Address:</label>
                          <input 
                            type="text" 
                            placeholder="Enter multisig address" 
                            onChange={handleMultisigInput}
                            className="animated-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
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
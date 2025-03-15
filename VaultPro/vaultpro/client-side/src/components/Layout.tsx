import React from 'react';
import { WalletConnect } from './wallet/WalletConnect';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">VaultPro</div>
        <nav className="main-nav">
          {/* Navigation links */}
        </nav>
        <WalletConnect />
      </header>
      <main className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        {/* Footer content */}
      </footer>
    </div>
  );
} 
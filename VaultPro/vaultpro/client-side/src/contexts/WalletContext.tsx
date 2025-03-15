import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { ENV } from '../config/environment';
import dynamic from 'next/dynamic';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletContext = createContext<any>(null);

// Create a dynamic version of the component that only renders on the client
const WalletProviderWithNoSSR = dynamic(
  () => Promise.resolve(({ children }: { children: React.ReactNode }) => {
    // Set up network
    const network = ENV.NETWORK as WalletAdapterNetwork || WalletAdapterNetwork.Devnet;
    const endpoint = ENV.RPC_ENDPOINT || clusterApiUrl(network);

    // Set up supported wallets
    const wallets = useMemo(
      () => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        // Add more wallet adapters as needed
      ],
      [network]
    );

    // Add a better error handler
    const onError = useCallback(
      (error: WalletError) => {
        console.error(error);
        alert(`Wallet error: ${error.message}`);
      },
      []
    );

    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={true} onError={onError}>
          <WalletModalProvider>
            <InnerWalletContextProvider>
              {children}
            </InnerWalletContextProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }),
  { ssr: false }
);

// Inner provider that uses the wallet hook
function InnerWalletContextProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  
  // Log wallet state changes
  useEffect(() => {
    console.log("Wallet state changed:", {
      connected: wallet.connected,
      publicKey: wallet.publicKey?.toString(),
      wallet: wallet.wallet?.adapter?.name
    });
  }, [wallet.connected, wallet.publicKey, wallet.wallet]);
  
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  return <WalletProviderWithNoSSR>{children}</WalletProviderWithNoSSR>;
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletContextProvider');
  }
  
  // Create a proxy with improved connection logic
  return new Proxy(context, {
    get: (target, prop) => {
      // For most properties, return the original value
      const value = target[prop];
      
      // Special handling for 'connected' property
      if (prop === 'connected') {
        // Consider connected if there is a publicKey present
        return !!target.publicKey;
      }
      
      return value;
    }
  });
} 
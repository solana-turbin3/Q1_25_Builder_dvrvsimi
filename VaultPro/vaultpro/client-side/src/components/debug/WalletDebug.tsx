import React, { useEffect } from 'react';
import { useWalletContext } from '../../contexts/WalletContext';

export function WalletDebug() {
  const wallet = useWalletContext();
  
  useEffect(() => {
    console.log("WalletDebug - Wallet state changed:", {
      connected: wallet.connected,
      publicKey: wallet.publicKey?.toString(),
      ready: wallet.ready,
      wallet: wallet.wallet?.name
    });
  }, [wallet.connected, wallet.publicKey, wallet.ready, wallet.wallet]);
  
  return null; // This component doesn't render anything
} 
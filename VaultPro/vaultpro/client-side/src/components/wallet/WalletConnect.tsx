import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '../../contexts/WalletContext';
import ClientOnly from '../ClientOnly';

export function WalletConnect() {
  const wallet = useWalletContext();
  
  // Add debug log
  console.log("WalletConnect rendering, connected:", !!wallet.publicKey, 
              "publicKey:", wallet.publicKey?.toString());

  return (
    <div className="wallet-connect">
      <ClientOnly>
        <WalletMultiButton />
        {wallet.connected && (
          <div className="wallet-info">
            Connected: {wallet.publicKey?.toString().slice(0, 6)}...{wallet.publicKey?.toString().slice(-4)}
          </div>
        )}
        {!wallet.connected && (
          <div className="wallet-status">
            <span className="disconnected">Wallet disconnected</span>
          </div>
        )}
      </ClientOnly>
    </div>
  );
} 
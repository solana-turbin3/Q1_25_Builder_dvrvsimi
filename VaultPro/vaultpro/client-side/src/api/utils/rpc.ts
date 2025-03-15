import { Connection } from '@solana/web3.js';
import { ENV } from '../../config/environment';

// Create a connection to the Solana cluster
export const getConnection = (): Connection => {
  const endpoint = ENV.RPC_ENDPOINT || clusterApiUrl(ENV.NETWORK as any);
  return new Connection(endpoint, 'confirmed');
};

// Default connection instance
export const connection = new Connection(ENV.RPC_ENDPOINT, 'confirmed'); 

function clusterApiUrl(arg0: any): string {
  throw new Error('Function not implemented.');
}

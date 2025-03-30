import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  Keypair, 
  Connection 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction, 
  MINT_SIZE, 
  getMinimumBalanceForRentExemptMint,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { ENV } from '../config/environment';

// Create a connection to use
const connection = new Connection(
  ENV.RPC_ENDPOINT || 'https://api.devnet.solana.com',
  'confirmed'
);

/**
 * Token creation options
 */
export interface CreateTokenOptions {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply?: number;
  mintAuthority?: PublicKey;
  freezeAuthority?: PublicKey | null;
  payer?: PublicKey;
}

/**
 * Create a new token mint
 */
export async function createMint(
  wallet: any,
  options: CreateTokenOptions
): Promise<PublicKey> {
  // Generate a new keypair for the mint
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;
  
  // Set default values
  const mintAuthority = options.mintAuthority || wallet.publicKey;
  const freezeAuthority = options.freezeAuthority === undefined ? wallet.publicKey : options.freezeAuthority;
  const payer = options.payer || wallet.publicKey;
  
  // Calculate the rent-exempt minimum balance
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the transaction
  const transaction = new Transaction();
  
  // Add instruction to create account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintPubkey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID
    })
  );
  
  // Add instruction to initialize mint
  transaction.add(
    createInitializeMintInstruction(
      mintPubkey,
      options.decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_PROGRAM_ID
    )
  );
  
  // If initial supply is specified, mint tokens to the wallet
  if (options.initialSupply && options.initialSupply > 0) {
    // Get the associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      wallet.publicKey
    );
    
    // Create the associated token account if it doesn't exist
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAccount,
        wallet.publicKey,
        mintPubkey
      )
    );
    
    // Calculate the amount based on decimals
    const amount = options.initialSupply * Math.pow(10, options.decimals);
    
    // Add instruction to mint tokens
    transaction.add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAccount,
        mintAuthority,
        BigInt(amount)
      )
    );
  }
  
  // Get a recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;
  
  // Sign the transaction with the mint keypair
  transaction.sign(mintKeypair);
  
  // Send the transaction
  const signature = await wallet.sendTransaction(transaction, connection, {
    signers: [mintKeypair]
  });
  
  // Confirm the transaction
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log(`Created new token mint: ${mintPubkey.toString()}`);
  console.log(`Token details: ${options.name} (${options.symbol}), Decimals: ${options.decimals}`);
  
  return mintPubkey;
} 
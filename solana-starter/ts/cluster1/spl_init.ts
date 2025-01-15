import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import wallet from "/home/dvrvsimi/.config/solana/id.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        // Create new token mint
        const mint = await createMint(
            connection,
            keypair,
            keypair.publicKey,
            null, 
            6, // Decimals
        );
        
        console.log(`Token mint created: ${mint.toBase58()}`);

        // Create associated token account to hold the tokens
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        );

        console.log(`Token account created: ${tokenAccount.address.toBase58()}`);

        // Mint 4,200,000 tokens
        const tokenAmount = 4_200_000 * Math.pow(10, 6);
        
        const mintTx = await mintTo(
            connection,
            keypair,
            mint,
            tokenAccount.address,
            keypair.publicKey,
            tokenAmount
        );

        console.log(`Minted ${tokenAmount} tokens to ${tokenAccount.address.toBase58()}`);
        console.log(`Mint transaction: ${mintTx}`);

    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
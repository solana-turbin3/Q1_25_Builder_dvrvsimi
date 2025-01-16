import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "/home/dvrvsimi/.config/solana/id.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("3RUzee7kVWMHDjPDLSfxMCeCkGfYA6hhvYmmJnR51d7N");

// Recipient address
const to = new PublicKey("95HRCXSxU18oh8hWXbdkqxenqCwopDGXjmhFQ9Pd2EuQ");

(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        );

        // Get the token account of the toWallet address, and if it does not exist, create it
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            to
        );

        // Transfer the new token to the "toTokenAccount" we just created
        const signature = await transfer(
            connection,
            keypair,
            fromTokenAccount.address,
            toTokenAccount.address,
            keypair.publicKey,
            1000000000 // Amount to transfer (adjust based on token decimals)
        );

        console.log('Transfer completed successfully');
        console.log('Transaction signature:', signature);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();
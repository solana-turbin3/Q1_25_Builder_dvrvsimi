import { Connection, Keypair, LAMPORTS_PER_SOL, TransactionConfirmationStrategy } from
"@solana/web3.js";
import wallet from "./dev-wallet.json";


// create a connection to the devnet cluster
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed");

(async () => {
    try {

        // We're going to claim 2 devnet SOL tokens
        const txhash = await connection.requestAirdrop(
            keypair.publicKey,
            2 * LAMPORTS_PER_SOL
        );

        // Get the latest blockhash
        const latestBlockhash = await connection.getLatestBlockhash();

        // wait for the transaction to be confirmed
        const strategy: TransactionConfirmationStrategy = {
            signature: txhash,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: await connection.getBlockHeight(),
            
        };
        await connection.confirmTransaction(strategy); // passing strategy here instead, old method deprecated
        
        console.log(`Success! Check out your TX here:
        https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})
();
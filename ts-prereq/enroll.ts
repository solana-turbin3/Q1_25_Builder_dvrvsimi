import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js"
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor"
import { IDL, Turbin3Prereq } from "./programs/Turbin3_prereq";
import wallet from "./Turbin3-wallet.json";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const connection = new Connection("https://api.devnet.solana.com");

const github = Buffer.from("dvrvsimi", "utf8");

const provider = new AnchorProvider(
    connection,
    new Wallet(keypair),
    {commitment: "confirmed"});

const program = new Program<Turbin3Prereq>(
    IDL,
    provider
);

// Create the PDA for our enrollment account
const enrollment_seeds = [Buffer.from("prereq"), keypair.publicKey.toBuffer()];
const [enrollment_key, _bump] = PublicKey.findProgramAddressSync(enrollment_seeds, program.programId);

// Execute the enrollment transaction
(async () => {
    try {
        const txhash = await program.methods
        .complete(github)
        .accounts({
        signer: keypair.publicKey,
    })
    .signers([keypair])
    .rpc();

    console.log(`Success! Check out TX here:
    https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
    }
)();
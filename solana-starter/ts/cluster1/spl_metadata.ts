import wallet from "/home/dvrvsimi/.config/solana/id.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { 
    createMetadataAccountV3, 
    CreateMetadataAccountV3InstructionAccounts, 
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args,
    findMetadataPda,
    MPL_TOKEN_METADATA_PROGRAM_ID
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { SystemProgram } from "@solana/web3.js";

// Define our Mint address
const mint = publicKey("3RUzee7kVWMHDjPDLSfxMCeCkGfYA6hhvYmmJnR51d7N")

// Create a UMI connection
const umi = createUmi('https://api.devnet.solana.com');
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

(async () => {
    try {
        // Get the metadata address
        const [metadataAddress] = findMetadataPda(umi, { mint });

        // Define the metadata account
        let accounts: CreateMetadataAccountV3InstructionAccounts = {
            mint: mint,
            metadata: metadataAddress,
            mintAuthority: signer,
            payer: signer,
            updateAuthority: keypair.publicKey,
            systemProgram: publicKey(SystemProgram.programId),
        }

        // Define the token metadata
        let data: DataV2Args = {
            name: "SARU_SOL",
            symbol: "$SARU",
            uri: "https://saru-metadata-uri.com",
            sellerFeeBasisPoints: 10,
            creators: null,
            collection: null,
            uses: null
        }

        // Define the arguments for creating metadata
        let args: CreateMetadataAccountV3InstructionArgs = {
            data,
            isMutable: true,
            collectionDetails: null,
        }

        // Create the transaction
        let tx = createMetadataAccountV3(
            umi,
            {
                ...accounts,
                ...args
            }
        )

        // Send and confirm the transaction
        let result = await tx.sendAndConfirm(umi);
        console.log("Transaction signature:", bs58.encode(result.signature));
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();

// Transaction signature: 3cLdUZgRhxo3sE83RVDXmmRhDawfctMJGxRS1vB4xQn2zMUVPpS1F85r75eEzGKwaSsGt8rj8Lfrhbyf8raz8u8M
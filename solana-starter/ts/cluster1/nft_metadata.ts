import wallet from "/home/dvrvsimi/.config/solana/id.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Create metadata object
        const metadata = {
            name: "Saru Generug NFT",
            symbol: "SRUG",
            description: "A unique generated rug design NFT",
            image: "https://devnet.irys.xyz/4an6q1ofnVMctsZk4BWzSCAzeiz8S1kAMFbEe7k1f9TR",
            attributes: [
                { trait_type: 'Pattern', value: 'Geometric' },
                { trait_type: 'Style', value: 'Modern' },
                { trait_type: 'Collection', value: 'Genesis' }
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: "https://devnet.irys.xyz/4an6q1ofnVMctsZk4BWzSCAzeiz8S1kAMFbEe7k1f9TR"
                    }
                ]
            },
            creators: [
                {
                    address: signer.publicKey,
                    share: 100
                }
            ]
        };

        // Convert metadata to generic file
        const file = createGenericFile(
            JSON.stringify(metadata),
            'metadata.json',
            {
                contentType: 'application/json',
            }
        );

        // Upload metadata
        const [myUri] = await umi.uploader.upload([file]);
        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();

// Your metadata URI:  https://devnet.irys.xyz/BmD558EcZWfD2Z5NF6CRVUdsuRMivMMHbM6sECSbiTVS
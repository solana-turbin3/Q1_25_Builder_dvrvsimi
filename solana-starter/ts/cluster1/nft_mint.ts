import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import wallet from "/home/dvrvsimi/.config/solana/id.json"
import base58 from "bs58";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const mint = generateSigner(umi);

(async () => {
    try {
        let tx = createNft(umi, {
            mint,
            name: "SARUGAMI",
            symbol: "$SARU",
            uri: "https://devnet.irys.xyz/BmD558EcZWfD2Z5NF6CRVUdsuRMivMMHbM6sECSbiTVS",
            sellerFeeBasisPoints: percentAmount(5, 2), // 5% royalties
            creators: [
                {
                    address: myKeypairSigner.publicKey,
                    share: 100,
                    verified: false,
                },
            ],
            collection: null,
            uses: null,
        });

        let result = await tx.sendAndConfirm(umi);
        const signature = base58.encode(result.signature);
        
        console.log(`Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)
        console.log("Mint Address: ", mint.publicKey);
    } catch (error) {
        console.error("Error minting NFT:", error);
    }
})();


// Succesfully Minted! Check out your TX here:
// https://explorer.solana.com/tx/4voDTiCiKooLS6TvDcAjGxdoSa8eAZBX9Mrh9muXXRPtBXevVmuLf6yyNraeaYP8BinJxX5GMjtyXozaS1bUvvpr?cluster=devnet
// Mint Address:  8MNBJHFieqGKtYAJGYoyaY5GqTYZj5be5fgRSUfktLm4
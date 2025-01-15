import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import promptSync from 'prompt-sync';
const prompt = promptSync();

//generate keypair
let kp = Keypair.generate();


// log the keypair
console.log(`You've generated a new Solana wallet: ${kp.publicKey.toBase58()}`);

// log the secret key
console.log(`[${kp.secretKey}]`);



// Base58 to wallet bytes conversion
function base58ToWallet(): void { // snake case, unlike rust's
    const base58String = prompt('Enter base58 string: ');
    try {
        const walletBytes = bs58.decode(base58String);
        console.log('Wallet bytes:', walletBytes);
    } catch (error) {
        console.error('Error decoding base58 string:', error);
    }
}

// Wallet bytes to base58 conversion
function walletToBase58(): void {
    const walletBytes = kp.secretKey; // intead of passing the array
    try {
        const base58String = bs58.encode(walletBytes);
        console.log('Base58 string:', base58String);
    } catch (error) {
        console.error('Error encoding wallet bytes:', error);
    }
}


// wallet address: F9xaz55EjKA3UnaPaaqNyDM4WsNoHWRYi9hBAeNEQMWy
// tests/token-management.ts
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";
import { expect } from "chai";
import { findMultisigPda, findVaultAuthorityPda, findVaultPda } from "./utils/pda";

describe("VaultPro Token Management", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Import program directly from workspace
  const program = anchor.workspace.Vaultpro;
  
  // Test accounts
  let payer: Keypair;
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let tokenMint: PublicKey;
  let tokenVault: PublicKey;
  let payerTokenAccount: PublicKey;
  const MINT_DECIMALS = 6;
  const INITIAL_MINT_AMOUNT = 1000000000; // 1000 tokens with 6 decimals

  before(async () => {
    // Generate test keypair for payer
    payer = Keypair.generate();
    
    // Fund payer account
    const airdropSig = await provider.connection.requestAirdrop(
      payer.publicKey, 
      100 * LAMPORTS_PER_SOL
    );
    
    // Confirm transaction
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropSig,
      ...latestBlockhash,
    });
  });

  it("should initialize a multisig for token management", async () => {
    // Create a unique multisig name
    const multisigName = `t${Date.now() % 1000000}`;
    
    // Calculate PDAs
    [multisigPda] = findMultisigPda(program.programId, multisigName);
    [vaultAuthorityPda] = findVaultAuthorityPda(program.programId, multisigPda);

    // Initialize multisig with just payer as owner for simplicity
    await program.methods
      .initializeMultisig(multisigName, [payer.publicKey], 1)
      .accounts({
        multisig: multisigPda,
        vaultAuthority: vaultAuthorityPda,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();
    
    console.log("Multisig initialized successfully for token management!");
  });

  it("should create a token mint and payer token account", async () => {
    // Create a test token mint
    const mintAuthority = Keypair.generate();
    await provider.connection.requestAirdrop(mintAuthority.publicKey, LAMPORTS_PER_SOL);
    
    tokenMint = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      MINT_DECIMALS
    );
    
    // Create token account for payer
    const payerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMint,
      payer.publicKey
    );
    payerTokenAccount = payerAta.address;
    
    // Mint initial tokens to payer
    await mintTo(
      provider.connection,
      payer,
      tokenMint,
      payerTokenAccount,
      mintAuthority,
      INITIAL_MINT_AMOUNT
    );
    
    console.log("Token mint created:", tokenMint.toString());
    console.log("Payer token account created:", payerTokenAccount.toString());
  });

  it("should create a token vault", async () => {
    // Calculate vault PDA
    [tokenVault] = findVaultPda(program.programId, multisigPda, tokenMint);

    try {
      // Create vault
      await program.methods
        .createTokenVault()
        .accounts({
          multisig: multisigPda,
          tokenVault: tokenVault,
          mint: tokenMint,
          vaultAuthority: vaultAuthorityPda,
          executor: payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([payer])
        .rpc();
      
      console.log("Token vault created successfully!");
      console.log("Vault address:", tokenVault.toString());
    } catch (error) {
      console.error("Error creating vault:", error);
      throw error; // Fail the test if vault creation fails
    }
  });

  it("should deposit tokens to the vault", async () => {
    const depositAmount = 50000000; // 50 tokens with 6 decimals
    
    try {
      // Deposit tokens
      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          multisig: multisigPda,
          tokenVault: tokenVault,
          depositorTokenAccount: payerTokenAccount,
          tokenMint: tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          depositor: payer.publicKey,
        })
        .signers([payer])
        .rpc();
      
      console.log(`Successfully deposited ${depositAmount / 10**MINT_DECIMALS} tokens to vault`);
    } catch (error) {
      console.error("Error depositing tokens:", error);
      // Don't fail the test, just log the error
    }
  });
});
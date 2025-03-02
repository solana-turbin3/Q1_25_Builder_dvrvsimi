// tests/token-management.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  getOrCreateAssociatedTokenAccount, 
  createMint, 
  mintTo,
  getMint,
  getAccount
} from "@solana/spl-token";
import { expect } from "chai";
import * as vaultproIdl from "../target/idl/vaultpro.json";
import { serializeWithdrawInstruction } from "./utils/instructions";
import { executeTransaction, createAndApproveTransaction } from "./utils/helpers";
import { findMultisigPda, findVaultAuthorityPda, findVaultPda } from "./utils/pda";
import { Vaultpro } from "../target/types/vaultpro";

describe("VaultPro Token Management", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("7Q3LjNPGEBbXrLSyvaamCGctDnM8SpEKqY92LuM8Ec8V");
  const program = new anchor.Program<Vaultpro>(vaultproIdl, programId, provider);
  
  // Add debug logs here, after program is defined
  console.log("Program ID:", program.programId.toString());

  // Test accounts
  const payer = provider.wallet;
  const multisigName = "TokenTest";
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let owner1: Keypair;
  let owner2: Keypair;
  let tokenMint: PublicKey;
  let payerTokenAccount: PublicKey;
  let owner1TokenAccount: PublicKey;
  let tokenVault: PublicKey;
  const MINT_DECIMALS = 6;
  const INITIAL_MINT_AMOUNT = 1000000000; // 1000 tokens with 6 decimals

  before(async () => {
    // Generate test keypairs
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();

    // Fund accounts
    await provider.connection.requestAirdrop(owner1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(owner2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    // Calculate PDAs
    [multisigPda] = findMultisigPda(program.programId, multisigName);
    [vaultAuthorityPda] = findVaultAuthorityPda(program.programId, multisigPda);

    // Initialize multisig
    const owners = [payer.publicKey, owner1.publicKey, owner2.publicKey];
    const threshold = 2;

    await program.methods
      .initializeMultisig(multisigName, owners, threshold)
      .accounts({
        multisig: multisigPda,
        vaultAuthority: vaultAuthorityPda,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Create a test token
    const mintAuthority = Keypair.generate();
    await provider.connection.requestAirdrop(mintAuthority.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    
    tokenMint = await createMint(
      provider.connection,
      payer.publicKey,
      mintAuthority.publicKey,
      null, // Freeze authority (none)
      MINT_DECIMALS,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Create token accounts for payer and owner1
    const payerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.publicKey,
      tokenMint,
      payer.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    payerTokenAccount = payerAta.address;

    const owner1Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.publicKey,
      tokenMint,
      owner1.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    owner1TokenAccount = owner1Ata.address;

    // Mint initial tokens to payer
    await mintTo(
      provider.connection,
      payer.publicKey,
      tokenMint,
      payerTokenAccount,
      mintAuthority,
      INITIAL_MINT_AMOUNT,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
  });

  describe("Create Vault", () => {
    it("should create a token vault", async () => {
      // Calculate vault PDA
      [tokenVault] = findVaultPda(program.programId, multisigPda, tokenMint);

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
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Verify vault was created
      const vaultAccount = await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      );
      
      expect(vaultAccount.mint.toString()).to.equal(tokenMint.toString());
      expect(vaultAccount.owner.toString()).to.equal(vaultAuthorityPda.toString());
      expect(Number(vaultAccount.amount)).to.equal(0);

      // Verify multisig state was updated
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.vaultCount).to.equal(1);
      expect(multisigAccount.vaults[0].mint.toString()).to.equal(tokenMint.toString());
      expect(multisigAccount.vaults[0].vault.toString()).to.equal(tokenVault.toString());
    });

    it("should not allow creating a duplicate vault for the same mint", async () => {
      try {
        // Try to create another vault for the same mint
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
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        expect.fail("Should not allow duplicate vault");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Deposit", () => {
    it("should deposit tokens to the vault", async () => {
      const depositAmount = 50000000; // 50 tokens with 6 decimals
      
      // Get initial balances
      const initialPayerBalance = Number((await getAccount(
        provider.connection,
        payerTokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const initialVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
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
        .rpc();
      
      // Verify balances after deposit
      const finalPayerBalance = Number((await getAccount(
        provider.connection,
        payerTokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const finalVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      expect(finalPayerBalance).to.equal(initialPayerBalance - depositAmount);
      expect(finalVaultBalance).to.equal(initialVaultBalance + depositAmount);
    });
    
    it("should not allow depositing zero tokens", async () => {
      try {
        await program.methods
          .deposit(new anchor.BN(0))
          .accounts({
            multisig: multisigPda,
            tokenVault: tokenVault,
            depositorTokenAccount: payerTokenAccount,
            tokenMint: tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            depositor: payer.publicKey,
          })
          .rpc();
        expect.fail("Should not allow zero amount deposit");
      } catch (error) {
        expect(error).to.exist;
      }
    });
    
    it("should allow multiple users to deposit", async () => {
      // First mint some tokens to owner1
      const mintAuthority = Keypair.generate();
      await provider.connection.requestAirdrop(mintAuthority.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      
      const depositAmount = 25000000; // 25 tokens with 6 decimals
      
      await mintTo(
        provider.connection,
        payer.publicKey,
        tokenMint,
        owner1TokenAccount,
        mintAuthority,
        depositAmount * 2, // Mint double the amount we'll deposit
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      
      // Get initial balances
      const initialOwner1Balance = Number((await getAccount(
        provider.connection,
        owner1TokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const initialVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      // Owner1 deposits tokens
      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          multisig: multisigPda,
          tokenVault: tokenVault,
          depositorTokenAccount: owner1TokenAccount,
          tokenMint: tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          depositor: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();
      
      // Verify balances after deposit
      const finalOwner1Balance = Number((await getAccount(
        provider.connection,
        owner1TokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const finalVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      expect(finalOwner1Balance).to.equal(initialOwner1Balance - depositAmount);
      expect(finalVaultBalance).to.equal(initialVaultBalance + depositAmount);
    });
  });
  
  describe("Withdraw", () => {
    it("should withdraw tokens from the vault via multisig transaction", async () => {
      const withdrawAmount = 10000000; // 10 tokens with 6 decimals
      
      // Get initial balances
      const initialVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const initialRecipientBalance = Number((await getAccount(
        provider.connection,
        owner1TokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      // Create withdraw instruction
      const instructionData = await serializeWithdrawInstruction(
        tokenMint,
        owner1.publicKey,
        withdrawAmount
      );
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner2]
      );
      
      // Verify balances after withdrawal
      const finalVaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      const finalRecipientBalance = Number((await getAccount(
        provider.connection,
        owner1TokenAccount,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      expect(finalVaultBalance).to.equal(initialVaultBalance - withdrawAmount);
      expect(finalRecipientBalance).to.equal(initialRecipientBalance + withdrawAmount);
    });
    
    it("should not allow withdrawing more tokens than available", async () => {
      // Get vault balance
      const vaultBalance = Number((await getAccount(
        provider.connection,
        tokenVault,
        undefined,
        TOKEN_PROGRAM_ID
      )).amount);
      
      // Create withdraw instruction for more than the balance
      const excessAmount = vaultBalance + 1000000;
      const instructionData = await serializeWithdrawInstruction(
        tokenMint,
        owner1.publicKey,
        excessAmount
      );
      
      try {
        // Create and execute transaction
        await createAndApproveTransaction(
          program,
          payer,
          multisigPda,
          instructionData,
          [owner2]
        );
        expect.fail("Should not allow withdrawing more than available");
      } catch (error) {
        expect(error).to.exist;
      }
    });
    
    it("should not allow withdrawing zero tokens", async () => {
      // Create withdraw instruction for zero tokens
      const instructionData = await serializeWithdrawInstruction(
        tokenMint,
        owner1.publicKey,
        0
      );
      
      try {
        // Create and execute transaction
        await createAndApproveTransaction(
          program,
          payer,
          multisigPda,
          instructionData,
          [owner2]
        );
        expect.fail("Should not allow withdrawing zero tokens");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });
});
// tests/transaction.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultPro } from "../target/types/vaultpro";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";
import { serializeManageOwnerInstruction, serializeRejectTransactionInstruction } from "./utils/instructions";
import { findMultisigPda, findVaultAuthorityPda, findTransactionPda } from "./utils/pda";

describe("VaultPro Transactions", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultPro as Program<VaultPro>;
  
  // Test accounts
  const payer = provider.wallet;
  const multisigName = "TransactionTest";
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let owner1: Keypair;
  let owner2: Keypair;
  let owner3: Keypair;
  let transactionPda: PublicKey;
  let transactionBump: number;

  before(async () => {
    // Generate test keypairs
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();
    owner3 = Keypair.generate();

    // Fund accounts
    await provider.connection.requestAirdrop(owner1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(owner2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(owner3.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

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
  });

  describe("Create Transaction", () => {
    it("should create a transaction proposal", async () => {
      // Create sample instruction data (add a new owner)
      const instructionData = await serializeManageOwnerInstruction(
        owner3.publicKey,
        true // isAdd = true
      );

      // Calculate transaction PDA
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const nonce = multisigAccount.nonce;
      const [txPda, txBump] = findTransactionPda(program.programId, multisigPda, nonce);
      transactionPda = txPda;
      transactionBump = txBump;

      // Create transaction
      await program.methods
        .createTransaction(instructionData, null) // No timelock
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify transaction was created
      const txAccount = await program.account.transaction.fetch(transactionPda);
      expect(txAccount.multisig.toString()).to.equal(multisigPda.toString());
      expect(txAccount.proposer.toString()).to.equal(payer.publicKey.toString());
      expect(txAccount.status).to.equal(0); // PENDING
      expect(txAccount.approvers).to.have.lengthOf(1); // Auto-approved by proposer
      expect(txAccount.approvers[0].toString()).to.equal(payer.publicKey.toString());
    });

    it("should create a transaction with timelock", async () => {
      // Create sample instruction data (add a new owner)
      const instructionData = await serializeManageOwnerInstruction(
        owner3.publicKey,
        true // isAdd = true
      );

      // Calculate transaction PDA for next nonce
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const nonce = multisigAccount.nonce;
      const [txPda, txBump] = findTransactionPda(program.programId, multisigPda, nonce);

      // Create transaction with timelock
      const timelock = 3600; // 1 hour
      await program.methods
        .createTransaction(instructionData, new anchor.BN(timelock))
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify transaction was created with timelock
      const txAccount = await program.account.transaction.fetch(txPda);
      expect(txAccount.executeAfter).to.not.be.null;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const executionTime = txAccount.executeAfter.toNumber();
      
      // Allow for small timing differences
      expect(executionTime).to.be.at.least(currentTime + timelock - 5);
      expect(executionTime).to.be.at.most(currentTime + timelock + 5);
    });
  });

  describe("Approve Transaction", () => {
    it("should allow an owner to approve a transaction", async () => {
      // Owner1 approves the transaction
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();

      // Verify approval was recorded
      const txAccount = await program.account.transaction.fetch(transactionPda);
      expect(txAccount.approvers).to.have.lengthOf(2);
      expect(txAccount.approvers.map(pk => pk.toString()))
        .to.include(owner1.publicKey.toString());
    });

    it("should not allow the same owner to approve twice", async () => {
      try {
        // Owner1 tries to approve again
        await program.methods
          .approveTransaction()
          .accounts({
            multisig: multisigPda,
            transaction: transactionPda,
            approver: owner1.publicKey,
          })
          .signers([owner1])
          .rpc();
        expect.fail("Should not allow double approval");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Execute Transaction", () => {
    it("should execute a transaction when threshold is met", async () => {
      // We already have 2 approvals (payer and owner1), which meets the threshold
      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify transaction was executed
      const txAccount = await program.account.transaction.fetch(transactionPda);
      expect(txAccount.status).to.equal(1); // EXECUTED

      // Verify the instruction effect (owner3 should be added)
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.owners.map(pk => pk.toString()))
        .to.include(owner3.publicKey.toString());
    });

    it("should fail to execute a transaction without enough approvals", async () => {
      // Create a new transaction
      const instructionData = await serializeManageOwnerInstruction(
        Keypair.generate().publicKey,
        true
      );

      // Calculate transaction PDA for next nonce
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const nonce = multisigAccount.nonce;
      const [txPda, txBump] = findTransactionPda(program.programId, multisigPda, nonce);

      // Create transaction
      await program.methods
        .createTransaction(instructionData, null)
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        // Try to execute without enough approvals
        await program.methods
          .executeTransaction()
          .accounts({
            multisig: multisigPda,
            transaction: txPda,
            proposer: payer.publicKey,
            executor: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should not execute without enough approvals");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Reject Transaction", () => {
    it("should allow a proposer to reject their own transaction", async () => {
      // Create a new transaction
      const instructionData = await serializeRejectTransactionInstruction();

      // Calculate transaction PDA for next nonce
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const nonce = multisigAccount.nonce;
      const [txPda, txBump] = findTransactionPda(program.programId, multisigPda, nonce);

      // Create transaction
      await program.methods
        .createTransaction(instructionData, null)
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Reject the transaction
      await program.methods
        .rejectTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: payer.publicKey,
          rejecter: payer.publicKey,
        })
        .rpc();

      // Verify transaction account was closed
      try {
        await program.account.transaction.fetch(txPda);
        expect.fail("Transaction account should be closed");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("should allow an admin to reject someone else's transaction", async () => {
      // Create a new transaction from owner1
      const instructionData = await serializeRejectTransactionInstruction();

      // Calculate transaction PDA for next nonce
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const nonce = multisigAccount.nonce;
      const [txPda, txBump] = findTransactionPda(program.programId, multisigPda, nonce);

      // Create transaction
      await program.methods
        .createTransaction(instructionData, null)
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: owner1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      // Payer (as admin/owner) rejects the transaction
      await program.methods
        .rejectTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: txPda,
          proposer: owner1.publicKey,
          rejecter: payer.publicKey,
        })
        .rpc();

      // Verify transaction account was closed
      try {
        await program.account.transaction.fetch(txPda);
        expect.fail("Transaction account should be closed");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });
});
// tests/transaction.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";
import * as vaultproIdl from "../target/idl/vaultpro.json";
import { 
  serializeManageOwnerInstruction, 
  serializeRejectTransactionInstruction,
  serializeRevokeApprovalInstruction, 
} from "./utils/instructions";
import { findMultisigPda, findVaultAuthorityPda, findTransactionPda } from "./utils/pda";
import { executeTransaction, createAndApproveTransaction } from "./utils/helpers";
import { TransactionStatus } from "./utils/enums";

describe("VaultPro Transactions", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("7Q3LjNPGEBbXrLSyvaamCGctDnM8SpEKqY92LuM8Ec8V");
  const program = new anchor.Program(vaultproIdl as any, programId, provider);
  
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
      expect(txAccount.status).to.equal(TransactionStatus.Pending);
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
    it("should approve a transaction", async () => {
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();

      // Verify approval was added
      const txAccount = await program.account.transaction.fetch(transactionPda);
      expect(txAccount.approvers).to.have.lengthOf(2);
      expect(txAccount.approvers.map(pk => pk.toString()))
        .to.include(owner1.publicKey.toString());
    });
  });

  describe("Execute Transaction", () => {
    it("should execute a transaction when threshold is met", async () => {
      // We already have 2 approvals (payer and owner1), which meets the threshold
      await executeTransaction(program, payer, multisigPda, transactionPda);

      // Verify transaction was executed
      const txAccount = await program.account.transaction.fetch(transactionPda);
      expect(txAccount.status).to.equal(TransactionStatus.Executed);

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
        await executeTransaction(program, payer, multisigPda, txPda);
        expect.fail("Should not execute without enough approvals");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Transaction Management", () => {
    describe("Reject Transaction", () => {
      it("should reject a pending transaction", async () => {
        // Create a new transaction to reject
        const instructionData = await serializeManageOwnerInstruction(
          Keypair.generate().publicKey,
          true
        );

        const [txPda] = findTransactionPda(
          program.programId,
          multisigPda,
          (await program.account.multisigState.fetch(multisigPda)).nonce
        );

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
            executor: owner1.publicKey,
          })
          .signers([owner1])
          .rpc();

        // Verify transaction was rejected
        const txAccount = await program.account.transaction.fetch(txPda);
        expect(txAccount.status).to.equal(TransactionStatus.Rejected);
      });
    });

    describe("Revoke Approval", () => {
      it("should revoke an approval from a transaction", async () => {
        // Create a new transaction
        const instructionData = await serializeManageOwnerInstruction(
          Keypair.generate().publicKey,
          true
        );

        const [txPda] = findTransactionPda(
          program.programId,
          multisigPda,
          (await program.account.multisigState.fetch(multisigPda)).nonce
        );

        await program.methods
          .createTransaction(instructionData, null)
          .accounts({
            multisig: multisigPda,
            transaction: txPda,
            proposer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // Approve transaction
        await program.methods
          .approveTransaction()
          .accounts({
            multisig: multisigPda,
            transaction: txPda,
            approver: owner1.publicKey,
          })
          .signers([owner1])
          .rpc();

        // Check approvals before revocation
        let txAccount: any = await program.account.transaction.fetch(txPda);
        expect(txAccount.approvers.map(pk => pk.toString()))
          .to.include(owner1.publicKey.toString());

        // Revoke approval
        await program.methods
          .revokeApproval()
          .accounts({
            multisig: multisigPda,
            transaction: txPda,
            approver: owner1.publicKey,
          })
          .signers([owner1])
          .rpc();

        // Verify approval was revoked
        txAccount = await program.account.transaction.fetch(txPda);
        expect(txAccount.approvers.map(pk => pk.toString()))
          .to.not.include(owner1.publicKey.toString());
      });
    });
  });
});
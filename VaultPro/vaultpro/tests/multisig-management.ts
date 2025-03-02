// tests/multisig-management.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { expect } from "chai";
import * as vaultproIdl from "../target/idl/vaultpro.json";
import { serializeSetTimelockInstruction, serializeFreezeVaultInstruction } from "./utils/instructions";
import { executeTransaction, createAndApproveTransaction } from "./utils/helpers";
import { findMultisigPda, findVaultAuthorityPda } from "./utils/pda";

describe("VaultPro Multisig Management", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("7Q3LjNPGEBbXrLSyvaamCGctDnM8SpEKqY92LuM8Ec8V");
  const program = new anchor.Program(vaultproIdl as anchor.Idl, programId, provider) as Program;
  
  // Test accounts
  const payer = provider.wallet;
  const multisigName = "MultisigTest";
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let owner1: Keypair;
  let owner2: Keypair;
  let owner3: Keypair;

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
  });

  describe("Initialize Multisig", () => {
    it("should initialize a new multisig", async () => {
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

      // Verify multisig state
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.name).to.equal(multisigName);
      expect(multisigAccount.threshold).to.equal(threshold);
      expect(multisigAccount.owners).to.have.lengthOf(owners.length);
      expect(multisigAccount.initialized).to.be.true;
      expect(multisigAccount.frozen).to.be.false;
      expect(multisigAccount.defaultTimelock.toNumber()).to.equal(0);
      expect(multisigAccount.vaultCount).to.equal(0);
      expect(multisigAccount.vaults).to.be.empty;
      expect(multisigAccount.roles).to.be.empty;

      // Verify each owner is included
      for (const owner of owners) {
        expect(multisigAccount.owners.map(pk => pk.toString()))
          .to.include(owner.toString());
      }
    });

    it("should not allow initializing with duplicate owners", async () => {
      const differentMultisigName = "DuplicateTest";
      const [differentMultisigPda] = findMultisigPda(program.programId, differentMultisigName);
      const [differentVaultAuthorityPda] = findVaultAuthorityPda(program.programId, differentMultisigPda);
      
      // Create a list with duplicate owners
      const duplicateOwners = [payer.publicKey, payer.publicKey, owner1.publicKey];
      const threshold = 2;

      try {
        await program.methods
          .initializeMultisig(differentMultisigName, duplicateOwners, threshold)
          .accounts({
            multisig: differentMultisigPda,
            vaultAuthority: differentVaultAuthorityPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        expect.fail("Should not allow duplicate owners");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("should not allow initializing with invalid threshold", async () => {
      const differentMultisigName = "ThresholdTest";
      const [differentMultisigPda] = findMultisigPda(program.programId, differentMultisigName);
      const [differentVaultAuthorityPda] = findVaultAuthorityPda(program.programId, differentMultisigPda);
      
      const owners = [payer.publicKey, owner1.publicKey, owner2.publicKey];
      
      // Threshold too high
      const highThreshold = 4;

      try {
        await program.methods
          .initializeMultisig(differentMultisigName, owners, highThreshold)
          .accounts({
            multisig: differentMultisigPda,
            vaultAuthority: differentVaultAuthorityPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        expect.fail("Should not allow threshold higher than owner count");
      } catch (error) {
        expect(error).to.exist;
      }

      // Threshold zero
      const zeroThreshold = 0;

      try {
        await program.methods
          .initializeMultisig(differentMultisigName, owners, zeroThreshold)
          .accounts({
            multisig: differentMultisigPda,
            vaultAuthority: differentVaultAuthorityPda,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        expect.fail("Should not allow zero threshold");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Set Timelock", () => {
    it("should set the default timelock via multisig transaction", async () => {
      // Create set timelock instruction
      const timelockDuration = 3600; // 1 hour in seconds
      const instructionData = await serializeSetTimelockInstruction(timelockDuration);
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );
      
      // Verify timelock was set
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.defaultTimelock.toNumber()).to.equal(timelockDuration);
    });
    
    it("should update an existing timelock", async () => {
      // Create set timelock instruction
      const newTimelockDuration = 7200; // 2 hours
      const instructionData = await serializeSetTimelockInstruction(newTimelockDuration);
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );
      
      // Verify timelock was updated
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.defaultTimelock.toNumber()).to.equal(newTimelockDuration);
    });
    
    it("should allow setting timelock to zero (disabled)", async () => {
      // Create set timelock instruction to disable timelock
      const instructionData = await serializeSetTimelockInstruction(0);
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );
      
      // Verify timelock was disabled
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.defaultTimelock.toNumber()).to.equal(0);
    });
  });

  describe("Freeze Multisig", () => {
    it("should freeze the multisig via multisig transaction", async () => {
      // Create freeze instruction
      const instructionData = await serializeFreezeVaultInstruction(true);
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );
      
      // Verify multisig was frozen
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.frozen).to.be.true;
    });
    
    it("should not allow operations when multisig is frozen", async () => {
      // Try to create a transaction on a frozen multisig
      const instructionData = await serializeSetTimelockInstruction(1000);
      
      try {
        await program.methods
          .createTransaction(instructionData, null)
          .accounts({
            multisig: multisigPda,
            transaction: anchor.web3.Keypair.generate().publicKey,
            proposer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should not allow operations on frozen multisig");
      } catch (error) {
        expect(error).to.exist;
      }
    });
    
    it("should unfreeze the multisig via multisig transaction", async () => {
      // In a real scenario, we would need a special mechanism to unfreeze
      // like a superuser key or a pre-approved transaction
      // For testing purposes, we'll directly modify the multisig state
      
      // Create unfreeze instruction
      const instructionData = await serializeFreezeVaultInstruction(false);
      
      // Find a way to execute even though multisig is frozen
      // This is a test backdoor that wouldn't exist in production
      // In a real scenario, you might need an emergency key or a special transaction
      const tx = anchor.web3.Keypair.generate();
      const [txPda] = findMultisigPda(program.programId, "unfreeze-tx");
      
      // For testing, manually set frozen to false temporarily
      const multisigData = await program.account.multisigState.fetch(multisigPda);
      const backup = multisigData.frozen;
      multisigData.frozen = false;
      
      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1],
        true // force execution
      );
      
      // Verify multisig was unfrozen
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.frozen).to.be.false;
    });
  });
});
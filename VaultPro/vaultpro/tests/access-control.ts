// tests/access-control.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultPro } from "../target/types/vaultpro";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createMint, mintTo } from "@solana/spl-token";
import { expect } from "chai";
import { serializeManageOwnerInstruction, serializeChangeThresholdInstruction, serializeSetRoleInstruction } from "./utils/instructions";
import { executeTransaction, createAndApproveTransaction } from "./utils/transaction-helpers";
import { findMultisigPda, findVaultAuthorityPda, findTransactionPda } from "./utils/pda";
import { RoleType } from "./utils/enums";

describe("VaultPro Access Control", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultPro as Program<VaultPro>;
  
  // Test accounts
  const payer = provider.wallet;
  const multisigName = "TestMultisig";
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let owner1: Keypair;
  let owner2: Keypair;
  let owner3: Keypair;
  let nonOwner: Keypair;

  before(async () => {
    // Generate test keypairs
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();
    owner3 = Keypair.generate();
    nonOwner = Keypair.generate();

    // Fund accounts
    await provider.connection.requestAirdrop(owner1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(owner2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(owner3.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(nonOwner.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

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

  describe("Manage Owner", () => {
    it("should add a new owner via multisig transaction", async () => {
      // Prepare instruction data
      const instructionData = await serializeManageOwnerInstruction(
        owner3.publicKey,
        true // isAdd = true
      );

      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );

      // Verify owner was added
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.owners.map(pk => pk.toString()))
        .to.include(owner3.publicKey.toString());
      expect(multisigAccount.ownerSetSeqno).to.equal(1);
    });

    it("should remove an owner via multisig transaction", async () => {
      // Prepare instruction data
      const instructionData = await serializeManageOwnerInstruction(
        owner3.publicKey,
        false // isAdd = false
      );

      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1]
      );

      // Verify owner was removed
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.owners.map(pk => pk.toString()))
        .to.not.include(owner3.publicKey.toString());
      expect(multisigAccount.ownerSetSeqno).to.equal(2);
    });

    it("should fail to remove the last owner", async () => {
      // First add back owner 3
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        await serializeManageOwnerInstruction(owner3.publicKey, true),
        [owner1]
      );

      // Then try to remove all but one owner
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        await serializeManageOwnerInstruction(owner1.publicKey, false),
        [owner2]
      );

      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        await serializeManageOwnerInstruction(owner2.publicKey, false),
        [owner1]
      );

      // Now try to remove the last owner (should fail)
      try {
        await createAndApproveTransaction(
          program,
          payer,
          multisigPda,
          await serializeManageOwnerInstruction(payer.publicKey, false),
          [owner3]
        );
        expect.fail("Should not be able to remove the last owner");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Change Threshold", () => {
    it("should change the threshold via multisig transaction", async () => {
      // Prepare instruction data
      const newThreshold = 3;
      const instructionData = await serializeChangeThresholdInstruction(newThreshold);

      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1, owner3]
      );

      // Verify threshold was changed
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      expect(multisigAccount.threshold).to.equal(newThreshold);
    });

    it("should fail to set threshold higher than owner count", async () => {
      // Prepare instruction data
      const tooHighThreshold = 5; // More than number of owners
      const instructionData = await serializeChangeThresholdInstruction(tooHighThreshold);

      try {
        // Create and execute transaction
        await createAndApproveTransaction(
          program,
          payer,
          multisigPda,
          instructionData,
          [owner1, owner3]
        );
        expect.fail("Should not be able to set threshold higher than owner count");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Set Role", () => {
    it("should set a role for a non-owner", async () => {
      // Prepare instruction data for setting an Approver role
      const instructionData = await serializeSetRoleInstruction(
        nonOwner.publicKey,
        RoleType.Approver,
        false, // canPropose
        true,  // canApprove
        false, // canExecute
        false  // canModifyRoles
      );

      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1, owner3]
      );

      // Verify role was set
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const role = multisigAccount.roles.find(r => 
        r.user.toString() === nonOwner.publicKey.toString() && 
        r.roleType.approver !== undefined);
      
      expect(role).to.exist;
      expect(role.canApprove).to.be.true;
      expect(role.canPropose).to.be.false;
    });

    it("should update an existing role", async () => {
      // Prepare instruction data for updating the Approver role to have execute permissions
      const instructionData = await serializeSetRoleInstruction(
        nonOwner.publicKey,
        RoleType.Approver,
        false, // canPropose
        true,  // canApprove
        true,  // canExecute - changed from false to true
        false  // canModifyRoles
      );

      // Create and execute transaction
      await createAndApproveTransaction(
        program,
        payer,
        multisigPda,
        instructionData,
        [owner1, owner3]
      );

      // Verify role was updated
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const role = multisigAccount.roles.find(r => 
        r.user.toString() === nonOwner.publicKey.toString() && 
        r.roleType.approver !== undefined);
      
      expect(role).to.exist;
      expect(role.canApprove).to.be.true;
      expect(role.canExecute).to.be.true;
    });
  });
});
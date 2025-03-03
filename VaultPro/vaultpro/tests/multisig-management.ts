// tests/access-control.ts
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { 
  findMultisigPda, 
  findVaultAuthorityPda, 
  findTransactionPda 
} from "./utils/pda";
import { RoleType } from "./utils/enums";

describe("VaultPro Access Control", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Import program directly from workspace
  const program = anchor.workspace.Vaultpro;
  
  // Test accounts
  let payer: Keypair;
  let owner1: Keypair;
  let owner2: Keypair;
  let owner3: Keypair;
  let nonOwner: Keypair;
  
  // PDAs
  let multisigName: string;
  let multisigPda: PublicKey;
  let vaultAuthorityPda: PublicKey;

  before(async () => {
    // Generate test keypairs
    payer = Keypair.generate();
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();
    owner3 = Keypair.generate();
    nonOwner = Keypair.generate();

    // Fund accounts
    const confirmTx = async (signature: string) => {
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });
    };

    await provider.connection.requestAirdrop(payer.publicKey, 100 * LAMPORTS_PER_SOL)
      .then(confirmTx);
    await provider.connection.requestAirdrop(owner1.publicKey, 10 * LAMPORTS_PER_SOL)
      .then(confirmTx);
    await provider.connection.requestAirdrop(owner2.publicKey, 10 * LAMPORTS_PER_SOL)
      .then(confirmTx);
    await provider.connection.requestAirdrop(owner3.publicKey, 10 * LAMPORTS_PER_SOL)
      .then(confirmTx);
    await provider.connection.requestAirdrop(nonOwner.publicKey, 10 * LAMPORTS_PER_SOL)
      .then(confirmTx);

    // Create a unique multisig name
    multisigName = `t${Date.now() % 1000000}`;
    
    // Derive PDAs
    [multisigPda] = findMultisigPda(program.programId, multisigName);
    [vaultAuthorityPda] = findVaultAuthorityPda(program.programId, multisigPda);

    // Initialize multisig
    await program.methods
      .initializeMultisig(
        multisigName,
        [payer.publicKey, owner1.publicKey, owner2.publicKey],
        2 // threshold
      )
      .accounts({
        multisig: multisigPda,
        vaultAuthority: vaultAuthorityPda,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();
      
    console.log("Multisig initialized with address:", multisigPda.toBase58());
  });

  describe("Manage Owner", () => {
    it("should add a new owner via multisig transaction", async () => {
      // Log the initial state for debugging
      const initialMultisig = await program.account.multisigState.fetch(multisigPda);
      console.log("Initial owners:", initialMultisig.owners.map(o => o.toBase58()));
      console.log("Adding owner:", owner3.publicKey.toBase58());
      
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const [transactionPda] = findTransactionPda(
        program.programId,
        multisigPda,
        multisigAccount.nonce
      );

      // Create instruction data with the correct format for manage_owner
      // Module ID (0) + Instruction ID (0) = Access Control, Manage Owner
      const isAdd = true; // Adding an owner
      
      const instructionData = Buffer.alloc(60); // Length needed based on error
      
      // Module and instruction identifiers
      instructionData.writeUint8(0, 0); // Module ID: Access Control
      instructionData.writeUint8(0, 1); // Instruction ID: Manage Owner
      
      // Write isAdd flag (boolean)
      instructionData.writeUint8(isAdd ? 1 : 0, 2);
      
      // Write owner public key (at byte 32 for alignment)
      owner3.publicKey.toBuffer().copy(instructionData, 32);

      await program.methods
        .createTransaction(
          Array.from(instructionData),
          null // timelock
        )
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Approve transaction
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();

      // Execute transaction
      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Verify owner was added
      const updatedMultisig = await program.account.multisigState.fetch(multisigPda);
      
      // Log for debugging
      console.log("Updated owners:", updatedMultisig.owners.map(o => o.toBase58()));
      
      // Check owner3 is now in the owners list
      const ownerStrings = updatedMultisig.owners.map(pk => pk.toString());
      expect(ownerStrings).to.include(owner3.publicKey.toString());
    });

    it("should remove an owner via multisig transaction", async () => {
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const [transactionPda] = findTransactionPda(
        program.programId,
        multisigPda,
        multisigAccount.nonce
      );

      // Create instruction data for removing owner3
      const instructionData = Buffer.alloc(60);
      
      // Module and instruction identifiers
      instructionData.writeUint8(0, 0); // Module ID: Access Control
      instructionData.writeUint8(0, 1); // Instruction ID: Manage Owner
      
      // Write isAdd flag (boolean) - false for remove
      instructionData.writeUint8(0, 2);
      
      // Write owner public key (at byte 32 for alignment)
      owner3.publicKey.toBuffer().copy(instructionData, 32);

      await program.methods
        .createTransaction(
          Array.from(instructionData),
          null
        )
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Approve and execute
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();

      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Verify owner was removed
      const updatedMultisig = await program.account.multisigState.fetch(multisigPda);
      const ownerStrings = updatedMultisig.owners.map(pk => pk.toString());
      expect(ownerStrings).to.not.include(owner3.publicKey.toString());
    });
  });

  describe("Change Threshold", () => {
    it("should change the threshold via multisig transaction", async () => {
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const [transactionPda] = findTransactionPda(
        program.programId,
        multisigPda,
        multisigAccount.nonce
      );

      const newThreshold = 3;
      
      // Create instruction data for change_threshold
      const instructionData = Buffer.alloc(32); // Length needed based on error
      
      // Module and instruction identifiers
      instructionData.writeUint8(0, 0); // Module ID: Access Control
      instructionData.writeUint8(1, 1); // Instruction ID: Change Threshold
      
      // Write new threshold
      instructionData.writeUint8(newThreshold, 2);

      await program.methods
        .createTransaction(
          Array.from(instructionData),
          null
        )
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();

      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const updatedMultisig = await program.account.multisigState.fetch(multisigPda);
      expect(updatedMultisig.threshold).to.equal(newThreshold);
    });
  });

  describe("Set Role", () => {
    it("should set a role for a non-owner", async () => {
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const [transactionPda] = findTransactionPda(
        program.programId,
        multisigPda,
        multisigAccount.nonce
      );

      // Create set role instruction data
      const instructionData = Buffer.alloc(68); // Length needed based on error
      
      // Module and instruction identifiers
      instructionData.writeUint8(0, 0); // Module ID: Access Control
      instructionData.writeUint8(2, 1); // Instruction ID: Set Role
      
      // Role type - 1 for Approver
      instructionData.writeUint8(1, 2);
      
      // User public key (at byte 32 for alignment)
      nonOwner.publicKey.toBuffer().copy(instructionData, 32);
      
      // Permissions (bytes after public key)
      instructionData.writeUint8(0, 64); // canPropose
      instructionData.writeUint8(1, 65); // canApprove
      instructionData.writeUint8(0, 66); // canExecute
      instructionData.writeUint8(0, 67); // canModifyRoles

      await program.methods
        .createTransaction(
          Array.from(instructionData),
          null
        )
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Complete approval with two owners and execute
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();
        
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Verify role was set
      const updatedMultisig = await program.account.multisigState.fetch(multisigPda);
      console.log("Roles after setting:", updatedMultisig.roles);
      
      const role = updatedMultisig.roles.find(r => 
        r.user.toString() === nonOwner.publicKey.toString()
      );
      expect(role).to.exist;
      expect(role.canApprove).to.be.true;
      expect(role.canPropose).to.be.false;
    });

    it("should update an existing role", async () => {
      const multisigAccount = await program.account.multisigState.fetch(multisigPda);
      const [transactionPda] = findTransactionPda(
        program.programId,
        multisigPda,
        multisigAccount.nonce
      );

      // Create set role instruction data to update the role
      const instructionData = Buffer.alloc(68); // Length needed based on error
      
      // Module and instruction identifiers
      instructionData.writeUint8(0, 0); // Module ID: Access Control
      instructionData.writeUint8(2, 1); // Instruction ID: Set Role
      
      // Role type - 1 for Approver
      instructionData.writeUint8(1, 2);
      
      // User public key (at byte 32 for alignment)
      nonOwner.publicKey.toBuffer().copy(instructionData, 32);
      
      // Permissions (bytes after public key) - now add canExecute
      instructionData.writeUint8(0, 64); // canPropose
      instructionData.writeUint8(1, 65); // canApprove
      instructionData.writeUint8(1, 66); // canExecute - changed to true
      instructionData.writeUint8(0, 67); // canModifyRoles

      await program.methods
        .createTransaction(
          Array.from(instructionData),
          null
        )
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Complete approval and execution
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner1.publicKey,
        })
        .signers([owner1])
        .rpc();
        
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      await program.methods
        .executeTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          proposer: payer.publicKey,
          executor: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      // Verify role was updated
      const updatedMultisig = await program.account.multisigState.fetch(multisigPda);
      console.log("Roles after updating:", updatedMultisig.roles);
      
      const role = updatedMultisig.roles.find(r => 
        r.user.toString() === nonOwner.publicKey.toString()
      );
      expect(role).to.exist;
      expect(role.canApprove).to.be.true;
      expect(role.canExecute).to.be.true;
    });
  });
});
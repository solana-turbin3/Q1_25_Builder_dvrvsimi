// tests/multisig-management.ts
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { expect } from 'chai';
import { VaultPro } from "../target/types/vaultpro";

describe("VaultPro: Multisig Management", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultPro as Program<VaultPro>;
  const payer = provider.wallet;

  let testMultisigName = "TestVault";
  let testOwners: PublicKey[] = [
    payer.publicKey,
    Keypair.generate().publicKey,
    Keypair.generate().publicKey,
  ];
  let testThreshold = 2;

  // Find PDAs that we'll need for our tests
  let multisigPDA: PublicKey;
  let multisigBump: number;
  let authorityPDA: PublicKey;
  let authorityBump: number;

  before(async () => {
    // Find the multisig PDA
    [multisigPDA, multisigBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("multisig"),
        Buffer.from(testMultisigName),
      ],
      program.programId
    );

    // Find the authority PDA
    [authorityPDA, authorityBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("authority"),
        multisigPDA.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initializes a multisig", async () => {
    // Perform the initialization
    await program.methods
      .initializeMultisig(
        testMultisigName,
        testOwners,
        testThreshold
      )
      .accounts({
        multisig: multisigPDA,
        vaultAuthority: authorityPDA,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Fetch the multisig account to verify it was initialized correctly
    const multisigAccount = await program.account.multisigState.fetch(multisigPDA);
    
    // Check that all fields were set correctly
    expect(multisigAccount.name).to.equal(testMultisigName);
    expect(multisigAccount.owners.length).to.equal(testOwners.length);
    expect(multisigAccount.threshold).to.equal(testThreshold);
    expect(multisigAccount.initialized).to.equal(true);
    expect(multisigAccount.bump).to.equal(multisigBump);
    expect(multisigAccount.nonce).to.equal(0);
    expect(multisigAccount.ownerSetSeqno).to.equal(0);
    expect(multisigAccount.vaultCount).to.equal(0);
    expect(multisigAccount.vaults.length).to.equal(0);
    expect(multisigAccount.defaultTimelock).to.equal(0);

    // Verify each owner was set correctly
    testOwners.forEach((owner, i) => {
      expect(multisigAccount.owners[i].toString()).to.equal(owner.toString());
    });
  });

  it("Fails to initialize with invalid threshold (0)", async () => {
    const invalidName = "InvalidThreshold";
    const [invalidMultisigPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("multisig"), Buffer.from(invalidName)],
      program.programId
    );

    try {
      await program.methods
        .initializeMultisig(
          invalidName,
          testOwners,
          0 // Invalid threshold
        )
        .accounts({
          multisig: invalidMultisigPDA,
          vaultAuthority: authorityPDA,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected error with invalid threshold (0)");
    } catch (error) {
      expect(error.toString()).to.include("InvalidThreshold");
    }
  });

  it("Fails to initialize with invalid threshold (> owners.length)", async () => {
    const invalidName = "TooHighThreshold";
    const [invalidMultisigPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("multisig"), Buffer.from(invalidName)],
      program.programId
    );

    try {
      await program.methods
        .initializeMultisig(
          invalidName,
          testOwners,
          testOwners.length + 1 // Invalid threshold
        )
        .accounts({
          multisig: invalidMultisigPDA,
          vaultAuthority: authorityPDA,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected error with threshold > owners.length");
    } catch (error) {
      expect(error.toString()).to.include("InvalidThreshold");
    }
  });

  it("Fails to initialize with duplicate owners", async () => {
    const invalidName = "DuplicateOwners";
    const [invalidMultisigPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("multisig"), Buffer.from(invalidName)],
      program.programId
    );

    // Create an array with duplicate owners
    const duplicateOwners = [testOwners[0], testOwners[0], testOwners[1]];

    try {
      await program.methods
        .initializeMultisig(
          invalidName,
          duplicateOwners,
          2
        )
        .accounts({
          multisig: invalidMultisigPDA,
          vaultAuthority: authorityPDA,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected error with duplicate owners");
    } catch (error) {
      expect(error.toString()).to.include("DuplicateOwner");
    }
  });

  it("Fails to initialize with too many owners", async () => {
    const invalidName = "TooManyOwners";
    const [invalidMultisigPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("multisig"), Buffer.from(invalidName)],
      program.programId
    );

    // Create an array with 33 owners (more than MAX_OWNERS)
    const tooManyOwners: PublicKey[] = [];
    for (let i = 0; i < 33; i++) {
      tooManyOwners.push(Keypair.generate().publicKey);
    }

    try {
      await program.methods
        .initializeMultisig(
          invalidName,
          tooManyOwners,
          2
        )
        .accounts({
          multisig: invalidMultisigPDA,
          vaultAuthority: authorityPDA,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected error with too many owners");
    } catch (error) {
      expect(error.toString()).to.include("TooManyOwners");
    }
  });

  it("Fails to initialize with name that's too long", async () => {
    // Create a name that's longer than MAX_NAME_LENGTH (32)
    const longName = "ThisNameIsTooLongForAMultisigItExceedsTheMaximumLengthAllowed";
    
    try {
      const [invalidMultisigPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("multisig"), Buffer.from(longName)],
        program.programId
      );

      await program.methods
        .initializeMultisig(
          longName,
          testOwners,
          2
        )
        .accounts({
          multisig: invalidMultisigPDA,
          vaultAuthority: authorityPDA,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected error with name too long");
    } catch (error) {
      expect(error.toString()).to.include("NameTooLong");
    }
  });
});
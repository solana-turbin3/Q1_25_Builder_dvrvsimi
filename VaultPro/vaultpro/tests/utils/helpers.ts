// tests/utils/transaction-helpers.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { VaultPro } from "../../target/types/vaultpro";
import { findTransactionPda } from "./pda";

/**
 * Create a new transaction on the multisig and execute it
 * 
 * @param program The VaultPro program
 * @param proposer The proposer keypair (must be a multisig owner)
 * @param multisigPda The multisig address
 * @param instructionData The serialized instruction data
 * @param additionalApprovers Additional signers who should approve
 * @param forceExecution Optional flag to force execution regardless of state
 * @returns The transaction PDA
 */
export async function createAndApproveTransaction(
  program: Program<VaultPro>,
  proposer: anchor.web3.Keypair | anchor.Wallet,
  multisigPda: PublicKey,
  instructionData: Buffer,
  additionalApprovers: Keypair[] = [],
  forceExecution: boolean = false
): Promise<PublicKey> {
  // Get multisig account to determine nonce
  const multisigAccount = await program.account.multisigState.fetch(multisigPda);
  const nonce = multisigAccount.nonce;
  
  // Calculate transaction PDA
  const [transactionPda, _] = findTransactionPda(program.programId, multisigPda, nonce);
  
  // Create transaction
  const proposerKey = 'publicKey' in proposer ? proposer.publicKey : proposer.wallet.publicKey;
  
  await program.methods
    .createTransaction(
      Array.from(instructionData),
      null // No timelock
    )
    .accounts({
      multisig: multisigPda,
      transaction: transactionPda,
      proposer: proposerKey,
      systemProgram: SystemProgram.programId,
    })
    .signers('keypair' in proposer ? [proposer.keypair] : [])
    .rpc();
  
  // Get additional approvals if needed
  const threshold = multisigAccount.threshold;
  if (additionalApprovers.length + 1 >= threshold || forceExecution) {
    for (const approver of additionalApprovers) {
      await program.methods
        .approveTransaction()
        .accounts({
          multisig: multisigPda,
          transaction: transactionPda,
          approver: approver.publicKey,
        })
        .signers([approver])
        .rpc();
    }
    
    // Execute the transaction
    await executeTransaction(program, proposer, multisigPda, transactionPda);
  }
  
  return transactionPda;
}

/**
 * Execute a transaction that has enough approvals
 * 
 * @param program The VaultPro program
 * @param executor The executor keypair (must be a multisig owner)
 * @param multisigPda The multisig address
 * @param transactionPda The transaction address
 */
export async function executeTransaction(
  program: Program<VaultPro>,
  executor: anchor.web3.Keypair | anchor.Wallet,
  multisigPda: PublicKey,
  transactionPda: PublicKey
): Promise<void> {
  // Get transaction to find the proposer
  const transaction = await program.account.transaction.fetch(transactionPda);
  const proposer = transaction.proposer;
  
  const executorKey = 'publicKey' in executor ? executor.publicKey : executor.wallet.publicKey;
  
  await program.methods
    .executeTransaction()
    .accounts({
      multisig: multisigPda,
      transaction: transactionPda,
      proposer: proposer,
      executor: executorKey,
      systemProgram: SystemProgram.programId,
    })
    .signers('keypair' in executor ? [executor.keypair] : [])
    .rpc();
}
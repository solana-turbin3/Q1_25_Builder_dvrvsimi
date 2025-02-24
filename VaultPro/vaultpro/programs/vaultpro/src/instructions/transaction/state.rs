// src/instructions/transaction/state.rs
use anchor_lang::prelude::*;

// Module identifier
pub const MODULE_TRANSACTION: u8 = 3;

// Instruction types within this module
pub const INSTRUCTION_CANCEL_TRANSACTION: u8 = 0;
pub const INSTRUCTION_REVOKE_APPROVAL: u8 = 1;

// Constants for identifying transaction status
pub const TRANSACTION_STATUS_PENDING: u8 = 0;
pub const TRANSACTION_STATUS_EXECUTED: u8 = 1;
pub const TRANSACTION_STATUS_CANCELLED: u8 = 2;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CancelTransactionInstruction {
    pub transaction_account: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevokeApprovalInstruction {
    pub transaction_account: Pubkey,
}

/// Helper function to serialize a cancel transaction instruction
pub fn serialize_cancel_transaction_instruction(
    transaction_account: Pubkey,
) -> Result<Vec<u8>> {
    let cancel_tx = CancelTransactionInstruction {
        transaction_account,
    };
    
    let mut data = vec![MODULE_TRANSACTION, INSTRUCTION_CANCEL_TRANSACTION];
    let mut cancel_data = cancel_tx.try_to_vec()?;
    data.append(&mut cancel_data);
    
    Ok(data)
}

/// Helper function to serialize a revoke approval instruction
pub fn serialize_revoke_approval_instruction(
    transaction_account: Pubkey,
) -> Result<Vec<u8>> {
    let revoke_approval = RevokeApprovalInstruction {
        transaction_account,
    };
    
    let mut data = vec![MODULE_TRANSACTION, INSTRUCTION_REVOKE_APPROVAL];
    let mut revoke_data = revoke_approval.try_to_vec()?;
    data.append(&mut revoke_data);
    
    Ok(data)
}

#[account]
pub struct Transaction {
    pub multisig: Pubkey,                // The multisig account this transaction belongs to
    pub proposer: Pubkey,                // Who proposed this transaction
    pub instruction_data: Vec<u8>,       // Serialized instruction data with module and operation IDs
    pub approvers: Vec<Pubkey>,          // Accounts that have approved (max 32)
    pub created_at: i64,                 // When the transaction was created
    pub execute_after: Option<i64>,      // When the transaction can be executed (timelock)
    pub executed: bool,                  // Whether the transaction has been executed
    pub owner_set_seqno: u8,             // Owner set version when created
    pub status: u8,                      // Transaction status (pending, executed, cancelled)
}

impl Transaction {
    pub fn space() -> usize {
        8 +                              // discriminator
        32 +                             // multisig
        32 +                             // proposer
        4 + 200 +                        // instruction_data with length prefix (estimate)
        4 + (32 * 32) +                  // approvers vec (max 32 owners)
        8 +                              // created_at
        9 +                              // execute_after (Option<i64>)
        1 +                              // executed
        1 +                              // owner_set_seqno
        1                                // status
    }
    
    // Other helper methods remain unchanged
    // ...
}
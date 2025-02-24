// src/state/transaction.rs
use anchor_lang::prelude::*;
use crate::state::instruction_types::MultisigInstruction;

#[account]
pub struct Transaction {
    pub multisig: Pubkey,                      // The multisig account this transaction belongs to
    pub proposer: Pubkey,                      // Who proposed this transaction
    pub instruction: MultisigInstruction,      // The typed instruction to execute
    pub approvers: Vec<Pubkey>,                // Accounts that have approved (max 32)
    pub created_at: i64,                       // When the transaction was created
    pub execute_after: Option<i64>,            // When the transaction can be executed (timelock)
    pub executed: bool,                        // Whether the transaction has been executed
    pub owner_set_seqno: u8,                   // Owner set version when created
}

impl Transaction {
    pub fn space() -> usize {
        8 +                                  // discriminator
        32 +                                 // multisig
        32 +                                 // proposer
        500 +                                // instruction (estimate for the enum)
        4 + (32 * 32) +                      // approvers vec (max 32 owners)
        8 +                                  // created_at
        9 +                                  // execute_after (Option<i64>)
        1 +                                  // executed
        1                                    // owner_set_seqno
    }
}

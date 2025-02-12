// src/state/transaction.rs
use anchor_lang::prelude::*;

#[account]
pub struct Transaction {
    pub multisig: Pubkey,
    pub proposer: Pubkey,
    pub instruction_data: Vec<u8>,
    pub approvers: Vec<Pubkey>,
    pub created_at: i64,
    pub execute_after: i64,
    pub executed: bool,
    pub owner_set_seqno: u8,
}

impl Transaction {
    pub fn space() -> usize {
        8 +     // discriminator
        32 +    // multisig
        32 +    // proposer
        1000 +  // instruction_data (adjust as needed)
        32 * 32 + // approvers (max 32)
        8 +     // created_at
        8 +     // execute_after
        1 +     // executed
        1       // owner_set_seqno
    }
}
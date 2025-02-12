// src/state/multisig.rs
use anchor_lang::prelude::*;

#[account]
pub struct MultisigState {
    pub name: String,
    pub owners: Vec<Pubkey>,
    pub threshold: u8,
    pub nonce: u8,
    pub owner_set_seqno: u8,
    pub bump: u8,
}

impl MultisigState {
    pub fn space() -> usize {
        8 +     // discriminator
        32 +    // name (max length)
        32 * 32 + // owners (max 32)
        1 +     // threshold
        1 +     // nonce
        1 +     // owner_set_seqno
        1       // bump
    }
}
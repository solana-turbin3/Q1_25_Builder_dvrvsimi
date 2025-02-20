// src/state/multisig.rs
use anchor_lang::prelude::*;

#[account]
pub struct MultisigState {
    pub name: String,           // Multisig name
    pub owners: Vec<Pubkey>,    // List of owners (max 32)
    pub threshold: u8,          // Required signatures
    pub nonce: u8,             // Transaction counter
    pub owner_set_seqno: u8,    // Owner set version
    pub bump: u8,              // PDA bump
    pub initialized: bool,      // Initialization flag
    pub vault_count: u8,       // Number of vaults created
    pub vaults: Vec<VaultInfo>, // List of vaults and their mints
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultInfo {
    pub mint: Pubkey,          // Token mint address
    pub vault: Pubkey,         // Vault token account address
}

impl MultisigState {
    pub fn space() -> usize {
        8 +     // discriminator
        32 +    // name (max length)
        32 * 32 + // owners (max 32)
        1 +     // threshold
        1 +     // nonce
        1 +     // owner_set_seqno
        1 +     // bump
        1 +     // initialized
        1 +     // vault_count
        (32 + 32) * 10  // vaults (max 10 vaults, each with mint and vault address)
    }
}
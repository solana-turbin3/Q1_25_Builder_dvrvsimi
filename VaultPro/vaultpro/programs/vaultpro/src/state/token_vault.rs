// src/state/vault.rs
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultInfo {
    pub mint: Pubkey,          // Token mint address
    pub vault: Pubkey,         // Vault token account address
}

impl VaultInfo {
    pub fn new(mint: Pubkey, vault: Pubkey) -> Self {
        Self {
            mint,
            vault,
        }
    }
}
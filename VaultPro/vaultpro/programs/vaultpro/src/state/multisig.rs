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

    // helper method to calculate the space required for the accounts
    pub fn space() -> usize {
        8 +     // discriminator
        4 +     // name length prefix
        32 +    // name (max length)
        4 +     // owners vec length prefix
        32 * 32 + // owners (max 32)
        1 +     // threshold
        1 +     // nonce
        1 +     // owner_set_seqno
        1 +     // bump
        1 +     // initialized
        1 +     // vault_count
        4 +     // vaults vec length prefix
        (32 + 32) * 10  // vaults (max 10 vaults, mint + vault address)
        8       // default timelock
    }

    // helper method to validate the threshold
    pub fn validate_threshold(&self, new_threshold: u8) -> Result<()> {
        require!(new_threshold > 0, MultisigError::InvalidThreshold);
        require!(
            new_threshold <= self.owners.len() as u8,
            MultisigError::InvalidThreshold
        );
        Ok(())
    }
    
    
    // making the owner check consistent across all instructions that need it
    pub fn is_owner(&self, owner: &Pubkey) -> bool {
        self.owners.contains(owner)
    }

    pub fn has_vault_for_mint(&self, mint: Pubkey) -> bool {
        self.vaults.iter().any(|v| v.mint == mint)
    }

    pub fn add_vault(&mut self, mint: Pubkey, vault: Pubkey) -> Result<()> {
        // check if vault exists
        require!(!self.has_vault_for_mint(mint), MultisigError::InvalidMint);
        
        // check and increment counter
        require!(self.vault_count < MAX_VAULTS_PER_MULTISIG, MultisigError::MaxVaultsReached);
        self.vault_count = self.vault_count.checked_add(1)
            .ok_or(MultisigError::InvalidAmount)?;
            
        // add vault info
        self.vaults.push(VaultInfo {
            mint,
            vault,
        });
        
        Ok(())
    }

    // helper method to validate the vault
    pub fn validate_vault(&self, vault: Pubkey, mint: Pubkey) -> Result<()> {
        // find the vault info
        let vault_info = self.vaults
            .iter()
            .find(|v| v.vault == vault && v.mint == mint)
            .ok_or(MultisigError::InvalidVaultAddress)?;
            
        Ok(())
    }


}
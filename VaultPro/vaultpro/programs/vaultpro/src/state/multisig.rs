// src/state/multisig.rs
use anchor_lang::prelude::*;
use crate::error::MultisigError;
use crate::constants::{MAX_OWNERS, MAX_VAULTS_PER_MULTISIG};
use super::role::Role;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultInfo {
    pub mint: Pubkey,          // Token mint address
    pub vault: Pubkey,         // Vault token account address
}

#[account]
pub struct MultisigState {
    pub name: String,           // Multisig name
    pub owners: Vec<Pubkey>,    // List of owners (max 32)
    pub threshold: u8,          // Required signatures
    pub nonce: u8,              // Transaction counter
    pub owner_set_seqno: u8,    // Owner set version
    pub bump: u8,               // PDA bump
    pub initialized: bool,      // Initialization flag
    pub vault_count: u8,        // Number of vaults created
    pub vaults: Vec<VaultInfo>, // List of vaults and their mints
    pub default_timelock: i64,  // Default timelock period in seconds
    pub roles: Vec<Role>,       // Role-based access control
}

impl MultisigState {
    // Helper method to calculate the space required for the accounts
    pub fn space() -> usize {
        8 +                    // discriminator
        4 + MAX_NAME_LENGTH +  // name (String length prefix + max size)
        4 + (32 * MAX_OWNERS) + // owners (Vec length prefix + max size)
        1 +                    // threshold
        1 +                    // nonce
        1 +                    // owner_set_seqno
        1 +                    // bump
        1 +                    // initialized
        1 +                    // vault_count
        4 + (64 * MAX_VAULTS_PER_MULTISIG as usize) + // vaults (Vec prefix + (mint + vault) * max)
        8 +                    // default_timelock
        4 + (100 * 10)         // roles (Vec prefix + estimated size for up to 10 roles)
    }

    // Helper method to validate the threshold
    pub fn validate_threshold(&self, new_threshold: u8) -> Result<()> {
        require!(new_threshold > 0, MultisigError::InvalidThreshold);
        require!(
            new_threshold <= self.owners.len() as u8,
            MultisigError::InvalidThreshold
        );
        Ok(())
    }
    
    // Check if a pubkey is an owner
    pub fn is_owner(&self, owner: &Pubkey) -> bool {
        self.owners.contains(owner)
    }
    
    // Check if a mint already has a vault
    pub fn has_vault_for_mint(&self, mint: Pubkey) -> bool {
        self.vaults.iter().any(|v| v.mint == mint)
    }
    
    // Add a new vault
    pub fn add_vault(&mut self, mint: Pubkey, vault: Pubkey) -> Result<()> {
        // Check if vault exists
        require!(!self.has_vault_for_mint(mint), MultisigError::InvalidMint);
        
        // Check and increment counter
        require!(self.vault_count < MAX_VAULTS_PER_MULTISIG, MultisigError::MaxVaultsReached);
        self.vault_count = self.vault_count.checked_add(1)
            .ok_or(MultisigError::ArithmeticOverflow)?;
            
        // Add vault info
        self.vaults.push(VaultInfo {
            mint,
            vault,
        });
        
        Ok(())
    }

    // Validate a vault
    pub fn validate_vault(&self, vault: Pubkey, mint: Pubkey) -> Result<()> {
        // Find the vault info
        let vault_info = self.vaults
            .iter()
            .find(|v| v.vault == vault && v.mint == mint)
            .ok_or(MultisigError::InvalidVaultAddress)?;
            
        Ok(())
    }
    
    // Get roles for a user
    pub fn get_roles_for_user(&self, user: &Pubkey) -> Vec<&Role> {
        self.roles.iter().filter(|r| r.user == *user).collect()
    }
    
    // Check if a user has a specific role type
    pub fn has_role(&self, user: &Pubkey, role_type: RoleType) -> bool {
        self.roles.iter().any(|r| r.user == *user && r.role_type == role_type)
    }
    
    // Check if a user has a specific permission
    pub fn user_has_permission(&self, user: &Pubkey, permission: RolePermission) -> bool {
        // Owners always have all permissions
        if self.is_owner(user) {
            return true;
        }
        
        // Check all roles for this user
        self.roles.iter()
            .filter(|r| r.user == *user)
            .any(|r| r.has_permission(permission))
    }
    

}
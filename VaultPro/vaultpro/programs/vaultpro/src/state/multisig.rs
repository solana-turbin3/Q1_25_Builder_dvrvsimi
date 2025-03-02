// src/state/multisig.rs
use anchor_lang::prelude::*;
use crate::error::MultisigError;
use crate::constants::{MAX_OWNERS, MAX_VAULTS_PER_MULTISIG, MAX_NAME_LENGTH};
use super::token_vault::VaultInfo;
use super::access::{Role, RoleType, RolePermission};

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
    pub frozen: bool,           // Emergency freeze flag
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
        4 + (100 * 10) +       // roles (Vec prefix + estimated size for up to 10 roles)
        1                       // frozen
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
    
    // Get a vault for a specific mint
    pub fn get_vault_for_mint(&self, mint: Pubkey) -> Option<&VaultInfo> {
        self.vaults.iter().find(|v| v.mint == mint)
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
        self.vaults.push(VaultInfo::new(mint, vault));
        
        Ok(())
    }

    // Validate a vault
    pub fn validate_vault(&self, vault: Pubkey, mint: Pubkey) -> Result<()> {
        // Find the vault info
        let _vault_info = self.vaults
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
    
    // Add a new owner to the multisig
    pub fn add_owner(&mut self, owner: Pubkey) -> Result<()> {
        // Check for duplicate owner
        require!(!self.is_owner(&owner), MultisigError::DuplicateOwner);
        
        // Check owner count
        require!(self.owners.len() < MAX_OWNERS, MultisigError::TooManyOwners);
        
        // Add owner and increment owner set sequence number
        self.owners.push(owner);
        self.owner_set_seqno = self.owner_set_seqno
            .checked_add(1)
            .ok_or(MultisigError::ArithmeticOverflow)?;
            
        Ok(())
    }
    
    // Remove an owner from the multisig
    pub fn remove_owner(&mut self, owner: &Pubkey) -> Result<()> {
        // Check owner exists
        require!(self.is_owner(owner), MultisigError::NotAnOwner);
        
        // Check minimum owner count (can't remove the last owner)
        require!(self.owners.len() > 1, MultisigError::InvalidThreshold);
        
        // Remove owner
        let owner_pos = self.owners.iter().position(|o| o == owner).unwrap();
        self.owners.remove(owner_pos);
        
        // Increment owner set sequence number
        self.owner_set_seqno = self.owner_set_seqno
            .checked_add(1)
            .ok_or(MultisigError::ArithmeticOverflow)?;
            
        // Check threshold is still valid
        if self.threshold > self.owners.len() as u8 {
            self.threshold = self.owners.len() as u8;
        }
        
        Ok(())
    }
    
    // Check if the multisig is frozen
    pub fn is_frozen(&self) -> bool {
        self.frozen
    }
    
    // Set the frozen state
    pub fn set_frozen(&mut self, frozen: bool) {
        self.frozen = frozen;
    }
}
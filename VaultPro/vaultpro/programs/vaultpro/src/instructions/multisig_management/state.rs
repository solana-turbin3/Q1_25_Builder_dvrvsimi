// src/instructions/multisig_management/state.rs
use anchor_lang::prelude::*;
use crate::error::MultisigError;
use crate::constants::MAX_VAULTS_PER_MULTISIG;

// Module identifier
pub const MODULE_MULTISIG_MANAGEMENT: u8 = 2;

// Instruction types within this module
pub const INSTRUCTION_INITIALIZE: u8 = 0;
pub const INSTRUCTION_SET_TIMELOCK: u8 = 1;
pub const INSTRUCTION_FREEZE_VAULT: u8 = 2;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeInstruction {
    pub name: String,
    pub owners: Vec<Pubkey>,
    pub threshold: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetTimelockInstruction {
    pub duration: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FreezeVaultInstruction {
    pub freeze: bool,
}

// The main multisig state - this should be in src/state.rs in final structure
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
    pub default_timelock: i64,  // Default timelock duration in seconds
    pub frozen: bool,           // Emergency freeze flag
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultInfo {
    pub mint: Pubkey,          // Token mint address
    pub vault: Pubkey,         // Vault token account address
}

impl MultisigState {
    // Helper method to calculate the space required for the accounts
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
        (32 + 32) * 10 + // vaults (max 10 vaults, mint + vault address)
        8 +     // default_timelock
        1       // frozen
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

    // Making the owner check consistent across all instructions that need it
    pub fn is_owner(&self, owner: &Pubkey) -> bool {
        self.owners.contains(owner)
    }

    pub fn has_vault_for_mint(&self, mint: Pubkey) -> bool {
        self.vaults.iter().any(|v| v.mint == mint)
    }

    pub fn add_vault(&mut self, mint: Pubkey, vault: Pubkey) -> Result<()> {
        // Check if vault exists
        require!(!self.has_vault_for_mint(mint), MultisigError::InvalidMint);
        
        // Check and increment counter
        require!(self.vault_count < MAX_VAULTS_PER_MULTISIG, MultisigError::MaxVaultsReached);
        self.vault_count = self.vault_count.checked_add(1)
            .ok_or(MultisigError::InvalidAmount)?;
            
        // Add vault info
        self.vaults.push(VaultInfo {
            mint,
            vault,
        });
        
        Ok(())
    }

    // Helper method to validate the vault
    pub fn validate_vault(&self, vault: Pubkey, mint: Pubkey) -> Result<()> {
        // Find the vault info
        let vault_info = self.vaults
            .iter()
            .find(|v| v.vault == vault && v.mint == mint)
            .ok_or(MultisigError::InvalidVaultAddress)?;
            
        Ok(())
    }

    // Check if multisig is frozen
    pub fn check_not_frozen(&self) -> Result<()> {
        require!(!self.frozen, MultisigError::MultisigFrozen);
        Ok(())
    }
}

/// Helper function to serialize an initialize instruction
pub fn serialize_initialize_instruction(
    name: String,
    owners: Vec<Pubkey>,
    threshold: u8,
) -> Result<Vec<u8>> {
    let initialize = InitializeInstruction {
        name,
        owners,
        threshold,
    };
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, INSTRUCTION_INITIALIZE];
    let mut initialize_data = initialize.try_to_vec()?;
    data.append(&mut initialize_data);
    
    Ok(data)
}

/// Helper function to serialize a set timelock instruction
pub fn serialize_set_timelock_instruction(
    duration: i64,
) -> Result<Vec<u8>> {
    let set_timelock = SetTimelockInstruction {
        duration,
    };
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, INSTRUCTION_SET_TIMELOCK];
    let mut set_timelock_data = set_timelock.try_to_vec()?;
    data.append(&mut set_timelock_data);
    
    Ok(data)
}

/// Helper function to serialize a freeze vault instruction
pub fn serialize_freeze_vault_instruction(
    freeze: bool,
) -> Result<Vec<u8>> {
    let freeze_vault = FreezeVaultInstruction {
        freeze,
    };
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, INSTRUCTION_FREEZE_VAULT];
    let mut freeze_vault_data = freeze_vault.try_to_vec()?;
    data.append(&mut freeze_vault_data);
    
    Ok(data)
}
// src/instructions/multisig_management/state.rs
use anchor_lang::prelude::*;
use crate::state::MODULE_MULTISIG_MANAGEMENT;

// Multisig management instruction identifiers
pub const MULTISIG_INSTRUCTION_INITIALIZE: u8 = 0;
pub const MULTISIG_INSTRUCTION_SET_TIMELOCK: u8 = 1;
pub const MULTISIG_INSTRUCTION_FREEZE_VAULT: u8 = 2;

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
    pub freeze: bool, // true = freeze, false = unfreeze
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
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_INITIALIZE];
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
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_SET_TIMELOCK];
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
    
    let mut data = vec![MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_FREEZE_VAULT];
    let mut freeze_vault_data = freeze_vault.try_to_vec()?;
    data.append(&mut freeze_vault_data);
    
    Ok(data)
}
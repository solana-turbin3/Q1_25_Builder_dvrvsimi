// src/instructions/multisig_management/state.rs
use anchor_lang::prelude::*;
use crate::constants::{MODULE_MULTISIG_MANAGEMENT, MULTISIG_INSTRUCTION_INITIALIZE, MULTISIG_INSTRUCTION_SET_TIMELOCK};

// instruction structs, not accounts
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
// src/instructions/access_control/state.rs
use anchor_lang::prelude::*;
use crate::constants::{MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_MANAGE_OWNER, ACCESS_INSTRUCTION_CHANGE_THRESHOLD, ACCESS_INSTRUCTION_SET_ROLE};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ManageOwnerInstruction {
    pub owner: Pubkey,
    pub is_add: bool, // true = add, false = remove
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ChangeThresholdInstruction {
    pub new_threshold: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetRoleInstruction {
    pub user: Pubkey,
    pub role_name: String,
    pub can_propose: bool,
    pub can_approve: bool,
    pub can_execute: bool,
}

/// Helper function to serialize a manage owner instruction
pub fn serialize_manage_owner_instruction(
    owner: Pubkey,
    is_add: bool,
) -> Result<Vec<u8>> {
    let manage_owner = ManageOwnerInstruction {
        owner,
        is_add,
    };
    
    let mut data = vec![MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_MANAGE_OWNER];
    let mut manage_owner_data = manage_owner.try_to_vec()?;
    data.append(&mut manage_owner_data);
    
    Ok(data)
}

/// Helper function to serialize a change threshold instruction
pub fn serialize_change_threshold_instruction(
    new_threshold: u8,
) -> Result<Vec<u8>> {
    let change_threshold = ChangeThresholdInstruction {
        new_threshold,
    };
    
    let mut data = vec![MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_CHANGE_THRESHOLD];
    let mut change_threshold_data = change_threshold.try_to_vec()?;
    data.append(&mut change_threshold_data);
    
    Ok(data)
}

/// Helper function to serialize a manage owner instruction
pub fn serialize_manage_owner_instruction(
    owner: Pubkey,
    is_add: bool,
) -> Result<Vec<u8>> {
    let manage_owner = ManageOwnerInstruction {
        owner,
        is_add,
    };
    
    let mut data = vec![MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_MANAGE_OWNER];
    let mut manage_owner_data = manage_owner.try_to_vec()?;
    data.append(&mut manage_owner_data);
    
    Ok(data)
}
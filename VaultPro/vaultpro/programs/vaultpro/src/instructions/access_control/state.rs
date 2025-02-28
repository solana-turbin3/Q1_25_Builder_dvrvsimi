// src/instructions/access_control/state.rs
use anchor_lang::prelude::*;
use crate::state::{MODULE_ACCESS_CONTROL};

// Access control instruction identifiers
pub const ACCESS_INSTRUCTION_MANAGE_OWNER: u8 = 0;
pub const ACCESS_INSTRUCTION_CHANGE_THRESHOLD: u8 = 1;
pub const ACCESS_INSTRUCTION_SET_ROLE: u8 = 2;

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
    pub role_type: u8,
    pub can_propose: bool,
    pub can_approve: bool,
    pub can_execute: bool,
    pub can_modify_roles: bool,
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

/// Helper function to serialize a set role instruction
pub fn serialize_set_role_instruction(
    user: Pubkey,
    role_type: u8,
    can_propose: bool,
    can_approve: bool,
    can_execute: bool,
    can_modify_roles: bool,
) -> Result<Vec<u8>> {
    let set_role = SetRoleInstruction {
        user,
        role_type,
        can_propose,
        can_approve,
        can_execute,
        can_modify_roles,
    };
    
    let mut data = vec![MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_SET_ROLE];
    let mut set_role_data = set_role.try_to_vec()?;
    data.append(&mut set_role_data);
    
    Ok(data)
}
// src/instructions/access_control/set_role.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RoleType, Role, RolePermission};
use crate::error::MultisigError;
use crate::instructions::access_control::state::{
    ACCESS_INSTRUCTION_SET_ROLE,
    SetRoleInstruction
};
use crate::state::MODULE_ACCESS_CONTROL;
use crate::event::RoleChangedEvent;
use crate::constants::MAX_ROLES_PER_MULTISIG;

#[derive(Accounts)]
pub struct SetRole<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_executed() @ MultisigError::NotExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::ModifyRoles) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
}

pub fn set_role(context: Context<SetRole>) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &context.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    let clock = Clock::get()?;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, MultisigError::InvalidModuleId);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_SET_ROLE, MultisigError::InvalidInstructionId);
    
    // Parse the set role instruction
    let set_role_data = SetRoleInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| MultisigError::InvalidInstructionData)?;
    
    // Convert role type from u8
    let role_type = RoleType::from_u8(set_role_data.role_type)
        .ok_or(MultisigError::InvalidInstructionData)?;
    
    // Create the role
    let role = Role::new(
        role_type,
        set_role_data.user,
        set_role_data.can_propose,
        set_role_data.can_approve,
        set_role_data.can_execute,
        set_role_data.can_modify_roles,
        None, // max_amount
        None  // valid_until
    );
    
    // Find if the role already exists
    let role_position = multisig.roles
        .iter()
        .position(|r| r.user == set_role_data.user && r.role_type == role_type);
    
    if let Some(pos) = role_position {
        // Update existing role
        multisig.roles[pos] = role;
        msg!("Updated role {:?} for user {}", role_type, set_role_data.user);
    } else {
        // Add new role
        require!(multisig.roles.len() < MAX_ROLES_PER_MULTISIG, MultisigError::TooManyRoles);
        multisig.roles.push(role);
        msg!("Added role {:?} for user {}", role_type, set_role_data.user);
    }
    
    // Emit role change event
    emit!(RoleChangedEvent {
        multisig: multisig.key(),
        user: set_role_data.user,
        role_type: set_role_data.role_type,
        can_propose: set_role_data.can_propose,
        can_approve: set_role_data.can_approve,
        can_execute: set_role_data.can_execute,
        can_modify_roles: set_role_data.can_modify_roles,
        executed_by: context.accounts.executor.key(),
        executed_at: clock.unix_timestamp,
    });
    
    Ok(())
}
// src/instructions/access_control/set_role.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, Role};
use crate::error::MultisigError;
use crate::constants::{MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_SET_ROLE};
use crate::instructions::access_control::state::SetRoleInstruction;

#[derive(Accounts)]
pub struct SetRole<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.executed @ MultisigError::NotExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn set_role(ctx: Context<SetRole>) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let transaction = &ctx.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, ProgramError::InvalidInstructionData);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_SET_ROLE, ProgramError::InvalidInstructionData);
    
    // Parse the set role instruction
    let set_role_data = SetRoleInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Create or update the role
    let user = set_role_data.user;
    let role_name = set_role_data.role_name.clone();
    
    // First, check if user exists
    if !multisig.roles.iter().any(|r| r.user == user) {
        // Add new role
        require!(multisig.roles.len() < 32, MultisigError::TooManyRoles);
        
        multisig.roles.push(Role {
            user,
            name: role_name.clone(),
            can_propose: set_role_data.can_propose,
            can_approve: set_role_data.can_approve,
            can_execute: set_role_data.can_execute,
        });
    } else {
        // Update existing role
        let role_index = multisig.roles.iter()
            .position(|r| r.user == user)
            .ok_or(MultisigError::RoleNotFound)?;
            
        multisig.roles[role_index].name = role_name.clone();
        multisig.roles[role_index].can_propose = set_role_data.can_propose;
        multisig.roles[role_index].can_approve = set_role_data.can_approve;
        multisig.roles[role_index].can_execute = set_role_data.can_execute;
    }
    
    msg!("Role '{}' set for user {}", role_name, user);
    
    // Emit role change event
    emit!(RoleChangedEvent {
        multisig: multisig.key(),
        user,
        role_name,
        can_propose: set_role_data.can_propose,
        can_approve: set_role_data.can_approve,
        can_execute: set_role_data.can_execute,
        executed_by: ctx.accounts.executor.key(),
        executed_at: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
// src/instructions/access_control/manage_owners.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::instructions::access_control::state::{
    ACCESS_INSTRUCTION_MANAGE_OWNER,
    ManageOwnerInstruction
};
use crate::state::MODULE_ACCESS_CONTROL;
use crate::event::{OwnerAddedEvent, OwnerRemovedEvent};

#[derive(Accounts)]
pub struct ManageOwner<'info> {
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
    
    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn manage_owner(context: Context<ManageOwner>) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &context.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    let clock = Clock::get()?;
    
    // Validate the instruction data
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, MultisigError::InvalidModuleId);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_MANAGE_OWNER, MultisigError::InvalidInstructionId);
    
    // Verify executor has permission to manage owners
    require!(
        multisig.user_has_permission(&context.accounts.executor.key(), RolePermission::ModifyRoles),
        MultisigError::InsufficientPermission
    );
    
    // Parse the manage owner instruction data
    let manage_owner_data = ManageOwnerInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| MultisigError::InvalidInstructionData)?;
    
    let owner = manage_owner_data.owner;
    let is_add = manage_owner_data.is_add;
    
    // Perform the owner management operation
    if is_add {
        // Add owner
        multisig.add_owner(owner)?;
        
        // Emit owner added event
        emit!(OwnerAddedEvent {
            multisig: multisig.key(),
            owner,
            added_by: context.accounts.executor.key(),
            added_at: clock.unix_timestamp,
            new_owner_count: multisig.owners.len() as u8,
        });
        
        msg!("Owner {} added by {}", owner, context.accounts.executor.key());
    } else {
        // Remove owner
        multisig.remove_owner(&owner)?;
        
        // Emit owner removed event
        emit!(OwnerRemovedEvent {
            multisig: multisig.key(),
            owner,
            removed_by: context.accounts.executor.key(),
            removed_at: clock.unix_timestamp,
            new_owner_count: multisig.owners.len() as u8,
        });
        
        msg!("Owner {} removed by {}", owner, context.accounts.executor.key());
    }
    
    Ok(())
}
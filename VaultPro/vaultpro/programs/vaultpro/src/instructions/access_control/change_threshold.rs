// src/instructions/access_control/change_threshold.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::instructions::access_control::state::{
    ACCESS_INSTRUCTION_CHANGE_THRESHOLD,
    ChangeThresholdInstruction
};
use crate::state::MODULE_ACCESS_CONTROL;
use crate::event::ThresholdChangedEvent;

#[derive(Accounts)]
pub struct ChangeThreshold<'info> {
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

pub fn change_threshold(context: Context<ChangeThreshold>) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &context.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    let clock = Clock::get()?;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, MultisigError::InvalidModuleId);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_CHANGE_THRESHOLD, MultisigError::InvalidInstructionId);
    
    // Parse the change threshold instruction
    let change_threshold_data = ChangeThresholdInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| MultisigError::InvalidInstructionData)?;
    
    // Validate and apply the new threshold
    let old_threshold = multisig.threshold;
    multisig.validate_threshold(change_threshold_data.new_threshold)?;
    multisig.threshold = change_threshold_data.new_threshold;
    
    // Emit threshold changed event
    emit!(ThresholdChangedEvent {
        multisig: multisig.key(),
        old_threshold,
        new_threshold: change_threshold_data.new_threshold,
        changed_by: context.accounts.executor.key(),
        changed_at: clock.unix_timestamp,
    });
    
    msg!(
        "Threshold changed from {} to {} by {}", 
        old_threshold, 
        change_threshold_data.new_threshold, 
        context.accounts.executor.key()
    );
    
    Ok(())
}
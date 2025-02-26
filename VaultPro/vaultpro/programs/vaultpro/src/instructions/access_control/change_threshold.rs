// src/instructions/access_control/change_threshold.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, transaction};
use crate::error::MultisigError;
use crate::constants::{MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_CHANGE_THRESHOLD};
use crate::instructions::access_control::state::ChangeThresholdInstruction;

#[derive(Accounts)]
pub struct ChangeThreshold<'info> {
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

pub fn change_threshold(ctx: Context<ChangeThreshold>) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let transaction = &ctx.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, ProgramError::InvalidInstructionData);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_CHANGE_THRESHOLD, ProgramError::InvalidInstructionData);
    
    // Parse the change threshold instruction
    let change_threshold_data = ChangeThresholdInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Validate and apply the new threshold
    multisig.validate_threshold(change_threshold_data.new_threshold)?;
    multisig.threshold = change_threshold_data.new_threshold;
    
    msg!("Threshold changed to {}", change_threshold_data.new_threshold);
    
    Ok(())
}
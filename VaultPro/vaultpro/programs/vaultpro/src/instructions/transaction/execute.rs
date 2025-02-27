// src/instructions/transaction/execute.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;
use crate::state::{MODULE_TOKEN_MANAGEMENT, MODULE_ACCESS_CONTROL, MODULE_MULTISIG_MANAGEMENT};

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_pending() @ MultisigError::InvalidTransactionStatus,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
        constraint = transaction.approvers.len() >= multisig.threshold as usize @ MultisigError::NotEnoughApprovals,
        close = proposer
    )]
    pub transaction: Account<'info, Transaction>,

    /// The original proposer who receives back their rent
    #[account(
        mut,
        constraint = proposer.key() == transaction.proposer @ MultisigError::InvalidProposer
    )]
    pub proposer: UncheckedAccount<'info>,

    /// The account executing this transaction (must be an owner)
    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn execute_transaction(context: Context<ExecuteTransaction>) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    let clock = Clock::get()?;
    
    // Validate the transaction can be executed
    transaction.validate_can_execute(
        &context.accounts.multisig, 
        clock.unix_timestamp
    )?;
    
    // Get the module identifier from the first byte
    let instruction_data = &transaction.instruction_data;
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    
    let module_id = instruction_data[0];
    let instruction_id = instruction_data[1];
    
    // Validate module and instruction IDs
    match module_id {
        MODULE_TOKEN_MANAGEMENT => {
            // Token management operations are valid (withdraw, deposit, etc.)
            msg!("Executing token management instruction {}", instruction_id);
        },
        MODULE_ACCESS_CONTROL => {
            // Access control operations are valid (manage owner, change threshold)
            msg!("Executing access control instruction {}", instruction_id);
        },
        MODULE_MULTISIG_MANAGEMENT => {
            // Multisig management operations are valid (initialize, set timelock)
            msg!("Executing multisig management instruction {}", instruction_id);
        },
        _ => {
            msg!("Invalid module ID: {}", module_id);
            return Err(MultisigError::InvalidModuleId.into());
        }
    }

    // ark tranmsaction as executed, handler will handle
    transaction.mark_as_executed();
    
    msg!("Transaction executed by {}", context.accounts.executor.key());

    Ok(())
}
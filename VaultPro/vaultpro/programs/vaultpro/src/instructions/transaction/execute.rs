// // src/instructions/transaction/execute.rs
// use anchor_lang::prelude::*;
// use crate::state::{MultisigState, Transaction};
// use crate::error::MultisigError;

// #[derive(Accounts)]
// pub struct ExecuteTransaction<'info> {
//     #[account(
//         constraint = multisig.initialized                       @ MultisigError::MultisigNotInitialized,
//         constraint = multisig.is_owner(&executor.key())         @ MultisigError::NotAnOwner,
//     )]
//     pub multisig: Account<'info, MultisigState>,

//     #[account(
//         mut,
//         constraint = transaction.multisig == multisig.key()                        @ MultisigError::InvalidMultisigAddress,
//         constraint = !transaction.executed                                         @ MultisigError::AlreadyExecuted,
//         constraint = transaction.owner_set_seqno == multisig.owner_set_seqno       @ MultisigError::OwnerSetChanged,
//         constraint = transaction.approvers.len() >= multisig.threshold as usize    @ MultisigError::NotEnoughApprovals,
//         close = proposer
//     )]
//     pub transaction: Account<'info, Transaction>,

//     #[account(
//         mut,
//         constraint = proposer.key() == transaction.proposer @ MultisigError::InvalidProposer
//     )]
//     pub proposer: UncheckedAccount<'info>,

//     #[account(mut)]
//     pub executor: Signer<'info>,
// }

// pub fn execute_transaction(
//     ctx: Context<ExecuteTransaction>
// ) -> Result<()> {
//     let transaction = &mut ctx.accounts.transaction;
//     let clock = Clock::get()?;

//     // Check timelock
//     require!(
//         clock.unix_timestamp >= transaction.execute_after,
//         MultisigError::TimelockNotPassed
//     );

//     // Execute the specific instruction type
//     match &transaction.instruction {
//         TransactionInstruction::Transfer { amount, token_mint, recipient } => {
//             // Implement transfer logic
//         },
//         TransactionInstruction::ChangeThreshold { new_threshold } => {
//             // Implement threshold change
//         },
//         // Handle other instruction types...
//     }

//     // execute the stored instruction
//     transaction.executed = true; // simple bool for mvp, would this even work?

//     Ok(())
// }


// src/instructions/transaction/execute.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;
use crate::instructions::token_management::state::MODULE_TOKEN_MANAGEMENT;
use crate::instructions::access_control::state::MODULE_ACCESS_CONTROL;
use crate::instructions::vault_management::state::MODULE_VAULT_MANAGEMENT;

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
        constraint = !transaction.executed @ MultisigError::AlreadyExecuted,
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
    
    pub clock: Sysvar<'info, Clock>,
}

pub fn execute_transaction(ctx: Context<ExecuteTransaction>) -> Result<()> {
    let transaction = &mut ctx.accounts.transaction;
    let clock = Clock::get()?;
    
    // Check timelock if it exists
    if let Some(execute_after) = transaction.execute_after {
        require!(
            clock.unix_timestamp >= execute_after,
            MultisigError::TimelockNotPassed
        );
    }

    // Get the module identifier from the first byte
    let instruction_data = &transaction.instruction_data;
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    
    let module_id = instruction_data[0];
    let instruction_id = instruction_data[1];
    
    // Validate module and instruction IDs
    match module_id {
        MODULE_TOKEN_MANAGEMENT => {
            // Token management operations are valid (withdraw, deposit, etc.)
            // These will be handled by their respective instruction handlers
            msg!("Executing token management instruction {}", instruction_id);
        },
        MODULE_ACCESS_CONTROL => {
            // Access control operations are valid (manage owner, change threshold)
            msg!("Executing access control instruction {}", instruction_id);
        },
        MODULE_VAULT_MANAGEMENT => {
            // Vault management operations are valid (initialize, set timelock)
            msg!("Executing vault management instruction {}", instruction_id);
        },
        _ => {
            msg!("Invalid module ID: {}", module_id);
            return Err(ProgramError::InvalidInstructionData.into());
        }
    }

    // Mark transaction as executed - the specific instruction handler will perform
    // the actual operation
    transaction.executed = true;

    Ok(())
}
// src/instructions/transaction/execute.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::constants::{
    MODULE_TOKEN_MANAGEMENT, 
    MODULE_ACCESS_CONTROL, 
    MODULE_MULTISIG_MANAGEMENT,
    MODULE_TRANSACTION,
    ACCESS_INSTRUCTION_MANAGE_OWNER,
    ACCESS_INSTRUCTION_CHANGE_THRESHOLD,
    ACCESS_INSTRUCTION_SET_ROLE,
    TOKEN_INSTRUCTION_WITHDRAW,
    TOKEN_INSTRUCTION_DEPOSIT,
    TOKEN_INSTRUCTION_CREATE_VAULT,
    MULTISIG_INSTRUCTION_SET_TIMELOCK,
    MULTISIG_INSTRUCTION_FREEZE_VAULT,
    TRANSACTION_INSTRUCTION_REJECT,
    TRANSACTION_INSTRUCTION_REVOKE_APPROVAL
};
use crate::event::TransactionExecutedEvent;

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_pending() @ MultisigError::InvalidTransactionStatus,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
        constraint = transaction.approvers.len() >= multisig.threshold as usize @ MultisigError::NotEnoughApprovals,
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(
        constraint = proposer.key() == transaction.proposer @ MultisigError::InvalidProposer
    )]
    pub proposer: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::Execute) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn execute_transaction(context: Context<ExecuteTransaction>) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    let multisig = &context.accounts.multisig;
    let clock = Clock::get()?;
    
    // Validate the transaction can be executed
    transaction.validate_can_execute(multisig, clock.unix_timestamp)?;
    
    // Get instruction info from the transaction data
    let instruction_data = &transaction.instruction_data;
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    
    let module_id = instruction_data[0];
    let instruction_id = instruction_data[1];
    
    // Log what we're executing
    msg!(
        "Executing transaction: module={}, instruction={}, executor={}", 
        module_id, 
        instruction_id,
        context.accounts.executor.key()
    );
    
    // For this version, we just mark the transaction as executed
    // In a real implementation, the actual execution would be handled by separate
    // instruction handlers that would be invoked here using CPI
    match module_id {
        MODULE_TOKEN_MANAGEMENT => {
            match instruction_id {
                TOKEN_INSTRUCTION_WITHDRAW => {
                    msg!("Executing withdraw instruction");
                    // This would invoke token_management::withdraw
                },
                TOKEN_INSTRUCTION_DEPOSIT => {
                    msg!("Executing deposit instruction");
                    // This would invoke token_management::deposit
                },
                TOKEN_INSTRUCTION_CREATE_VAULT => {
                    msg!("Executing create vault instruction");
                    // This would invoke token_management::create_vault
                },
                _ => return Err(MultisigError::InvalidInstructionId.into())
            }
        },
        MODULE_ACCESS_CONTROL => {
            match instruction_id {
                ACCESS_INSTRUCTION_MANAGE_OWNER => {
                    msg!("Executing manage owner instruction");
                    // This would invoke access_control::manage_owner
                },
                ACCESS_INSTRUCTION_CHANGE_THRESHOLD => {
                    msg!("Executing change threshold instruction");
                    // This would invoke access_control::change_threshold
                },
                ACCESS_INSTRUCTION_SET_ROLE => {
                    msg!("Executing set role instruction");
                    // This would invoke access_control::set_role
                },
                _ => return Err(MultisigError::InvalidInstructionId.into())
            }
        },
        MODULE_MULTISIG_MANAGEMENT => {
            match instruction_id {
                MULTISIG_INSTRUCTION_SET_TIMELOCK => {
                    msg!("Executing set timelock instruction");
                    // This would invoke multisig_management::set_timelock
                },
                MULTISIG_INSTRUCTION_FREEZE_VAULT => {
                    msg!("Executing freeze vault instruction");
                    // This would invoke multisig_management::freeze_vault
                },
                _ => return Err(MultisigError::InvalidInstructionId.into())
            }
        },
        MODULE_TRANSACTION => {
            match instruction_id {
                TRANSACTION_INSTRUCTION_REJECT => {
                    msg!("Executing reject transaction instruction");
                    // This would invoke transaction::reject
                },
                TRANSACTION_INSTRUCTION_REVOKE_APPROVAL => {
                    msg!("Executing revoke approval instruction");
                    // This would invoke transaction::revoke_approval
                },
                _ => return Err(MultisigError::InvalidInstructionId.into())
            }
        },
        _ => return Err(MultisigError::InvalidModuleId.into())
    }

    // mark tx as executed
    transaction.mark_as_executed();
    
    // Emit execution event
    emit!(TransactionExecutedEvent {
        multisig: multisig.key(),
        transaction: transaction.key(),
        executor: context.accounts.executor.key(),
        executed_at: clock.unix_timestamp,
    });
    
    msg!("Transaction executed successfully by {}", context.accounts.executor.key());

    Ok(())
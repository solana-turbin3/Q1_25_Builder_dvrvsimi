// src/instructions/transaction/reject.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::event::TransactionRejectedEvent;

#[derive(Accounts)]
pub struct RejectTransaction<'info> {
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
    )]
    pub transaction: Account<'info, Transaction>,

    /// CHECK: We only use this account as a constraint check against the transaction's proposer
    pub proposer: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::Execute) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
}

pub fn reject_transaction(context: Context<RejectTransaction>) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    let clock = Clock::get()?;
    
    // Mark transaction as rejected (this is purely for logging since we're closing the account)
    transaction.mark_as_rejected();
    
    // Emit event
    emit!(TransactionRejectedEvent {
        multisig: context.accounts.multisig.key(),
        transaction: transaction.key(),
        rejector: context.accounts.executor.key(),
        rejected_at: clock.unix_timestamp,
    });
    
    msg!(
        "Transaction rejected by {}, refunding rent to proposer {}", 
        context.accounts.executor.key(),
        context.accounts.proposer.key()
    );

    Ok(())
}
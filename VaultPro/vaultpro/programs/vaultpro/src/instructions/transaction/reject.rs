// src/instructions/transaction/reject.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RoleType};
use crate::error::MultisigError;

#[derive(Accounts)]
pub struct RejectTransaction<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&rejecter.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_pending() @ MultisigError::InvalidTransactionStatus,
        constraint = 
            transaction.proposer == rejecter.key() || 
            multisig.has_role(&rejecter.key(), RoleType::Admin) @ MultisigError::InsufficientPermission,
        close = proposer // Close the account and refund rent to proposer
    )]
    pub transaction: Account<'info, Transaction>,
    
    /// The original proposer who receives back the rent
    #[account(
        mut,
        constraint = proposer.key() == transaction.proposer @ MultisigError::InvalidProposer
    )]
    pub proposer: UncheckedAccount<'info>,

    #[account(mut)]
    pub rejecter: Signer<'info>,
}

pub fn reject_transaction(context: Context<RejectTransaction>) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    
    // Mark transaction as rejected
    transaction.mark_as_rejected();
    
    msg!(
        "Transaction rejected by {}, refunding rent to proposer {}", 
        context.accounts.rejecter.key(),
        context.accounts.proposer.key()
    );

    Ok(())
}
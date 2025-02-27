// src/instructions/transaction/approve.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;

#[derive(Accounts)]
pub struct ApproveTransaction<'info> {
    #[account(
        constraint = multisig.initialized                   @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&approver.key())     @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_pending() @ MultisigError::InvalidTransactionStatus,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub approver: Signer<'info>,
}

pub fn approve_transaction(
    context: Context<ApproveTransaction>
) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    let approver_key = context.accounts.approver.key();

    // Add approval using the helper method in Transaction
    transaction.add_approver(approver_key)?;
    
    msg!("Transaction approved by {}", approver_key);

    Ok(())
}
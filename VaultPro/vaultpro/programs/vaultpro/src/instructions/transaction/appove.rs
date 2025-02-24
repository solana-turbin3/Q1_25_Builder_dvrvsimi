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
        constraint = transaction.multisig == multisig.key()                     @ ProgramError::InvalidArgument,
        constraint = !transaction.executed                                      @ MultisigError::AlreadyExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno    @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub approver: Signer<'info>,
}

pub fn approve_transaction(
    ctx: Context<ApproveTransaction>
) -> Result<()> {

    let transaction = &mut ctx.accounts.transaction;
    let approver_key = ctx.accounts.approver.key();

    // check if already approved but we already checked if already executed, possible conflict? 
    require!(
        !transaction.approvers.contains(&approver_key),
        MultisigError::AlreadyApproved
    );

    // add approval
    transaction.approvers.push(approver_key);

    Ok(())
}
// src/instructions/transaction/execute.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key()                        @ ProgramError::InvalidArgument,
        constraint = !transaction.executed                                         @ MultisigError::AlreadyExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno       @ MultisigError::OwnerSetChanged,
        constraint = transaction.approvers.len() >= multisig.threshold as usize    @ MultisigError::NotEnoughApprovals,
        close = rent_collector // side eye
    )]
    pub transaction: Account<'info, Transaction>,

    /// CHECK: any designated account collecting rent
    #[account(mut)]
    pub rent_collector: UncheckedAccount<'info>,

    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn execute_transaction(
    ctx: Context<ExecuteTransaction>
) -> Result<()> {
    let transaction = &mut ctx.accounts.transaction;
    let clock = Clock::get()?;

    // Check timelock
    require!(
        clock.unix_timestamp >= transaction.execute_after,
        MultisigError::TimelockNotPassed
    );

    // execute the stored instruction
    transaction.executed = true; // simple bool for mvp, would this even work?

    Ok(())
}
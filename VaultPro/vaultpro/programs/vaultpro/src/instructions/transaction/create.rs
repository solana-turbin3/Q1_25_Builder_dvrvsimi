// src/instructions/transaction/create.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;

#[derive(Accounts)]
#[instruction(instruction_data: Vec<u8>)]
pub struct CreateTransaction<'info> {
    #[account(
        constraint = multisig.initialized                   @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&proposer.key())     @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        init,
        payer = proposer,
        space = Transaction::space(),
        seeds = [
            b"transaction",
            multisig.key().as_ref(),
            &[multisig.nonce], // for every created tx, unique enough
        ],
        bump
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_transaction(
    ctx: Context<CreateTransaction>,
    instruction_data: Vec<u8>,
    timelock: i64, // to get amap approvers to see the tx
) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let transaction = &mut ctx.accounts.transaction;
    let clock = Clock::get()?;

    // Initialize the transaction
    transaction.multisig = multisig.key();
    transaction.proposer = ctx.accounts.proposer.key();
    transaction.instruction_data = instruction_data;
    transaction.approvers = vec![ctx.accounts.proposer.key()]; // proposer auto-approves, i mean...
    transaction.created_at = clock.unix_timestamp;
    transaction.execute_after = clock.unix_timestamp + timelock;
    transaction.executed = false;
    transaction.owner_set_seqno = multisig.owner_set_seqno;

    Ok(())
}
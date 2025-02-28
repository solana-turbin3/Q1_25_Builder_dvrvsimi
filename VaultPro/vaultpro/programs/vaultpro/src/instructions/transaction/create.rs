// src/instructions/transaction/create.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;

#[derive(Accounts)]
#[instruction(instruction_data: Vec<u8>)]
pub struct CreateTransaction<'info> {
    #[account(
        mut, // Make it mutable so we can update the nonce
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&proposer.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        init,
        payer = proposer,
        space = Transaction::space(),
        seeds = [
            b"transaction",
            multisig.key().as_ref(),
            &multisig.nonce.to_le_bytes(),
            &clock.unix_timestamp.to_le_bytes()[..4], // add timestamp to avoid collisions, overkill?
        ],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    
    pub clock: Sysvar<'info, Clock>,

    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_transaction(
    context: Context<CreateTransaction>,
    instruction_data: Vec<u8>,
    timelock: Option<i64>, // Optional timelock period
) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &mut context.accounts.transaction;
    let clock = Clock::get()?;

    // Calculate execution time based on timelock
    let execute_after = timelock.map(|duration| {
        clock.unix_timestamp.checked_add(duration)
            .ok_or(MultisigError::ArithmeticOverflow)
    }).transpose()?;

    // Initialize transaction using the helper method
    transaction.initialize(
        multisig.key(),
        context.accounts.proposer.key(),
        instruction_data,
        multisig.owner_set_seqno,
        clock.unix_timestamp,
        execute_after,
    );

    // Update multisig nonce for next transaction
    let old_nonce = multisig.nonce;
    multisig.nonce = multisig.nonce
        .checked_add(1)
        .ok_or(MultisigError::ArithmeticOverflow)?;

    msg!("Transaction created by {}, transaction nonce: {}", 
        context.accounts.proposer.key(),
        old_nonce); // Show the current transaction's nonce

    Ok(())
}
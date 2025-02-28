// src/instructions/transaction/create.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::event::TransactionCreatedEvent;

#[derive(Accounts)]
#[instruction(instruction_data: Vec<u8>)]
pub struct CreateTransaction<'info> {
    #[account(
        mut, // Make it mutable so we can update the nonce
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.user_has_permission(&proposer.key(), RolePermission::Propose) @ MultisigError::InsufficientPermission,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
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
        ],
        bump
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_transaction(
    context: Context<CreateTransaction>,
    instruction_data: Vec<u8>,
    timelock: Option<i64>, // Optional timelock period
) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &mut context.accounts.transaction;
    let clock = Clock::get()?;

    // Validate instruction data
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    
    // Calculate execution time based on timelock
    let execute_after = match timelock {
        // If timelock is provided, use it
        Some(duration) => Some(
            clock.unix_timestamp
                .checked_add(duration)
                .ok_or(MultisigError::ArithmeticOverflow)?
        ),
        // If no timelock provided but default exists, use that
        None if multisig.default_timelock > 0 => Some(
            clock.unix_timestamp
                .checked_add(multisig.default_timelock)
                .ok_or(MultisigError::ArithmeticOverflow)?
        ),
        // Otherwise, no timelock
        None => None,
    };

    // Initialize transaction using the helper method
    transaction.initialize(
        multisig.key(),
        context.accounts.proposer.key(),
        instruction_data.clone(),
        multisig.owner_set_seqno,
        clock.unix_timestamp,
        execute_after,
        *context.bumps.get("transaction").unwrap(),
    );

    // Update multisig nonce for next transaction
    let old_nonce = multisig.nonce;
    multisig.nonce = multisig.nonce
        .checked_add(1)
        .ok_or(MultisigError::ArithmeticOverflow)?;

    // Emit creation event
    emit!(TransactionCreatedEvent {
        multisig: multisig.key(),
        transaction: transaction.key(),
        proposer: context.accounts.proposer.key(),
        instruction_module: instruction_data[0],
        instruction_id: instruction_data[1],
        created_at: clock.unix_timestamp,
        execute_after,
    });

    msg!("Transaction created by {}, transaction nonce: {}", 
        context.accounts.proposer.key(),
        old_nonce);

    Ok(())
}
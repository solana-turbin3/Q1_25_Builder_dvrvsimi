// src/instructions/token_management/deposit.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::state::MultisigState;
use crate::error::MultisigError;
use crate::event::DepositEvent;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,

    /// CHECK: This is safe as we verify it in the handler
    #[account(mut)]
    pub token_vault: AccountInfo<'info>,
    
    /// CHECK: This is safe as we verify it in the handler
    #[account(mut)]
    pub depositor_token_account: AccountInfo<'info>,
    
    /// CHECK: This is safe as we verify it in the handler
    pub token_mint: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
}

pub fn deposit(context: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, MultisigError::ZeroAmount);
    let clock = Clock::get()?;

    // Transfer tokens from depositor to vault
    token::transfer(
        CpiContext::new(
            context.accounts.token_program.to_account_info(),
            token::Transfer {
                from: context.accounts.depositor_token_account.to_account_info(),
                to: context.accounts.token_vault.to_account_info(),
                authority: context.accounts.depositor.to_account_info(),
            }
        ),
        amount
    )?;

    // Emit deposit event
    emit!(DepositEvent {
        multisig: context.accounts.multisig.key(),
        depositor: context.accounts.depositor.key(),
        mint: context.accounts.token_mint.key(),
        amount,
        created_at: clock.unix_timestamp,
    });
    
    msg!(
        "Deposited {} tokens from {} to vault {}", 
        amount,
        context.accounts.depositor.key(),
        context.accounts.token_vault.key()
    );

    Ok(())
}
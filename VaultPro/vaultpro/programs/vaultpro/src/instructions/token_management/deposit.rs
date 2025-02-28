// src/instructions/token_management/deposit.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use crate::event::DepositEvent;
use crate::error::MultisigError;
use crate::state::MultisigState;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
        constraint = multisig.validate_vault(
            token_vault.key(), 
            token_mint.key()
        ).is_ok() @ MultisigError::InvalidVaultAddress,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = token_vault.mint == token_mint.key() @ MultisigError::InvalidMint,
        constraint = token_vault.owner == vault_authority.key() @ MultisigError::InvalidTokenOwner,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA authority verification
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = depositor_token_account.mint == token_mint.key() @ MultisigError::InvalidMint,
        constraint = depositor_token_account.owner == depositor.key() @ MultisigError::InvalidTokenOwner,
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
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
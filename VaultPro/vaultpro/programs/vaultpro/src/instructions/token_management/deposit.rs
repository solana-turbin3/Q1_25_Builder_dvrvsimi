use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::event::DepositEvent;
use crate::MultisigError;


#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
        constraint = multisig.validate_vault( // helper
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
    pub token_vault: Account<'info, token::TokenAccount>,

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
    pub depositor_token_account: Account<'info, token::TokenAccount>,
    
    pub token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, MultisigError::InvalidAmount);


    // Transfer tokens from depositor to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.depositor_token_account.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            }
        ),
        amount
    )?;

    // Emit deposit event
    emit!(DepositEvent {
        multisig: ctx.accounts.multisig.key(),
        depositor: ctx.accounts.depositor.key(),
        mint: ctx.accounts.token_mint.key(),
        amount,
        created_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
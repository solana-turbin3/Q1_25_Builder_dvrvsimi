use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::event::VaultCreatedEvent;
use crate::MultisigError;
use crate::constants::MAX_VAULTS_PER_MULTISIG;
use crate::state::MultisigState;

#[derive(Accounts)]
pub struct CreateTokenVault<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
        constraint = multisig.vault_count < MAX_VAULTS_PER_MULTISIG @ MultisigError::MaxVaultsReached,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        init,
        payer = payer,
        seeds = [
            b"vault", 
            multisig.key().as_ref(), 
            mint.key().as_ref()
        ],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub token_vault: Account<'info, token::TokenAccount>,

    /// CHECK: PDA used as token account authority
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        constraint = mint.is_initialized @ MultisigError::MultisigNotInitialized,
    )]
    pub mint: Account<'info, token::Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token_vault(ctx: Context<CreateTokenVault>) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    
    // use the helper method which handles validation and increment
    multisig.add_vault(
        ctx.accounts.mint.key(),
        ctx.accounts.token_vault.key(),
    )?;

    emit!(VaultCreatedEvent {
        multisig: multisig.key(),
        vault: ctx.accounts.token_vault.key(),
        mint: ctx.accounts.mint.key(),
        authority: ctx.accounts.vault_authority.key(),
        created_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
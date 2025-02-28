// src/instructions/token_management/create_vault.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::event::VaultCreatedEvent;
use crate::error::MultisigError;
use crate::constants::MAX_VAULTS_PER_MULTISIG;
use crate::state::{MultisigState, RolePermission};

#[derive(Accounts)]
pub struct CreateTokenVault<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
        constraint = multisig.vault_count < MAX_VAULTS_PER_MULTISIG @ MultisigError::MaxVaultsReached,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
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

    pub mint: Account<'info, token::Mint>,

    #[account(
        mut,
        constraint = multisig.user_has_permission(&payer.key(), RolePermission::Execute) @ MultisigError::InsufficientPermission,
    )]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token_vault(context: Context<CreateTokenVault>) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let clock = Clock::get()?;
    
    // Check if the mint already has a vault
    require!(
        !multisig.has_vault_for_mint(context.accounts.mint.key()),
        MultisigError::InvalidMint
    );
    
    // Add vault to the multisig state
    multisig.add_vault(
        context.accounts.mint.key(),
        context.accounts.token_vault.key(),
    )?;

    // emit event for the new vault creation
    emit!(VaultCreatedEvent {
        multisig: multisig.key(),
        vault: context.accounts.token_vault.key(),
        mint: context.accounts.mint.key(),
        authority: context.accounts.vault_authority.key(),
        created_at: clock.unix_timestamp,
    });
    
    msg!(
        "Vault created for mint {}, vault address {}", 
        context.accounts.mint.key(),
        context.accounts.token_vault.key()
    );

    Ok(())
}
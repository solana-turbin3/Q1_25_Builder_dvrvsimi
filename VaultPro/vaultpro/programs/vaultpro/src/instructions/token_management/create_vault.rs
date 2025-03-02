// src/instructions/token_management/create_vault.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, ID as TOKEN_PROGRAM_ID};
use crate::state::{MultisigState, RolePermission};
use crate::error::MultisigError;
use crate::event::VaultCreatedEvent;

#[derive(Accounts)]
pub struct CreateTokenVault<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,

    /// CHECK: This is safe because we're creating this account
    #[account(mut)]
    pub token_vault: AccountInfo<'info>,
    
    /// CHECK: This is the mint for the token vault
    pub mint: AccountInfo<'info>,
    
    /// CHECK: PDA that will own token vaults
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,
    
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
    
    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::ModifyRoles) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
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
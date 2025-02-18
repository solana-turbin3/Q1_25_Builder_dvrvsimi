use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct CreateTokenVault<'info> {
    #[account(
        constraint = multisig.initialized @ ErrorCode::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ ErrorCode::NoOwners,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault", multisig.key().as_ref(), mint.key().as_ref()],
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
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token_vault(ctx: Context<CreateTokenVault>) -> Result<()> {
    // Vault is created through the account constraints
    Ok(())
}
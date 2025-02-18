use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct Transfer<'info> {
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub source_vault: Account<'info, token::TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", destination_multisig.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub destination_vault: Account<'info, token::TokenAccount>,
    
    pub destination_multisig: Account<'info, MultisigState>,
    
    /// CHECK: PDA authority
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(
        mut,
        constraint = transaction.executed == false,
        constraint = transaction.approvers.len() >= multisig.threshold as usize
    )]
    pub transaction: Account<'info, Transaction>,
    
    pub token_program: Program<'info, Token>,
}

pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // Get vault authority seeds for signing
    let auth_bump = *ctx.bumps.get("vault_authority").unwrap();
    let auth_seeds = &[
        b"authority",
        ctx.accounts.multisig.to_account_info().key.as_ref(),
        &[auth_bump]
    ];
    let signer = &[&auth_seeds[..]];

    // Transfer tokens between vaults
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.source_vault.to_account_info(),
                to: ctx.accounts.destination_vault.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer
        ),
        amount
    )?;

    // Mark transaction as executed
    ctx.accounts.transaction.executed = true;

    // Emit transfer event
    emit!(TransferEvent {
        source_multisig: ctx.accounts.multisig.key(),
        destination_multisig: ctx.accounts.destination_multisig.key(),
        mint: ctx.accounts.token_mint.key(),
        amount,
    });

    Ok(())
}
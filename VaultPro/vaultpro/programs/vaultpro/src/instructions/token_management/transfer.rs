use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = source_vault.mint == token_mint.key() @ MultisigError::InvalidMint,
        constraint = source_vault.owner == vault_authority.key() @ MultisigError::InvalidVaultAuthority,
        constraint = source_vault.amount >= amount @ MultisigError::InsufficientFunds,
    )]
    pub source_vault: Account<'info, token::TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", destination_multisig.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = destination_vault.mint == token_mint.key() @ MultisigError::InvalidMint,
    )]
    pub destination_vault: Account<'info, token::TokenAccount>,
    
    #[account(
        constraint = destination_multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = destination_multisig.owners.len() > 0 @ MultisigError::NoOwnersFound,
    )]
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
        constraint = transaction.executed == false @ MultisigError::AlreadyExecuted,
        constraint = transaction.approvers.len() >= multisig.threshold as usize @ MultisigError::NotEnoughApprovals,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    pub token_program: Program<'info, Token>,
}

pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, MultisigError::InvalidAmount);
    
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
    
    // record execution timestamp, might be needed for timelock
    ctx.accounts.transaction.executed_at = Clock::get()?.unix_timestamp;

    // Emit transfer event
    emit!(TransferEvent {
        source_multisig: ctx.accounts.multisig.key(),
        destination_multisig: ctx.accounts.destination_multisig.key(),
        mint: ctx.accounts.token_mint.key(),
        amount,
        executed_at: ctx.accounts.transaction.executed_at,
    });

    Ok(())
}
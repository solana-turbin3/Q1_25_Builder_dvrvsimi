use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::event::WithdrawEvent;
use crate::MultisigError;


#[derive(Accounts)]
#[instruction(amount: u64)] // amount needs to be available at compile time
pub struct Withdraw<'info> {
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump

        constraint = token_vault.amount >= amount @ MultisigError::InsufficientFunds  // amount here

    )]
    pub token_vault: Account<'info, token::TokenAccount>,
    
    /// CHECK: PDA authority
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    #[account(
        mut,

        constraint = recipient_token_account.mint == token_mint.key() @ MultisigError::InvalidMint, // so the right token is transferred

    )]
    pub recipient_token_account: Account<'info, token::TokenAccount>,

    
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(
        mut,
        constraint = transaction.executed == false @ MultisigError::AlreadyExecuted,
        constraint = transaction.approvers.len() >= multisig.threshold as usize @ MultisigError::NotEnoughApprovals,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged
    )]
    pub transaction: Account<'info, Transaction>,
    
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {


    // Get vault authority seeds for signing
    let auth_bump = *ctx.bumps.get("vault_authority").unwrap();
    let auth_seeds = &[
        b"authority",
        ctx.accounts.multisig.to_account_info().key.as_ref(),
        &[auth_bump]
    ];
    let signer = &[&auth_seeds[..]];

    // verify sufficient balance
    require!(
        ctx.accounts.token_vault.amount >= amount,
        MultisigError::InsufficientFunds
    );

    // Transfer tokens from vault to recipient
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.token_vault.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer
        ),
        amount
    )?;

    // Mark transaction as executed
    ctx.accounts.transaction.executed = true;

    // Emit withdrawal event
    emit!(WithdrawEvent {
        multisig: ctx.accounts.multisig.key(),
        recipient: ctx.accounts.recipient_token_account.owner,
        mint: ctx.accounts.token_mint.key(),
        amount,
    });

    Ok(())
}
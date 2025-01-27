use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct Exchange<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    
    #[account(
        mut,
        constraint = escrow.initializer == initializer.key(),
        close = initializer
    )]
    pub escrow: Account<'info, Escrow>,
    
    /// CHECK: Safe because we're closing the escrow
    #[account(mut)]
    pub initializer: AccountInfo<'info>,

    #[account(mut)]
    pub taker_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub initializer_receive_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub temp_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Exchange>,
    amount: u64,
) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    
    if amount != escrow.expected_amount {
        return Err(EscrowError::AmountMismatch.into());
    }

    // Transfer tokens from taker to initializer_receive_account
    let transfer_to_initializer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.taker_token_account.to_account_info(),
            to: ctx.accounts.initializer_receive_account.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        },
    );
    token::transfer(transfer_to_initializer_ctx, escrow.expected_amount)?;

    // Transfer tokens from temp account to taker
    let transfer_to_taker_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.temp_token_account.to_account_info(),
            to: ctx.accounts.taker_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        },
    );
    token::transfer(transfer_to_taker_ctx, amount)?;

    msg!("Exchange completed!");
    Ok(())
}
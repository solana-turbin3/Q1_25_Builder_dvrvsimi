use anchor_lang::prelude::*;
use anchor_spl::token::{ Token, TokenAccount};
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    #[account(mut)]
    pub temp_token_account: Account<'info, TokenAccount>,
    
    pub token_to_receive_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = initializer,
        space = Escrow::LEN
    )]
    pub escrow: Account<'info, Escrow>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<Initialize>,
    amount: u64,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.initializer = ctx.accounts.initializer.key();
    escrow.temp_token_account = ctx.accounts.temp_token_account.key();
    escrow.initializer_token_receive = ctx.accounts.token_to_receive_account.key();
    escrow.expected_amount = amount;

    msg!("Escrow initialized!");
    Ok(())
}
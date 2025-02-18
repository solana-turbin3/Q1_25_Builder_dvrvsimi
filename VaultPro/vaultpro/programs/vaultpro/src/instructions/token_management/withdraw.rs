#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, token::TokenAccount>,
    
    /// CHECK: PDA authority
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, token::TokenAccount>,
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(
        mut,
        constraint = transaction.executed == false,
        constraint = transaction.approvers.len() >= multisig.threshold as usize
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
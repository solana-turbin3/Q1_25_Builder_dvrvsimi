// src/instructions/token_management/withdraw.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, ID as TOKEN_PROGRAM_ID};
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::event::WithdrawEvent;
use crate::instructions::token_management::state::WithdrawInstruction;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_executed() @ MultisigError::NotExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    /// CHECK: This is safe as we verify it in the handler
    #[account(mut)]
    pub token_vault: AccountInfo<'info>,
    
    /// CHECK: This is safe as we verify it in the handler
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,
    
    /// CHECK: This is safe as we verify it in the handler
    pub token_mint: AccountInfo<'info>,
    
    /// The recipient of the token transfer
    /// CHECK: Validated through the recipient_token_account
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: PDA that will own token vaults
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,
    
    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::ModifyRoles) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
    
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(context: Context<Withdraw>) -> Result<()> {
    let clock = Clock::get()?;
    
    // Deserialize the instruction data from the transaction
    let withdraw_data = WithdrawInstruction::try_from_slice(
        &context.accounts.transaction.instruction_data[2..]
    )?;
    
    // Get token account info and verify balance
    let vault_amount = token::accessor::amount(&context.accounts.token_vault)?;
    require!(
        vault_amount >= withdraw_data.amount,
        MultisigError::InsufficientFunds
    );
    
    // Transfer tokens from vault to recipient
    token::transfer(
        CpiContext::new_with_signer(
            context.accounts.token_program.to_account_info(),
            token::Transfer {
                from: context.accounts.token_vault.to_account_info(),
                to: context.accounts.recipient_token_account.to_account_info(),
                authority: context.accounts.vault_authority.to_account_info(),
            },
            &[&[
                b"authority",
                context.accounts.multisig.key().as_ref(),
                &[context.bumps.vault_authority],
            ]],
        ),
        withdraw_data.amount,
    )?;
    
    // Emit withdraw event
    emit!(WithdrawEvent {
        multisig: context.accounts.multisig.key(),
        recipient: context.accounts.recipient.key(),
        mint: context.accounts.token_mint.key(),
        amount: withdraw_data.amount,
        created_at: clock.unix_timestamp,
    });
    
    msg!(
        "Withdrew {} tokens to {}",
        withdraw_data.amount,
        context.accounts.recipient.key()
    );

    Ok(())
}
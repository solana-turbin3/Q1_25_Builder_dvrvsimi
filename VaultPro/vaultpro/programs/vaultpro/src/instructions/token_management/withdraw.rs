// src/instructions/token_management/withdraw.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::event::WithdrawEvent;
use crate::error::MultisigError;
use crate::instructions::token_management::state::{
    TOKEN_INSTRUCTION_WITHDRAW,
    WithdrawInstruction
};
use crate::state::MODULE_TOKEN_MANAGEMENT;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
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
    
    #[account(
        mut,
        constraint = token_vault.owner == vault_authority.key() @ MultisigError::InvalidTokenOwner,
        constraint = token_vault.mint == token_mint.key() @ MultisigError::InvalidMint,
        seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    /// CHECK: PDA authority for the vault
    pub vault_authority: UncheckedAccount<'info>,
    
    #[account(
        mut,
        constraint = recipient_token_account.mint == token_mint.key() @ MultisigError::InvalidMint,
        constraint = recipient_token_account.owner == recipient.key() @ MultisigError::InvalidTokenOwner,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// The Mint of the token being withdrawn
    pub token_mint: Account<'info, Mint>,
    
    /// The recipient of the token transfer
    /// CHECK: Validated through the recipient_token_account
    pub recipient: UncheckedAccount<'info>,
    
    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::Execute) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
    
    #[account(address = token::ID @ MultisigError::InvalidProgramId)]
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(context: Context<Withdraw>) -> Result<()> {
    let transaction = &context.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    let clock = Clock::get()?;
    
    // Validate the instruction data matches what we expect
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_TOKEN_MANAGEMENT, MultisigError::InvalidModuleId);
    require!(instruction_data[1] == TOKEN_INSTRUCTION_WITHDRAW, MultisigError::InvalidInstructionId);
    
    // Parse the withdrawal instruction data
    let withdraw_data = WithdrawInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| MultisigError::InvalidInstructionData)?;
    
    // Validate the parsed data against the provided accounts
    require!(
        withdraw_data.token_mint == context.accounts.token_mint.key(),
        MultisigError::InvalidMint
    );
    
    require!(
        withdraw_data.recipient == context.accounts.recipient.key(),
        MultisigError::InvalidRecipient
    );
    
    // Ensure amount is greater than zero
    require!(withdraw_data.amount > 0, MultisigError::ZeroAmount);
    
    // Ensure vault has sufficient funds
    require!(
        context.accounts.token_vault.amount >= withdraw_data.amount,
        MultisigError::InsufficientFunds
    );

    // Get vault authority seeds for signing
    let authority_bump = context.bumps.vault_authority;
    let binding = context.accounts.multisig.key();
    let authority_seeds = &[
        b"authority",
        binding.as_ref(),
        &[authority_bump]
    ];
    let signer = &[&authority_seeds[..]];

    // Transfer tokens from vault to recipient
    token::transfer(
        CpiContext::new_with_signer(
            context.accounts.token_program.to_account_info(),
            token::Transfer {
                from: context.accounts.token_vault.to_account_info(),
                to: context.accounts.recipient_token_account.to_account_info(),
                authority: context.accounts.vault_authority.to_account_info(),
            },
            signer
        ),
        withdraw_data.amount
    )?;

    // Emit withdrawal event
    emit!(WithdrawEvent {
        multisig: context.accounts.multisig.key(),
        recipient: withdraw_data.recipient,
        mint: withdraw_data.token_mint,
        amount: withdraw_data.amount,
        created_at: clock.unix_timestamp,
    });

    msg!(
        "Withdrew {} tokens from vault to recipient {}", 
        withdraw_data.amount,
        context.accounts.recipient.key()
    );

    Ok(())
}
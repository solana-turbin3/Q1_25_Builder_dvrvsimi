// use anchor_lang::prelude::*;
// use anchor_spl::token::{self, Token};
// use crate::event::WithdrawEvent;
// use crate::MultisigError;


// #[derive(Accounts)]
// #[instruction(amount: u64)] // needs to be available at compile time
// pub struct Withdraw<'info> {
//     #[account(
//         constraint = multisig.initialized           @ MultisigError::MultisigNotInitialized,
//         constraint = multisig.validate_vault(
//             token_vault.key(), 
//             token_mint.key()
//         ).is_ok()                                   @ MultisigError::InvalidVaultAddress,
//     )]

//     pub multisig: Account<'info, MultisigState>,
    
//     #[account(
//         mut,
//         seeds = [b"vault", multisig.key().as_ref(), token_mint.key().as_ref()],
//         bump

//         constraint = token_vault.amount >= amount    @ MultisigError::InsufficientFunds  // here

//     )]
//     pub token_vault: Account<'info, token::TokenAccount>,
    
//     /// CHECK: PDA authority
//     #[account(
//         seeds = [b"authority", multisig.key().as_ref()],
//         bump
//     )]
//     pub vault_authority: UncheckedAccount<'info>,
    
//     #[account(
//         mut,

//         constraint = recipient_token_account.mint == token_mint.key() @ MultisigError::InvalidMint, // so the right token is transferred

//     )]
//     pub recipient_token_account: Account<'info, token::TokenAccount>,

    
//     pub token_mint: Account<'info, token::Mint>,
    
//     #[account(
//         mut,
//         constraint = transaction.executed == false @ MultisigError::AlreadyExecuted,
//         constraint = transaction.approvers.len() >= multisig.threshold as usize         @ MultisigError::NotEnoughApprovals,
//         constraint = transaction.owner_set_seqno == multisig.owner_set_seqno            @ MultisigError::OwnerSetChanged,
//     )]
//     pub transaction: Account<'info, Transaction>,
    
//     pub token_program: Program<'info, Token>,
// }

// pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {


//     // Get vault authority seeds for signing
//     let auth_bump = *ctx.bumps.get("vault_authority").unwrap();
//     let auth_seeds = &[
//         b"authority",
//         ctx.accounts.multisig.to_account_info().key.as_ref(),
//         &[auth_bump]
//     ];
//     let signer = &[&auth_seeds[..]];


//     // Transfer tokens from vault to recipient
//     token::transfer(
//         CpiContext::new_with_signer(
//             ctx.accounts.token_program.to_account_info(),
//             token::Transfer {
//                 from: ctx.accounts.token_vault.to_account_info(),
//                 to: ctx.accounts.recipient_token_account.to_account_info(),
//                 authority: ctx.accounts.vault_authority.to_account_info(),
//             },
//             signer
//         ),
//         amount
//     )?;

//     // Mark transaction as executed
//     ctx.accounts.transaction.executed = true;

//     // emit
//     emit!(WithdrawEvent {
//         multisig: ctx.accounts.multisig.key(),
//         recipient: ctx.accounts.recipient_token_account.owner,
//         mint: ctx.accounts.token_mint.key(),
//         amount,
//         created_at: Clock::get()?.unix_timestamp,
//     });

//     Ok(())
// }



// src/instructions/token_management/withdraw.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::state::{MultisigState, Transaction};
use crate::event::WithdrawEvent;
use crate::error::MultisigError;
use crate::instructions::token_management::state::{
    MODULE_TOKEN_MANAGEMENT, 
    INSTRUCTION_WITHDRAW,
    WithdrawInstruction
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.executed @ MultisigError::NotExecuted, // must be executed by execute.rs first
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(mut)]
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
    
    #[account(mut)]
    pub executor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let transaction = &ctx.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    
    // Validate the instruction data
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_TOKEN_MANAGEMENT, ProgramError::InvalidInstructionData);
    require!(instruction_data[1] == INSTRUCTION_WITHDRAW, ProgramError::InvalidInstructionData);
    
    // Parse the withdrawal instruction
    let withdraw_data = WithdrawInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Validate the parsed data against the provided accounts
    require!(
        withdraw_data.token_mint == ctx.accounts.token_mint.key(),
        MultisigError::InvalidMint
    );
    
    require!(
        ctx.accounts.token_vault.mint == withdraw_data.token_mint,
        MultisigError::InvalidMint
    );
    
    require!(
        ctx.accounts.token_vault.owner == ctx.accounts.vault_authority.key(),
        MultisigError::InvalidTokenOwner
    );
    
    require!(
        ctx.accounts.recipient_token_account.mint == withdraw_data.token_mint,
        MultisigError::InvalidMint
    );
    
    require!(
        ctx.accounts.recipient_token_account.owner == withdraw_data.recipient,
        MultisigError::InvalidTokenOwner
    );
    
    require!(
        ctx.accounts.token_vault.amount >= withdraw_data.amount,
        MultisigError::InsufficientFunds
    );

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
        withdraw_data.amount
    )?;

    // emit
    emit!(WithdrawEvent {
        multisig: ctx.accounts.multisig.key(),
        recipient: withdraw_data.recipient,
        mint: withdraw_data.token_mint,
        amount: withdraw_data.amount,
        created_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
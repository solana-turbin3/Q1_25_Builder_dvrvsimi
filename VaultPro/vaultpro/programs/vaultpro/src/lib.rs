// src/lib.rs
use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;
pub mod constants;

use instructions::*;

declare_id!("");

#[program]
pub mod solana_vault_pro {
    use super::*;

    // Transaction instructions
    pub fn create_transaction(
        ctx: Context<transaction::CreateTransaction>,
        instruction_data: Vec<u8>,
        timelock_duration: Option<i64>,
    ) -> Result<()> {
        transaction::create_transaction(ctx, instruction_data, timelock_duration)
    }

    pub fn approve_transaction(ctx: Context<transaction::ApproveTransaction>) -> Result<()> {
        transaction::approve_transaction(ctx)
    }

    pub fn execute_transaction(ctx: Context<transaction::ExecuteTransaction>) -> Result<()> {
        transaction::execute_transaction(ctx)
    }

    // Token management instructions
    pub fn withdraw(ctx: Context<token_management::Withdraw>) -> Result<()> {
        token_management::withdraw(ctx)
    }

    pub fn deposit(ctx: Context<token_management::Deposit>, amount: u64) -> Result<()> {
        token_management::deposit(ctx, amount)
    }

    // Access control instructions 
    // TODO: Add these

    // Vault management instructions
    // TODO: Add these
}
// src/lib.rs
use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;
pub mod constants;
pub mod event;

use instructions::*;

declare_id!("");

#[program]
pub mod vaultpro {
    use super::*;

    // Multisig Management instructions
    pub fn initialize_multisig(
        ctx: Context<multisig_management::InitializeMultisig>, 
        name: String,
        owners: Vec<Pubkey>,
        threshold: u8
    ) -> Result<()> {
        multisig_management::initialize_multisig(ctx, name, owners, threshold)
    }

    // Token management instructions
    pub fn create_token_vault(ctx: Context<token_management::CreateTokenVault>) -> Result<()> {
        token_management::create_token_vault(ctx)
    }

    pub fn deposit(ctx: Context<token_management::Deposit>, amount: u64) -> Result<()> {
        token_management::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<token_management::Withdraw>) -> Result<()> {
        token_management::withdraw(ctx)
    }
    
    pub fn change_threshold(ctx: Context<access_control::ChangeThreshold>) -> Result<()> {
        access_control::change_threshold(ctx)
    }

    pub fn manage_owner(ctx: Context<access_control::ManageOwner>) -> Result<()> {
        access_control::manage_owner(ctx)
    }
    
    // the rest here
}
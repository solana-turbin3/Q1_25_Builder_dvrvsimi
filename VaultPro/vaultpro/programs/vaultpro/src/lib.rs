// src/lib.rs
use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod constants;
pub mod event;
pub mod instructions;


use instructions::*;

declare_id!("7Q3LjNPGEBbXrLSyvaamCGctDnM2SpEKqY92LuM8Ec8V");

#[program]
pub mod vaultpro {
    use super::*;
    use crate::instructions::{
        multisig_management::{InitializeMultisig, FreezeMultisig},
        token_management::{CreateTokenVault, Deposit, Withdraw},
        access_control::{ChangeThreshold, ManageOwner, SetRole},
        transaction::{CreateTransaction, ApproveTransaction, ExecuteTransaction, RejectTransaction},
    };

    //---------------------------------------
    // Multisig Management Instructions
    //---------------------------------------
    
    pub fn initialize_multisig(
        ctx: Context<InitializeMultisig>, 
        name: String,
        owners: Vec<Pubkey>,
        threshold: u8
    ) -> Result<()> {
        instructions::multisig_management::initialize_multisig(ctx, name, owners, threshold)
    }

    pub fn freeze_multisig(ctx: Context<FreezeMultisig>) -> Result<()> {
        instructions::multisig_management::freeze_multisig(ctx)
    }

    //---------------------------------------
    // Token Management Instructions 
    //---------------------------------------
    
    pub fn create_token_vault(ctx: Context<CreateTokenVault>) -> Result<()> {
        instructions::token_management::create_token_vault(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::token_management::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::token_management::withdraw(ctx)
    }
    
    //---------------------------------------
    // Access Control Instructions
    //---------------------------------------
    
    pub fn change_threshold(ctx: Context<ChangeThreshold>) -> Result<()> {
        instructions::access_control::change_threshold(ctx)
    }

    pub fn manage_owner(ctx: Context<ManageOwner>) -> Result<()> {
        instructions::access_control::manage_owner(ctx)
    }
    
    pub fn set_role(ctx: Context<SetRole>) -> Result<()> {
        instructions::access_control::set_role(ctx)
    }
    
    //---------------------------------------
    // Transaction Instructions
    //---------------------------------------
    
    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        instruction_data: Vec<u8>,
        timelock: Option<i64>
    ) -> Result<()> {
        instructions::transaction::create_transaction(ctx, instruction_data, timelock)
    }
    
    pub fn approve_transaction(ctx: Context<ApproveTransaction>) -> Result<()> {
        instructions::transaction::approve_transaction(ctx)
    }
    
    pub fn execute_transaction(ctx: Context<ExecuteTransaction>) -> Result<()> {
        instructions::transaction::execute_transaction(ctx)
    }
    
    pub fn reject_transaction(ctx: Context<RejectTransaction>) -> Result<()> {
        instructions::transaction::reject_transaction(ctx)
    }
}
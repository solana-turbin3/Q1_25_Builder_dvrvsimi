// src/lib.rs
use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;
pub mod constants;
pub mod event;

use instructions::*;

declare_id!("E9iXzh3BwJ2Dz6rrC2aEPxuEAhRzPFr6qT97tJqMGKoD");

#[program]
pub mod vaultpro {
    use super::*;

    // Multisig Management instructions
    pub fn initialize_multisig(
        context: Context<multisig_management::InitializeMultisig>, 
        name: String,
        owners: Vec<Pubkey>,
        threshold: u8
    ) -> Result<()> {
        multisig_management::initialize_multisig(context, name, owners, threshold)
    }

    // Token management instructions
    pub fn create_token_vault(context: Context<token_management::CreateTokenVault>) -> Result<()> {
        token_management::create_token_vault(context)
    }

    pub fn deposit(context: Context<token_management::Deposit>, amount: u64) -> Result<()> {
        token_management::deposit(context, amount)
    }

    pub fn withdraw(context: Context<token_management::Withdraw>) -> Result<()> {
        token_management::withdraw(context)
    }
    
    // Access control instructions
    pub fn change_threshold(context: Context<access_control::ChangeThreshold>) -> Result<()> {
        access_control::change_threshold(context)
    }

    pub fn manage_owner(context: Context<access_control::ManageOwner>) -> Result<()> {
        access_control::manage_owner(context)
    }
    
    pub fn set_role(context: Context<access_control::SetRole>) -> Result<()> {
        access_control::set_role(context)
    }
    
    // Transaction instructions
    pub fn create_transaction(
        context: Context<transaction::CreateTransaction>,
        instruction_data: Vec<u8>,
        timelock: Option<i64>
    ) -> Result<()> {
        transaction::create_transaction(context, instruction_data, timelock)
    }
    
    pub fn approve_transaction(context: Context<transaction::ApproveTransaction>) -> Result<()> {
        transaction::approve_transaction(context)
    }
    
    pub fn execute_transaction(context: Context<transaction::ExecuteTransaction>) -> Result<()> {
        transaction::execute_transaction(context)
    }
    
    pub fn reject_transaction(context: Context<transaction::RejectTransaction>) -> Result<()> {
        transaction::reject_transaction(context)
    }
}
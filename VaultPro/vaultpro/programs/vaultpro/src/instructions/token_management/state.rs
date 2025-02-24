// src/instructions/token_management/state.rs
use anchor_lang::prelude::*;

// Constants for instruction type identification
pub const MODULE_TOKEN_MANAGEMENT: u8 = 0;

// Instruction types within this module
pub const INSTRUCTION_CREATE_VAULT: u8 = 0;
pub const INSTRUCTION_DEPOSIT: u8 = 1;
pub const INSTRUCTION_WITHDRAW: u8 = 2;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WithdrawInstruction {
    pub amount: u64,
    pub token_mint: Pubkey,
    pub recipient: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DepositInstruction {
    pub amount: u64,
    pub token_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateVaultInstruction {
    pub mint: Pubkey,
}

/// Helper function to serialize a withdraw instruction
pub fn serialize_withdraw_instruction(
    amount: u64,
    token_mint: Pubkey,
    recipient: Pubkey,
) -> Result<Vec<u8>> {
    let withdraw = WithdrawInstruction {
        amount,
        token_mint,
        recipient,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, INSTRUCTION_WITHDRAW];
    let mut withdraw_data = withdraw.try_to_vec()?;
    data.append(&mut withdraw_data);
    
    Ok(data)
}

/// Helper function to serialize a deposit instruction
pub fn serialize_deposit_instruction(
    amount: u64,
    token_mint: Pubkey,
) -> Result<Vec<u8>> {
    let deposit = DepositInstruction {
        amount,
        token_mint,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, INSTRUCTION_DEPOSIT];
    let mut deposit_data = deposit.try_to_vec()?;
    data.append(&mut deposit_data);
    
    Ok(data)
}

/// Helper function to serialize a create vault instruction
pub fn serialize_create_vault_instruction(
    mint: Pubkey,
) -> Result<Vec<u8>> {
    let create_vault = CreateVaultInstruction {
        mint,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, INSTRUCTION_CREATE_VAULT];
    let mut create_vault_data = create_vault.try_to_vec()?;
    data.append(&mut create_vault_data);
    
    Ok(data)
}
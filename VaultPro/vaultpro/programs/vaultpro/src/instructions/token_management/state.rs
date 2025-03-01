// src/instructions/token_management/state.rs
use anchor_lang::prelude::*;
use crate::state::MODULE_TOKEN_MANAGEMENT;

// Token management instruction identifiers
pub const TOKEN_INSTRUCTION_CREATE_VAULT: u8 = 0;
pub const TOKEN_INSTRUCTION_DEPOSIT: u8 = 1;
pub const TOKEN_INSTRUCTION_WITHDRAW: u8 = 2;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateVaultInstruction {
    pub mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DepositInstruction {
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct WithdrawInstruction {
    pub token_mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

/// Helper function to serialize a create vault instruction
pub fn serialize_create_vault_instruction(
    mint: Pubkey,
) -> Result<Vec<u8>> {
    let create_vault = CreateVaultInstruction {
        mint,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, TOKEN_INSTRUCTION_CREATE_VAULT];
    let mut create_vault_data = create_vault.try_to_vec()?;
    data.append(&mut create_vault_data);
    
    Ok(data)
}

/// Helper function to serialize a deposit instruction
pub fn serialize_deposit_instruction(
    amount: u64,
) -> Result<Vec<u8>> {
    let deposit = DepositInstruction {
        amount,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, TOKEN_INSTRUCTION_DEPOSIT];
    let mut deposit_data = deposit.try_to_vec()?;
    data.append(&mut deposit_data);
    
    Ok(data)
}

/// Helper function to serialize a withdraw instruction
pub fn serialize_withdraw_instruction(
    token_mint: Pubkey,
    recipient: Pubkey,
    amount: u64,
) -> Result<Vec<u8>> {
    let withdraw = WithdrawInstruction {
        token_mint,
        recipient,
        amount,
    };
    
    let mut data = vec![MODULE_TOKEN_MANAGEMENT, TOKEN_INSTRUCTION_WITHDRAW];
    let mut withdraw_data = withdraw.try_to_vec()?;
    data.append(&mut withdraw_data);
    
    Ok(data)
}
// src/state/instruction_types.rs
use anchor_lang::prelude::*;

/// Instruction types for the multisig program
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum MultisigInstruction {
    /// Transfer tokens from the multisig vault to a recipient
    Transfer {
        amount: u64,
        token_mint: Pubkey,
        recipient: Pubkey,
    },
    
    /// Change the approval threshold required for executing transactions
    ChangeThreshold {
        new_threshold: u8,
    },
    
    /// Manage owners - add or remove an owner from the multisig
    ManageOwner {
        owner: Pubkey,
        is_add: bool, // true = add, false = remove
    },

    /// Create a new token vault for a specific mint
    CreateVault {
        mint: Pubkey,
    },
    
    /// Set timelock duration for future transactions
    SetTimelock {
        duration: i64,
    },
}
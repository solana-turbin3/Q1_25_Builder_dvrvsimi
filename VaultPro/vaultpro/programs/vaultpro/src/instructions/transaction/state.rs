// src/instructions/transaction/state.rs
use anchor_lang::prelude::*;
use crate::state::MODULE_TRANSACTION;

// Transaction instruction identifiers
pub const TRANSACTION_INSTRUCTION_REJECT: u8 = 0;
pub const TRANSACTION_INSTRUCTION_REVOKE_APPROVAL: u8 = 1;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RejectTransactionInstruction {
    // No additional data needed for reject
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevokeApprovalInstruction {
    // If we wanted to allow an owner to revoke someone else's approval
    // we could add a pubkey field here
}

/// Helper function to serialize a reject transaction instruction
pub fn serialize_reject_transaction_instruction() -> Result<Vec<u8>> {
    let reject = RejectTransactionInstruction {};
    
    let mut data = vec![MODULE_TRANSACTION, TRANSACTION_INSTRUCTION_REJECT];
    let mut reject_data = reject.try_to_vec()?;
    data.append(&mut reject_data);
    
    Ok(data)
}

/// Helper function to serialize a revoke approval instruction
pub fn serialize_revoke_approval_instruction() -> Result<Vec<u8>> {
    let revoke = RevokeApprovalInstruction {};
    
    let mut data = vec![MODULE_TRANSACTION, TRANSACTION_INSTRUCTION_REVOKE_APPROVAL];
    let mut revoke_data = revoke.try_to_vec()?;
    data.append(&mut revoke_data);
    
    Ok(data)
}
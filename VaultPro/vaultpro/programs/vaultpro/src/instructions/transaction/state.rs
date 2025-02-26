// src/instructions/transaction/state.rs
use anchor_lang::prelude::*;
use crate::error::MultisigError;
use crate::state::MultisigState;

// Constants for the module
pub const MODULE_TRANSACTION: u8 = 3;
pub const TRANSACTION_STATUS_PENDING: u8 = 0;
pub const TRANSACTION_STATUS_EXECUTED: u8 = 1;
pub const TRANSACTION_STATUS_CANCELLED: u8 = 2;

#[account]
pub struct Transaction {
    // Core fields
    pub multisig: Pubkey,                // Parent multisig
    pub proposer: Pubkey,                // Transaction proposer
    pub instruction_data: Vec<u8>,       // Raw instruction data 
    pub approvers: Vec<Pubkey>,          // List of approvers
    
    // Timing and status
    pub created_at: i64,                 // Creation timestamp
    pub execute_after: Option<i64>,      // Timelock expiry
    pub executed: bool,                  // Execution flag
    pub status: u8,                      // Transaction status
    
    // Safety
    pub owner_set_seqno: u8,            // For owner set validation
}

impl Transaction {
    // Space calculation
    pub fn space() -> usize {
        8 +                     // Discriminator
        32 +                    // multisig
        32 +                    // proposer 
        4 + 200 +              // instruction_data (estimated max)
        4 + (32 * 32) +        // approvers (max 32)
        8 +                     // created_at
        9 +                     // execute_after (Option)
        1 +                     // executed
        1 +                     // status
        1                       // owner_set_seqno
    }

    // Status helpers
    pub fn is_pending(&self) -> bool {
        self.status == TRANSACTION_STATUS_PENDING
    }

    pub fn is_executed(&self) -> bool {
        self.status == TRANSACTION_STATUS_EXECUTED
    }

    pub fn is_cancelled(&self) -> bool {
        self.status == TRANSACTION_STATUS_CANCELLED
    }
    
    // Validation helpers
    pub fn validate_can_execute(
        &self,
        multisig: &MultisigState,
        current_time: i64
    ) -> Result<()> {
        // Check transaction is pending
        require!(self.is_pending(), MultisigError::InvalidTransactionStatus);
        
        // Check not already executed
        require!(!self.executed, MultisigError::AlreadyExecuted);
        
        // Check owner set hasn't changed
        require!(
            self.owner_set_seqno == multisig.owner_set_seqno,
            MultisigError::OwnerSetChanged
        );
        
        // Check enough approvals
        require!(
            self.approvers.len() >= multisig.threshold as usize,
            MultisigError::NotEnoughApprovals
        );

        // Check timelock if present
        if let Some(execute_after) = self.execute_after {
            require!(
                current_time >= execute_after,
                MultisigError::TimelockNotPassed
            );
        }

        Ok(())
    }

    pub fn validate_can_approve(
        &self,
        approver: &Pubkey
    ) -> Result<()> {
        // not already approved
        require!(
            !self.approvers.contains(approver),
            MultisigError::AlreadyApproved
        );

        // transaction is pending
        require!(self.is_pending(), MultisigError::InvalidTransactionStatus);

        Ok(())
    }
}
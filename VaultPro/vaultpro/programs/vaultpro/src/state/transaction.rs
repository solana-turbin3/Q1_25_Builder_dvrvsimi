// src/state/transaction.rs
use anchor_lang::prelude::*;
use crate::error::MultisigError;
use super::multisig::MultisigState;

// Constants for transaction status
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
    pub status: u8,                      // Transaction status (PENDING, EXECUTED, CANCELLED)
    
    // Safety
    pub owner_set_seqno: u8,             // For owner set validation
}

impl Transaction {
    // Space calculation
    pub fn space() -> usize {
        8 +                     // Discriminator
        32 +                    // multisig
        32 +                    // proposer 
        4 + 512 +               // instruction_data (Vec prefix + estimated max size)
        4 + (32 * 32) +         // approvers (Vec prefix + max 32 owners * pubkey size)
        8 +                     // created_at
        9 +                     // execute_after (Option<i64>)
        1 +                     // status
        1                       // owner_set_seqno
    }

    // Initialize a new transaction
    pub fn initialize(
        &mut self,
        multisig: Pubkey,
        proposer: Pubkey,
        instruction_data: Vec<u8>,
        owner_set_seqno: u8,
        created_at: i64,
        execute_after: Option<i64>,
    ) {
        self.multisig = multisig;
        self.proposer = proposer;
        self.instruction_data = instruction_data;
        self.approvers = vec![proposer]; // Auto-approve by proposer
        self.created_at = created_at;
        self.execute_after = execute_after;
        self.status = TRANSACTION_STATUS_PENDING;
        self.owner_set_seqno = owner_set_seqno;
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
    
    // Mark transaction as executed
    pub fn mark_as_executed(&mut self) {
        self.status = TRANSACTION_STATUS_EXECUTED;
    }
    
    // Mark transaction as cancelled
    pub fn mark_as_cancelled(&mut self) {
        self.status = TRANSACTION_STATUS_CANCELLED;
    }
    
    // Validation helpers
    pub fn validate_can_execute(
        &self,
        multisig: &MultisigState,
        current_time: i64
    ) -> Result<()> {
        // Check transaction is pending
        require!(self.is_pending(), MultisigError::InvalidTransactionStatus);
        
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
        // Check if already approved
        require!(
            !self.approvers.contains(approver),
            MultisigError::AlreadyApproved
        );

        // Transaction must be pending
        require!(self.is_pending(), MultisigError::InvalidTransactionStatus);

        Ok(())
    }
    
    // Add an approver to the transaction
    pub fn add_approver(&mut self, approver: Pubkey) -> Result<()> {
        // Validate state before adding
        self.validate_can_approve(&approver)?;
        
        // Insert while maintaining sorted order for efficient lookups
        match self.approvers.binary_search(&approver) {
            Ok(_) => return Err(MultisigError::AlreadyApproved.into()),
            Err(pos) => {
                self.approvers.insert(pos, approver);
            }
        }
        
        Ok(())
    }
}
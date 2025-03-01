// src/instructions/transaction/revoke.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;

#[derive(Accounts)]
pub struct RevokeApproval<'info> {
    #[account(
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&revoker.key()) || 
                     multisig.user_has_permission(&revoker.key(), RolePermission::Approve) @ MultisigError::InsufficientPermission,
        constraint = !multisig.is_frozen() @ MultisigError::MultisigFrozen,
    )]
    pub multisig: Account<'info, MultisigState>,

    #[account(
        mut,
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_pending() @ MultisigError::InvalidTransactionStatus,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
        constraint = transaction.approvers.contains(&revoker.key()) @ MultisigError::NotAnOwner,
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub revoker: Signer<'info>,
}

pub fn revoke_approval(
    context: Context<RevokeApproval>
) -> Result<()> {
    let transaction = &mut context.accounts.transaction;
    let revoker_key = context.accounts.revoker.key();
    
    // Find the position of the revoker in the approvers list
    let position = transaction.approvers
        .iter()
        .position(|approver| approver == &revoker_key)
        .ok_or(MultisigError::NotAnOwner)?;
    
    // Remove the approval
    transaction.approvers.remove(position);
    
    msg!("Approval revoked by {}", revoker_key);

    Ok(())
}
// src/instructions/access_control/manage_owners.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction};
use crate::error::MultisigError;
use crate::constants::{MODULE_ACCESS_CONTROL, ACCESS_INSTRUCTION_MANAGE_OWNER, MAX_OWNERS};
use crate::instructions::access_control::state::ManageOwnerInstruction;

#[derive(Accounts)]
pub struct ManageOwner<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.executed @ MultisigError::NotExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn manage_owner(ctx: Context<ManageOwner>) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let transaction = &ctx.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, ProgramError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_ACCESS_CONTROL, ProgramError::InvalidInstructionData);
    require!(instruction_data[1] == ACCESS_INSTRUCTION_MANAGE_OWNER, ProgramError::InvalidInstructionData);
    
    // Parse the manage owner instruction
    let manage_owner_data = ManageOwnerInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    let owner_key = manage_owner_data.owner;
    let is_add = manage_owner_data.is_add;
    
    if is_add {
        // Adding an owner
        // Check if already an owner
        require!(!multisig.is_owner(&owner_key), MultisigError::DuplicateOwner);
        
        // Check max owners limit
        require!(multisig.owners.len() < MAX_OWNERS, MultisigError::TooManyOwners);
        
        // Add the owner
        multisig.owners.push(owner_key);
        msg!("Added owner {}", owner_key);
    } else {
        // Removing an owner
        // Check owner exists
        require!(multisig.is_owner(&owner_key), MultisigError::NotAnOwner);
        
        // Check we're not removing the last owner
        require!(multisig.owners.len() > 1, MultisigError::NoOwnersFound);
        
        // Find the owner's index
        let owner_position = multisig.owners.iter()
            .position(|&x| x == owner_key)
            .ok_or(MultisigError::NotAnOwner)?;
        
        // Remove the owner
        multisig.owners.remove(owner_position);
        msg!("Removed owner {}", owner_key);
        
        // Check if we need to adjust the threshold
        if multisig.threshold > multisig.owners.len() as u8 {
            multisig.threshold = multisig.owners.len() as u8;
            msg!("Threshold adjusted to {}", multisig.threshold);
        }
    }
    
    // Increment the owner set sequence number
    multisig.owner_set_seqno = multisig.owner_set_seqno.checked_add(1).unwrap_or(0);
    
    Ok(())
}
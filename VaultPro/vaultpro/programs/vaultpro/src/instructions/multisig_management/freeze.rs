use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, RolePermission};
use crate::error::MultisigError;
use crate::instructions::multisig_management::state::{
    MULTISIG_INSTRUCTION_FREEZE_VAULT,
    FreezeVaultInstruction
};
use crate::state::MODULE_MULTISIG_MANAGEMENT;
use crate::event::MultisigFreezeEvent;

#[derive(Accounts)]
pub struct FreezeMultisig<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&executor.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = transaction.multisig == multisig.key() @ MultisigError::InvalidMultisigAddress,
        constraint = transaction.is_executed() @ MultisigError::NotExecuted,
        constraint = transaction.owner_set_seqno == multisig.owner_set_seqno @ MultisigError::OwnerSetChanged,
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(
        mut,
        constraint = multisig.user_has_permission(&executor.key(), RolePermission::ModifyRoles) @ MultisigError::InsufficientPermission,
    )]
    pub executor: Signer<'info>,
}

pub fn freeze_multisig(context: Context<FreezeMultisig>) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let transaction = &context.accounts.transaction;
    let instruction_data = &transaction.instruction_data;
    let clock = Clock::get()?;
    
    // Validate instruction data
    require!(instruction_data.len() >= 2, MultisigError::InvalidInstructionData);
    require!(instruction_data[0] == MODULE_MULTISIG_MANAGEMENT, MultisigError::InvalidModuleId);
    require!(instruction_data[1] == MULTISIG_INSTRUCTION_FREEZE_VAULT, MultisigError::InvalidInstructionId);
    
    // Parse the freeze instruction
    let freeze_data = FreezeVaultInstruction::try_from_slice(&instruction_data[2..])
        .map_err(|_| MultisigError::InvalidInstructionData)?;
    
    // Set the frozen state
    multisig.set_frozen(freeze_data.freeze);
    
    // Emit freeze event
    emit!(MultisigFreezeEvent {
        multisig: multisig.key(),
        frozen: freeze_data.freeze,
        changed_by: context.accounts.executor.key(),
        changed_at: clock.unix_timestamp,
    });
    
    msg!(
        "Multisig {} {} by {}", 
        multisig.key(),
        if freeze_data.freeze { "frozen" } else { "unfrozen" },
        context.accounts.executor.key()
    );

    Ok(())
}
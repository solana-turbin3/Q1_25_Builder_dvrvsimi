// src/instructions/vault_management/change_threshold.rs
use anchor_lang::prelude::*;
use crate::state::MultisigState;
use crate::MultisigError;

#[derive(Accounts)]
pub struct ChangeThreshold<'info> {
    #[account(mut)]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = multisig.owners.contains(owner.key) @ MultisigError::NotAnOwner,
        constraint = owner.key == &authority.key() @ MultisigError::InvalidVaultAuthority
    )]
    pub owner: Signer<'info>,
    
    /// CHECK: This is the authority that can change the threshold
    pub authority: UncheckedAccount<'info>,
}

pub fn change_threshold(
    ctx: Context<ChangeThreshold>,
    new_threshold: u8,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;

    
    // helper method instead
    multisig.validate_threshold(new_threshold)?;
    // Update threshold
    multisig.threshold = new_threshold;
    
    Ok(())
}
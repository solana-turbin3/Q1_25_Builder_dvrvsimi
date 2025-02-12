// src/instructions/vault_management/change_threshold.rs
use anchor_lang::prelude::*;
use crate::state::MultisigState;

#[derive(Accounts)]
pub struct ChangeThreshold<'info> {
    #[account(mut)]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(
        constraint = multisig.owners.contains(owner.key),
        constraint = owner.key == &authority.key()
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
    
    // Validate new threshold
    require!(new_threshold > 0, MultisigError::InvalidThreshold);
    require!(
        new_threshold <= multisig.owners.len() as u8,
        MultisigError::InvalidThreshold
    );

    // Update threshold
    multisig.threshold = new_threshold;
    
    Ok(())
}
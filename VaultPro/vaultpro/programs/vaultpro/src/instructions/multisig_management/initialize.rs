// src/instructions/multisig_management/initialize.rs
use anchor_lang::prelude::*;
use crate::state::MultisigState;
use crate::error::MultisigError;
use crate::constants::{MAX_OWNERS, MAX_NAME_LENGTH};
use crate::event::MultisigInitializedEvent;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeMultisig<'info> {
    #[account(
        init,
        payer = payer,
        space = MultisigState::space(),
        seeds = [b"multisig", name.as_bytes()],
        bump
    )]
    pub multisig: Account<'info, MultisigState>,
    
    /// CHECK: PDA that will own token vaults
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_multisig(
    context: Context<InitializeMultisig>,
    name: String,
    owners: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let clock = Clock::get()?;
    
    // validation
    require!(threshold > 0, MultisigError::InvalidThreshold);
    require!(threshold <= owners.len() as u8, MultisigError::InvalidThreshold);
    require!(owners.len() <= MAX_OWNERS, MultisigError::TooManyOwners);
    require!(!owners.is_empty(), MultisigError::NoOwnersFound);
    require!(name.len() <= MAX_NAME_LENGTH, MultisigError::NameTooLong);

    // Check for duplicate owners
    let mut sorted_owners = owners.clone();
    sorted_owners.sort();
    sorted_owners.dedup();
    require!(sorted_owners.len() == owners.len(), MultisigError::DuplicateOwner);

    // Initialize the multisig state
    multisig.name = name.clone();
    multisig.owners = owners.clone();
    multisig.threshold = threshold;
    multisig.nonce = 0;
    multisig.owner_set_seqno = 0;
    multisig.bump = context.bumps.multisig;
    multisig.initialized = true;
    multisig.default_timelock = 0; // Default to no timelock
    multisig.frozen = false;

    // Initialize empty collections
    multisig.vault_count = 0;
    multisig.vaults = Vec::new();
    multisig.roles = Vec::new();

    // Emit initialization event
    emit!(MultisigInitializedEvent {
        multisig: multisig.key(),
        name: name.clone(),
        owners,
        threshold,
        created_at: clock.unix_timestamp,
    });
    
    msg!("Multisig initialized: {}", name);

    Ok(())
}
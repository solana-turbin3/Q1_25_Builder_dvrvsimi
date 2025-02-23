// src/instructions/multisig_management/initialize.rs
use anchor_lang::prelude::*;
use crate::state::MultisigState;
use crate::MultisigError;


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
    ctx: Context<InitializeMultisig>,
    name: String,
    owners: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    
    // validation
    require!(threshold > 0, MultisigError::InvalidThreshold);
    require!(threshold <= owners.len() as u8, MultisigError::InvalidThreshold);
    require!(owners.len() <= 32, MultisigError::TooManyOwners);
    require!(!owners.is_empty(), MultisigError::NoOwnersFound);
    require!(name.len() <= 32, MultisigError::NameTooLong);

    // Check for duplicate owners
    let mut sorted_owners = owners.clone();
    sorted_owners.sort();
    sorted_owners.dedup();
    require!(sorted_owners.len() == owners.len(), MultisigError::DuplicateOwner);

    // Initialize the multisig state
    multisig.name = name;
    multisig.owners = owners;
    multisig.threshold = threshold;
    multisig.nonce = 0;
    multisig.owner_set_seqno = 0;
    multisig.bump = *ctx.bumps.get("multisig").unwrap();

    // Initialize vault tracking
    multisig.vault_count = 0;
    multisig.vaults = Vec::new();

    Ok(())
}
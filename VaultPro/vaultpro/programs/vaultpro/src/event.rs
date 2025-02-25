use anchor_lang::prelude::*;

#[event]
pub struct MultisigInitializedEvent {
    pub multisig: Pubkey,
    pub name: String,
    pub owners: Vec<Pubkey>,
    pub threshold: u8,
    pub created_at: i64,
}

#[event]
pub struct VaultCreatedEvent {
    pub multisig: Pubkey,
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct DepositEvent {
    pub multisig: Pubkey,
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub created_at: i64,
}

#[event]
pub struct WithdrawEvent {
    pub multisig: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub created_at: i64,
}
// src/event.rs
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

#[event]
pub struct TransactionCreatedEvent {
    pub multisig: Pubkey,
    pub transaction: Pubkey,
    pub proposer: Pubkey,
    pub instruction_module: u8,
    pub instruction_id: u8,
    pub created_at: i64,
    pub execute_after: Option<i64>,
}

#[event]
pub struct TransactionApprovedEvent {
    pub multisig: Pubkey,
    pub transaction: Pubkey,
    pub approver: Pubkey,
    pub approved_at: i64,
    pub approval_count: u8,
}

#[event]
pub struct TransactionExecutedEvent {
    pub multisig: Pubkey,
    pub transaction: Pubkey,
    pub executor: Pubkey,
    pub executed_at: i64,
}

#[event]
pub struct TransactionRejectedEvent {
    pub multisig: Pubkey,
    pub transaction: Pubkey,
    pub rejector: Pubkey,
    pub rejected_at: i64,
}

#[event]
pub struct OwnerAddedEvent {
    pub multisig: Pubkey,
    pub owner: Pubkey,
    pub added_by: Pubkey,
    pub added_at: i64,
    pub new_owner_count: u8,
}

#[event]
pub struct OwnerRemovedEvent {
    pub multisig: Pubkey,
    pub owner: Pubkey,
    pub removed_by: Pubkey,
    pub removed_at: i64,
    pub new_owner_count: u8,
}

#[event]
pub struct ThresholdChangedEvent {
    pub multisig: Pubkey,
    pub old_threshold: u8,
    pub new_threshold: u8,
    pub changed_by: Pubkey,
    pub changed_at: i64,
}

#[event]
pub struct RoleChangedEvent {
    pub multisig: Pubkey,
    pub user: Pubkey,
    pub role_type: u8,
    pub can_propose: bool,
    pub can_approve: bool,
    pub can_execute: bool,
    pub can_modify_roles: bool,
    pub executed_by: Pubkey,
    pub executed_at: i64,
}

#[event]
pub struct TimelockChangedEvent {
    pub multisig: Pubkey,
    pub old_timelock: i64,
    pub new_timelock: i64,
    pub changed_by: Pubkey,
    pub changed_at: i64,
}

#[event]
pub struct MultisigFreezeEvent {
    pub multisig: Pubkey,
    pub frozen: bool,
    pub changed_by: Pubkey,
    pub changed_at: i64,
}
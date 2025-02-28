// src/state/mod.rs
mod multisig;
mod transaction;
mod access;
mod token_vault;

// Re-export primary state structs
pub use multisig::MultisigState;
pub use transaction::{
    Transaction, 
    TRANSACTION_STATUS_PENDING, 
    TRANSACTION_STATUS_EXECUTED, 
    TRANSACTION_STATUS_REJECTED
};
pub use access::{Role, RolePermission, RoleType};
pub use token_vault::VaultInfo;

// Module constants
pub const MODULE_TOKEN_MANAGEMENT: u8 = 0;
pub const MODULE_ACCESS_CONTROL: u8 = 1;
pub const MODULE_MULTISIG_MANAGEMENT: u8 = 2;
pub const MODULE_TRANSACTION: u8 = 3;
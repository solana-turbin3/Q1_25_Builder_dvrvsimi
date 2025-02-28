// src/constants.rs
// General constants
pub const MAX_VAULTS_PER_MULTISIG: u8 = 10;
pub const MAX_OWNERS: usize = 32;
pub const MAX_NAME_LENGTH: usize = 32;

// Module identifiers
pub const MODULE_TOKEN_MANAGEMENT: u8 = 0;
pub const MODULE_ACCESS_CONTROL: u8 = 1;
pub const MODULE_MULTISIG_MANAGEMENT: u8 = 2;
pub const MODULE_TRANSACTION: u8 = 3;

// Token Management Instructions
pub const TOKEN_INSTRUCTION_CREATE_VAULT: u8 = 0;
pub const TOKEN_INSTRUCTION_DEPOSIT: u8 = 1;
pub const TOKEN_INSTRUCTION_WITHDRAW: u8 = 2;

// Access Control Instructions
pub const ACCESS_INSTRUCTION_MANAGE_OWNER: u8 = 0;
pub const ACCESS_INSTRUCTION_CHANGE_THRESHOLD: u8 = 1;
pub const ACCESS_INSTRUCTION_SET_ROLE: u8 = 2;

// Multisig Management Instructions
pub const MULTISIG_INSTRUCTION_INITIALIZE: u8 = 0;
pub const MULTISIG_INSTRUCTION_SET_TIMELOCK: u8 = 1;
pub const MULTISIG_INSTRUCTION_FREEZE_VAULT: u8 = 2;

// Transaction Instructions
pub const TRANSACTION_INSTRUCTION_CANCEL: u8 = 0;
pub const TRANSACTION_INSTRUCTION_REVOKE_APPROVAL: u8 = 1;

// Constants for transaction status
pub const TRANSACTION_STATUS_PENDING: u8 = 0;
pub const TRANSACTION_STATUS_EXECUTED: u8 = 1;
pub const TRANSACTION_STATUS_REJECTED: u8 = 2;
pub const TRANSACTION_STATUS_EXPIRED: u8 = 3;
pub const TRANSACTION_STATUS_INVALIDATED: u8 = 4;
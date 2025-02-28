// src/error.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum MultisigError {
    //---------------------------------------
    // Initialization & Configuration Errors
    //---------------------------------------
    #[msg("The threshold must be greater than 0")]
    InvalidThreshold,

    #[msg("Too many owners (maximum 32)")]
    TooManyOwners,

    #[msg("Duplicate owner address found")]
    DuplicateOwner,

    #[msg("Name too long (maximum 32 bytes)")]
    NameTooLong,

    #[msg("Multisig has not been initialized")]
    MultisigNotInitialized,
    
    #[msg("No owners found in multisig")]
    NoOwnersFound,
    
    #[msg("Maximum number of vaults reached for this multisig")]
    MaxVaultsReached,
    
    #[msg("Invalid timelock period")]
    InvalidTimelock,
    
    #[msg("Multisig is frozen")]
    MultisigFrozen,
    
    //---------------------------------------
    // Access Control Errors
    //---------------------------------------
    #[msg("Not an owner of this multisig")]
    NotAnOwner,
    
    #[msg("User doesn't have required permission")]
    InsufficientPermission,
    
    #[msg("Too many roles (maximum 32)")]
    TooManyRoles,
    
    #[msg("Role not found")]
    RoleNotFound,
    
    //---------------------------------------
    // Transaction Lifecycle Errors
    //---------------------------------------
    #[msg("Already approved this transaction")]
    AlreadyApproved,

    #[msg("Owner set has changed since transaction was created")]
    OwnerSetChanged,

    #[msg("Not enough approvals to execute")]
    NotEnoughApprovals,

    #[msg("Transaction has already been executed")]
    AlreadyExecuted,

    #[msg("Timelock has not passed")]
    TimelockNotPassed,
    
    #[msg("Invalid proposer for transaction")]
    InvalidProposer,
    
    #[msg("Invalid transaction status")]
    InvalidTransactionStatus,
    
    #[msg("Cannot execute transaction")]
    CannotExecuteTransaction,
    
    #[msg("Transaction has not been executed")]
    NotExecuted,
    
    #[msg("Transaction has expired")]
    TransactionExpired,
    
    #[msg("Transaction with this ID already exists")]
    TransactionAlreadyExists,
    
    //---------------------------------------
    // Token Operation Errors
    //---------------------------------------
    #[msg("Token mint mismatch")]
    InvalidMint,
    
    #[msg("Invalid token account owner")]
    InvalidTokenOwner,
    
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
    
    #[msg("Invalid deposit amount")]
    InvalidAmount,

    #[msg("Zero amount specified")]
    ZeroAmount,
    
    #[msg("Invalid recipient address")]
    InvalidRecipient,
    
    //---------------------------------------
    // PDA & Account Validation Errors
    //---------------------------------------
    #[msg("Invalid multisig PDA address")]
    InvalidMultisigAddress,

    #[msg("Invalid vault authority PDA")]
    InvalidVaultAuthority,

    #[msg("Invalid vault PDA address")]
    InvalidVaultAddress,
    
    #[msg("Invalid program ID")]
    InvalidProgramId,
    
    //---------------------------------------
    // Instruction Errors
    //---------------------------------------
    #[msg("Invalid module ID")]
    InvalidModuleId,
    
    #[msg("Invalid instruction ID")]
    InvalidInstructionId,
    
    #[msg("Invalid transaction data")]
    InvalidInstructionData,
    
    //---------------------------------------
    // System Errors
    //---------------------------------------
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
}
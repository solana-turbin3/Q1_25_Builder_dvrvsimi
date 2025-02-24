// src/error.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum MultisigError {
    #[msg("The threshold must be greater than 0")]
    InvalidThreshold,

    #[msg("Too many owners (maximum 32)")]
    TooManyOwners,

    #[msg("Duplicate owner address found")]
    DuplicateOwner,

    #[msg("Name too long (maximum 32 bytes)")]
    NameTooLong,

    #[msg("Invalid multisig PDA address")]
    InvalidMultisigAddress,

    #[msg("Invalid vault authority PDA")]
    InvalidVaultAuthority,

    #[msg("Invalid vault PDA address")]
    InvalidVaultAddress,

    #[msg("Not an owner of this multisig")]
    NotAnOwner,

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
    
    #[msg("Multisig has not been initialized")]
    MultisigNotInitialized,
    
    #[msg("No owners found in multisig")]
    NoOwnersFound,
    
    #[msg("Token mint mismatch")]
    InvalidMint,
    
    #[msg("Invalid token account owner")]
    InvalidTokenOwner,
    
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
    
    #[msg("Invalid deposit amount")]
    InvalidAmount,

    #[msg("Maximum number of vaults reached for this multisig")]
    MaxVaultsReached,

    #[msg("Invalid proposer for transaction")]
    InvalidProposer,
    
    #[msg("Invalid timelock period")]
    InvalidTimelock,
    
    #[msg("Invalid transaction status")]
    InvalidTransactionStatus,
    
    #[msg("Cannot execute transaction")]
    CannotExecuteTransaction,
    
    #[msg("Invalid module ID")]
    InvalidModuleId,
    
    #[msg("Invalid instruction ID")]
    InvalidInstructionId,
    
    #[msg("Multisig is frozen")]
    MultisigFrozen,
}
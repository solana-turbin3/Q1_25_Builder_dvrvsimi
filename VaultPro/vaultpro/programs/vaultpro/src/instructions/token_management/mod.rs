mod create_vault;
mod deposit;
mod withdraw;
mod transfer;

pub use create_vault::*;
pub use deposit::*;
pub use withdraw::*;
pub use transfer::*;

// Event definitions
#[event]
pub struct DepositEvent {
    pub multisig: Pubkey,
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub multisig: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TransferEvent {
    pub source_multisig: Pubkey,
    pub destination_multisig: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}
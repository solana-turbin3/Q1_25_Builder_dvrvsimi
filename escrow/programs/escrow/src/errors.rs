use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Amount expected by initializer is not equal to the amount proposed by taker")]
    AmountMismatch,
    #[msg("Invalid token account owner")]
    InvalidOwner,
}
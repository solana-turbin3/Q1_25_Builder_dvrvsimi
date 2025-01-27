use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub initializer: Pubkey,
    pub temp_token_account: Pubkey,
    pub initializer_token_receive: Pubkey,
    pub expected_amount: u64,
}

impl Escrow {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8;
}
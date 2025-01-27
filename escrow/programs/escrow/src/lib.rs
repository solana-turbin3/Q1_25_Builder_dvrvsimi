use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod constants;
pub mod instructions;

use crate::instructions::{Initialize, Exchange};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        instructions::initialize::handler(ctx, amount)
    }

    pub fn exchange(ctx: Context<Exchange>, amount: u64) -> Result<()> {
        instructions::exchange::handler(ctx, amount)
    }
}
use anchor_lang::prelude::*;

declare_id!("E9iXzh3BwJ2Dz6rrC2aEPxuEAhRzPFr6qT97tJqMGKoD");

#[program]
pub mod vaultpro {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

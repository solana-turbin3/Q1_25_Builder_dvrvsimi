use anchor_lang::prelude::*;

declare_id!("Hr1ebtraa2NChqt3coBK6jJCVEyCjP6QcQSH56HuFR6S");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

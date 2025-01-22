use anchor_lang::prelude::*;

declare_id!("B6NkJW7NH5Y5k26UFetexHZ57G2mQRdRHJ7kaLhpirWg");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

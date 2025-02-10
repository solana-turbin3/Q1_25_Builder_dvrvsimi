use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("E9iXzh3BwJ2Dz6rrC2aEPxuEAhRzPFr6qT97tJqMGKoD");

#[program]
pub mod multisig_wallet {
    use super::*;

    pub fn initialize_multisig(
        ctx: Context<InitializeMultisig>,
        name: String,
        owners: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        let multisig = &mut ctx.accounts.multisig;
        
        // Validate inputs
        require!(threshold > 0, MultisigError::InvalidThreshold);
        require!(threshold <= owners.len() as u8, MultisigError::InvalidThreshold);
        require!(owners.len() <= 32, MultisigError::TooManyOwners);
        require!(name.len() <= 32, MultisigError::NameTooLong);

        // Verify the multisig PDA
        let (expected_multisig, multisig_bump) = Pubkey::find_program_address(
            &[
                b"multisig",
                name.as_bytes(),
            ],
            ctx.program_id
        );
        require!(
            expected_multisig == multisig.key(),
            MultisigError::InvalidMultisigAddress
        );

        // too expensive logic? maybe using deup() would be more efficient
        for (i, owner) in owners.iter().enumerate() {
            for j in (i + 1)..owners.len() {
                require!(*owner != owners[j], MultisigError::DuplicateOwner);
            }
        }

        // Initialize the multisig state
        multisig.name = name;
        multisig.owners = owners;
        multisig.threshold = threshold;
        multisig.nonce = 0;
        multisig.owner_set_seqno = 0;
        multisig.bump = multisig_bump;

        Ok(())
    }

    pub fn create_token_vault(
        ctx: Context<CreateTokenVault>,
        mint: Pubkey,
    ) -> Result<()> {
        // Verify the vault authority PDA
        let (expected_authority, authority_bump) = Pubkey::find_program_address(
            &[
                b"authority",
                ctx.accounts.multisig.key().as_ref()
            ],
            ctx.program_id
        );
        require!(
            expected_authority == ctx.accounts.vault_authority.key(),
            MultisigError::InvalidVaultAuthority
        );

        // Verify the token vault PDA
        let (expected_vault, vault_bump) = Pubkey::find_program_address(
            &[
                b"vault",
                ctx.accounts.multisig.key().as_ref(),
                mint.key().as_ref()
            ],
            ctx.program_id
        );
        require!(
            expected_vault == ctx.accounts.token_vault.key(),
            MultisigError::InvalidVaultAddress
        );

        Ok(())
    }

    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        instruction_data: Vec<u8>,
    ) -> Result<()> {
        let multisig = &ctx.accounts.multisig;
        let transaction = &mut ctx.accounts.transaction;
        let proposer = &ctx.accounts.proposer;

        // Verify proposer is an owner
        require!(
            multisig.owners.contains(proposer.key),
            MultisigError::NotAnOwner
        );

        // Initialize transaction state
        transaction.multisig = multisig.key();
        transaction.proposer = *proposer.key;
        transaction.instruction_data = instruction_data;
        transaction.approvers = vec![*proposer.key];  // Proposer automatically approves
        transaction.created_at = Clock::get()?.unix_timestamp;
        transaction.execute_after = transaction.created_at + 3600;  // 1 hour timelock
        transaction.executed = false;
        transaction.owner_set_seqno = multisig.owner_set_seqno;

        Ok(())
    }

    pub fn approve_transaction(
        ctx: Context<ApproveTransaction>
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let multisig = &ctx.accounts.multisig;
        let owner = &ctx.accounts.owner;

        // Verify owner
        require!(
            multisig.owners.contains(owner.key),
            MultisigError::NotAnOwner
        );

        // Verify owner set hasn't changed
        require!(
            transaction.owner_set_seqno == multisig.owner_set_seqno,
            MultisigError::OwnerSetChanged
        );

        // Verify not already approved
        require!(
            !transaction.approvers.contains(owner.key),
            MultisigError::AlreadyApproved
        );

        // Add approval
        transaction.approvers.push(*owner.key);

        Ok(())
    }

    pub fn execute_transaction(
        ctx: Context<ExecuteTransaction>
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let multisig = &ctx.accounts.multisig;
        let clock = Clock::get()?;

        // Verify enough approvals
        require!(
            transaction.approvers.len() >= multisig.threshold as usize,
            MultisigError::NotEnoughApprovals
        );

        // Verify timelock passed
        require!(
            clock.unix_timestamp >= transaction.execute_after,
            MultisigError::TimelockNotPassed
        );

        // Verify not already executed
        require!(
            !transaction.executed,
            MultisigError::AlreadyExecuted
        );

        // Mark as executed
        transaction.executed = true;

        // TODO: execute the actual ix with CPI
        Ok(())
    }
}


// declare the account structs
#[account]
pub struct MultisigState {
    pub name: String,           // PDA seed
    pub owners: Vec<Pubkey>,    // List of owners
    pub threshold: u8,          // Number of approvals needed
    pub nonce: u8,             // tx counter
    pub owner_set_seqno: u8,    // to track owner set changes, more security
    pub bump: u8,              // Store bump seed for future use
}

#[account]
pub struct Transaction {
    pub multisig: Pubkey,
    pub proposer: Pubkey,
    pub instruction_data: Vec<u8>,
    pub approvers: Vec<Pubkey>,
    pub created_at: i64,
    pub execute_after: i64,
    pub executed: bool,
    pub owner_set_seqno: u8,
}

#[derive(Accounts)]
#[instruction(name: String)] // used only name here because it is needed in the account validation...
pub struct InitializeMultisig<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + (32 * 32) + 8 + 1 + 1 + 1,  // +1 for bump
        seeds = [b"multisig", name.as_bytes()], // in this PDA seed
        bump
    )]
    pub multisig: Account<'info, MultisigState>,
    #[account(mut)]
    pub payer: Signer<'info>,


    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTokenVault<'info> {
    pub multisig: Account<'info, MultisigState>,
    #[account(
        init,
        payer = payer,
        seeds = [b"vault", multisig.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA used as token account authority
    #[account(
        seeds = [b"authority", multisig.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct CreateTransaction<'info> {
    pub multisig: Account<'info, MultisigState>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 1000 + (32 * 32) + 8 + 8 + 1 + 1, // Adjust space as needed
        seeds = [
            b"transaction",
            multisig.key().as_ref(),
            &[multisig.nonce]
        ],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    pub proposer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveTransaction<'info> {
    pub multisig: Account<'info, MultisigState>,
    #[account(
        mut,
        seeds = [
            b"transaction",
            multisig.key().as_ref(),
            &[multisig.nonce]
        ],
        bump,
        constraint = transaction.multisig == multisig.key()
    )]
    pub transaction: Account<'info, Transaction>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    pub multisig: Account<'info, MultisigState>,
    #[account(
        mut,
        seeds = [
            b"transaction",
            multisig.key().as_ref(),
            &[multisig.nonce]
        ],
        bump,
        constraint = transaction.multisig == multisig.key()
    )]
    pub transaction: Account<'info, Transaction>,
    pub executor: Signer<'info>,
}

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
}
# Data Model

The model is built around a core `MULTISIG_ACCOUNT` structure that serves as the main configuration store, using a PDA created from the multisig name. This primary account stores essential information like the list of `owners` (limited to 32), the required number of approvals (`threshold`), a transaction counter (nonce), and a default timelock period. For tracking transactions, separate `TRANSACTION_ACCOUNT` PDAs are created for each proposal, derived from the multisig address and nonce. These transaction accounts maintain crucial data like who proposed it, who has approved it, when it was created, and when it can be executed (`timelock`).

It also includes a `VAULT_ACCOUNT` (a PDA that acts as the authority) which controls multiple TOKEN_ACCOUNTs, allowing the multisig to manage different types of tokens securely. Role-based access control is implemented through **ROLE** and **PERMISSION** structures that define what each member can do and their transaction limits. Rather than storing audit logs as separate accounts on-chain (which would be expensive), the system now uses Solana's native program logs and events, which can be captured and indexed off-chain by the `EventIndexer` service when detailed audit trails are needed. This approach significantly reduces on-chain storage costs while maintaining full transparency and compliance capabilities.


```mermaid
erDiagram
    MULTISIG_ACCOUNT ||--o{ TRANSACTION_ACCOUNT : "has many"
    MULTISIG_ACCOUNT ||--o{ ROLE : "defines"
    ROLE ||--o{ PERMISSION : "has"
    VAULT_ACCOUNT ||--o{ TOKEN_ACCOUNT : "controls"

    MULTISIG_ACCOUNT {
        Pubkey key "PDA seed: 'multisig', name"
        String name "max 32 bytes"
        u8 threshold
        u8 owner_count "max owners"
        Pubkey[] owners "max 32 owners"
        u64 nonce "transaction counter"
        i64 default_timelock
        bool frozen "emergency freeze"
    }

    TRANSACTION_ACCOUNT {
        Pubkey key "PDA: 'tx', multisig, nonce"
        Pubkey multisig
        u64 index "transaction number"
        Pubkey proposer
        Pubkey[] approvers "max 32"
        i64 created_at "unix timestamp"
        i64 execute_after "timelock"
        bool executed
        TransactionInstruction instruction "actual tx data"
    }

    ROLE {
        String name "max 32 bytes"
        u64 max_amount
        Pubkey[] members "max 32"
    }

    PERMISSION {
        bool can_propose
        bool can_approve
        bool can_execute
        bool can_manage_roles
    }

    VAULT_ACCOUNT {
        Pubkey key "PDA: 'vault', multisig"
        Pubkey authority "PDA"
        Pubkey multisig
    }

    TOKEN_ACCOUNT {
        Pubkey key
        Pubkey mint
        u64 amount
        Pubkey owner "vault authority"
    }
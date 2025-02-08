# Program Structure

The SolanaVault Pro multisig system is structured around a central `MultisigProgram` that orchestrates all core operations. This program manages the `MultisigState`, which stores essential configuration like owner addresses and approval thresholds, and handles `Transaction` accounts that track proposed transfers and their approvals. The program also controls a `TokenVault` through a PDA, ensuring secure custody of assets. The relationship between these components is hierarchical, with the `MultisigProgram` serving as the main authority that creates, executes, and manages all aspects of the multisig wallet.

The security and compliance aspects are handled through a role-based access control system, where `Role` and `Permission` structures define what actions different members can perform. Instead of storing audit logs on-chain, the system emits events that can be captured by an optional *`EventIndexer` service for compliance purposes. This architecture leverages Solana's native features for security while keeping the system efficient by minimizing on-chain storage. All these components work together to provide a secure, flexible, and compliant multisig solution that can handle various organizational needs.


```mermaid
classDiagram
    direction LR

    MultisigProgram --|> MultisigState : Manages
    MultisigProgram --|> Transaction : Creates & Executes
    MultisigProgram --|> TokenVault : Controls via PDA
    MultisigProgram ..|> *EventIndexer : Emits events
    MultisigState --|> Role : Contains
    Role --|> Permission : Defines

    class MultisigProgram{
        +initialize_multisig()
        +create_transaction()
        +approve_transaction()
        +execute_transaction()
        +add_owner()
        +remove_owner()
        +change_threshold()
        +emit_event()
    }

    class MultisigState{
        +owners: Vec~Pubkey~
        +threshold: u8
        +transaction_count: u64
        +name: String
        +roles: Vec~Role~
        +default_timelock: i64
    }

    class Transaction{
        +wallet: Pubkey
        +transaction_index: u64
        +proposer: Pubkey
        +approvers: Vec~Pubkey~
        +executed: bool
        +created_at: i64
        +execute_after: i64
        +required_roles: Vec~Role~
    }

    class TokenVault{
        +vault_authority: PDA
        +token_account: Pubkey
        +mint: Pubkey
    }

    class Role{
        +name: String
        +permissions: Vec~Permission~
        +max_amount: u64
        +assigned_members: Vec~Pubkey~
    }

    class Permission{
        +can_propose: bool
        +can_approve: bool
        +can_execute: bool
        +can_manage_roles: bool
    }

    class *EventIndexer{
        +index_program_events()
        +store_transaction_logs()
        +generate_audit_reports()
    }


    * `getProgramAccounts` and `getSignaturesForAddress` can handle `EventIndexer` task? All transaction history and audit data can be fetched directly through Solana's RPC methods.
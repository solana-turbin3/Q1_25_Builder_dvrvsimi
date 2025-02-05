# User Flow

When a user interacts with SolanaVault Pro, they begin with either setting up a new multisig vault or accessing an existing one. For new vaults, the setup flow involves initializing the multisig, adding up to 32 owners, configuring roles (like admin, proposer, or approver) with specific permissions, setting approval thresholds (how many signatures are needed), and optionally enabling timelock security. Each owner gets assigned specific roles that determine what actions they can perform within the system, ensuring proper access control from the start.

Once the vault is set up, users primarily engage with the transaction flow and admin flow. In the transaction flow, authorized users can propose new transactions, which then require approvals from other owners based on their roles and the set threshold. If timelock is enabled, even after getting all required approvals, transactions must wait for the specified timelock period before execution. Meanwhile, the admin flow allows privileged users to manage member roles, update approval thresholds, and modify security settings like timelock duration. Throughout all these flows, the system emits events that can be indexed off-chain for audit trail purposes, maintaining transparency and compliance without incurring excessive on-chain storage costs.


```mermaid
flowchart TD
    subgraph Setup Flow
        A[Start] --> B[Initialize Multisig]
        B --> C[Add Owners]
        C --> D[Configure Roles]
        D --> E[Set Thresholds]
        E --> F[Set Timelock]
    end

    subgraph Transaction Flow
        G[Propose Transaction] --> H{Has Required Role?}
        H -->|Yes| I[Create Transaction]
        H -->|No| J[Access Denied]
        I --> K[Other Owners Approve]
        K --> L{Enough Approvals?}
        L -->|Yes| M{Timelock Expired?}
        L -->|No| K
        M -->|Yes| N[Execute Transaction]
        M -->|No| O[Wait for Timelock]
    end

    subgraph Admin Flow
        P[Access Admin Panel] --> Q{Is Admin?}
        Q -->|Yes| R[Manage Roles]
        Q -->|No| S[View Only Access]
        R --> T[Update Members]
        R --> U[Adjust Thresholds]
        R --> V[Modify Timelocks]
    end

    %% Connect the flows
    F --> G
    N --> P
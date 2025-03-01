// tests/utils/enums.ts

/**
 * Role types in the multisig system
 */
export enum RoleType {
    Admin = 0,
    Approver = 1,
    Proposer = 2,
    Executor = 3,
  }
  
  /**
   * Transaction status codes
   */
  export enum TransactionStatus {
    Pending = 0,
    Executed = 1,
    Rejected = 2,
    Expired = 3,
  }
  
  /**
   * Role permissions
   */
  export enum RolePermission {
    Propose = 0,
    Approve = 1,
    Execute = 2,
    ModifyRoles = 3,
  }
// src/state/access.rs
use anchor_lang::prelude::*;

/// Role types for the multisig
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoleType {
    Admin = 0,
    Approver = 1,
    Proposer = 2, 
    Executor = 3,
}

impl RoleType {
    // Convert a u8 to RoleType safely
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(RoleType::Admin),
            1 => Some(RoleType::Approver),
            2 => Some(RoleType::Proposer),
            3 => Some(RoleType::Executor),
            _ => None,
        }
    }
    
    // Get the name of the role
    pub fn name(&self) -> &'static str {
        match self {
            RoleType::Admin => "Admin",
            RoleType::Approver => "Approver",
            RoleType::Proposer => "Proposer",
            RoleType::Executor => "Executor",
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Role {
    pub role_type: RoleType,     // Role type from enum
    pub user: Pubkey,            // User assigned to this role
    pub can_propose: bool,       // Permission to propose transactions
    pub can_approve: bool,       // Permission to approve transactions
    pub can_execute: bool,       // Permission to execute transactions
    pub can_modify_roles: bool,  // Permission to change roles
    pub max_amount: Option<u64>, // Optional limit for token operations
    pub valid_until: Option<i64>, // Optional role expiration timestamp
}

impl Role {
    pub fn new(
        role_type: RoleType, 
        user: Pubkey, 
        can_propose: bool, 
        can_approve: bool, 
        can_execute: bool,
        can_modify_roles: bool,
        max_amount: Option<u64>,
        valid_until: Option<i64>,
    ) -> Self {
        Self {
            role_type,
            user,
            can_propose,
            can_approve,
            can_execute,
            can_modify_roles,
            max_amount,
            valid_until,
        }
    }
    
    /// Create a standard admin role
    pub fn new_admin(user: Pubkey) -> Self {
        Self {
            role_type: RoleType::Admin,
            user,
            can_propose: true,
            can_approve: true,
            can_execute: true,
            can_modify_roles: true,
            max_amount: None,  // No limit
            valid_until: None, // No expiration
        }
    }
    
    /// Create a standard approver role
    pub fn new_approver(user: Pubkey) -> Self {
        Self {
            role_type: RoleType::Approver,
            user,
            can_propose: false,
            can_approve: true,
            can_execute: false,
            can_modify_roles: false,
            max_amount: None,
            valid_until: None,
        }
    }
    
    /// Create a standard proposer role
    pub fn new_proposer(user: Pubkey, max_amount: Option<u64>) -> Self {
        Self {
            role_type: RoleType::Proposer,
            user,
            can_propose: true,
            can_approve: false,
            can_execute: false,
            can_modify_roles: false,
            max_amount,
            valid_until: None,
        }
    }
    
    /// Check if this role has required permission
    pub fn has_permission(&self, permission_type: RolePermission) -> bool {
        // First check if the role has expired
        if let Some(expiry) = self.valid_until {
            if let Ok(clock) = Clock::get() {
                if clock.unix_timestamp > expiry {
                    return false;
                }
            } else {
                return false;
            }
        }
        
        match permission_type {
            RolePermission::Propose => self.can_propose,
            RolePermission::Approve => self.can_approve,
            RolePermission::Execute => self.can_execute,
            RolePermission::ModifyRoles => self.can_modify_roles,
        }
    }
    
    /// Check if this role can approve a transaction with a given amount
    pub fn can_approve_amount(&self, amount: u64) -> bool {
        if !self.can_approve {
            return false;
        }
        
        if let Some(max) = self.max_amount {
            return amount <= max;
        }
        
        true
    }
    
    /// Check if the role is active
    pub fn is_active(&self) -> bool {
        if let Some(expiry) = self.valid_until {
            if let Ok(clock) = Clock::get() {
                return clock.unix_timestamp <= expiry;
            }
            return false;
        }
        true
    }
}

/// Helper enum for checking permissions
pub enum RolePermission {
    Propose,
    Approve,
    Execute,
    ModifyRoles,
}
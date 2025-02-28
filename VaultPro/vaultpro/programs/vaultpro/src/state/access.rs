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
    pub can_propose: bool,
    pub can_approve: bool,
    pub can_execute: bool,
    pub can_modify_roles: bool, 
}

impl Role {
    pub fn new(
        role_type: RoleType, 
        user: Pubkey, 
        can_propose: bool, 
        can_approve: bool, 
        can_execute: bool,
        can_modify_roles: bool,
    ) -> Self {
        Self {
            role_type,
            user,
            can_propose,
            can_approve,
            can_execute,
            can_modify_roles,
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
        }
    }
    
    /// Create a standard proposer role
    pub fn new_proposer(user: Pubkey) -> Self {
        Self {
            role_type: RoleType::Proposer,
            user,
            can_propose: true,
            can_approve: false,
            can_execute: false,
            can_modify_roles: false,
        }
    }
    
    /// Check if this role has required permission
    pub fn has_permission(&self, permission_type: RolePermission) -> bool {
        match permission_type {
            RolePermission::Propose => self.can_propose,
            RolePermission::Approve => self.can_approve,
            RolePermission::Execute => self.can_execute,
            RolePermission::ModifyRoles => self.can_modify_roles,
        }
    }
}

/// Helper enum for checking permissions
pub enum RolePermission {
    Propose,
    Approve,
    Execute,
    ModifyRoles,
}
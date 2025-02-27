// src/state/access.rs
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Role {
    pub name: String,          // Role name (e.g., "admin", "approver")
    pub user: Pubkey,          // User assigned to this role
    pub can_propose: bool,     // Permission to propose transactions
    pub can_approve: bool,     // Permission to approve transactions
    pub can_execute: bool,     // Permission to execute transactions
}

impl Role {
    pub fn new(
        name: String, 
        user: Pubkey, 
        can_propose: bool, 
        can_approve: bool, 
        can_execute: bool
    ) -> Self {
        Self {
            name,
            user,
            can_propose,
            can_approve,
            can_execute,
        }
    }
    
    // Check if this role has required permission
    pub fn has_permission(&self, permission_type: RolePermission) -> bool {
        match permission_type {
            RolePermission::Propose => self.can_propose,
            RolePermission::Approve => self.can_approve,
            RolePermission::Execute => self.can_execute,
        }
    }
}

// Helper enum for checking permissions
pub enum RolePermission {
    Propose,
    Approve,
    Execute,
}
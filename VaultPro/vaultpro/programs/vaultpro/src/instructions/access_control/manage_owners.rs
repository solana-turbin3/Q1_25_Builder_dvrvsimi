// src/instructions/access_control/manage_roles.rs
use anchor_lang::prelude::*;
use crate::state::{MultisigState, Transaction, Role, RoleType, RolePermission};
use crate::error::MultisigError;

#[derive(Accounts)]
pub struct ManageRoles<'info> {
    #[account(
        mut,
        constraint = multisig.initialized @ MultisigError::MultisigNotInitialized,
        constraint = multisig.is_owner(&admin.key()) @ MultisigError::NotAnOwner,
    )]
    pub multisig: Account<'info, MultisigState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
}

// Define parameters for direct role assignment (not through a transaction)
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ManageRolesParams {
    pub user: Pubkey,
    pub role_type: u8,
    pub add_role: bool, // true = add/update, false = remove
    pub permissions: Option<RolePermissions>, // Only needed for add/update
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RolePermissions {
    pub can_propose: bool,
    pub can_approve: bool,
    pub can_execute: bool,
    pub can_modify_roles: bool,
}

pub fn manage_roles(
    context: Context<ManageRoles>,
    params: ManageRolesParams,
) -> Result<()> {
    let multisig = &mut context.accounts.multisig;
    let admin = &context.accounts.admin;
    
    // Verify admin has role management permission
    let admin_has_permission = multisig.roles
        .iter()
        .any(|role| 
            role.user == admin.key() && 
            role.has_permission(RolePermission::ModifyRoles)
        );
    
    require!(
        admin_has_permission || multisig.owners.contains(&admin.key()),
        MultisigError::InsufficientPermission
    );
    
    // Convert role type from u8 to enum
    let role_type = RoleType::from_u8(params.role_type)
        .ok_or(MultisigError::InvalidInstructionData)?;
    
    if params.add_role {
        // Adding or updating a role
        require!(params.permissions.is_some(), MultisigError::InvalidInstructionData);
        let permissions = params.permissions.unwrap();
        
        // Create the new role
        let role = Role::new(
            role_type,
            params.user,
            permissions.can_propose,
            permissions.can_approve,
            permissions.can_execute,
            permissions.can_modify_roles,
        );
        
        // Find if the role already exists
        let role_position = multisig.roles
            .iter()
            .position(|r| r.user == params.user && r.role_type == role_type);
        
        if let Some(pos) = role_position {
            // Update existing role
            multisig.roles[pos] = role;
            msg!("Updated role {:?} for user {}", role_type, params.user);
        } else {
            // Add new role
            require!(multisig.roles.len() < 32, MultisigError::TooManyRoles);
            multisig.roles.push(role);
            msg!("Added role {:?} for user {}", role_type, params.user);
        }
    } else {
        // Removing a role
        let role_position = multisig.roles
            .iter()
            .position(|r| r.user == params.user && r.role_type == role_type)
            .ok_or(MultisigError::RoleNotFound)?;
        
        // Remove the role
        multisig.roles.remove(role_position);
        msg!("Removed role {:?} from user {}", role_type, params.user);
    }
    
    // Event emission would be here
    
    Ok(())
}
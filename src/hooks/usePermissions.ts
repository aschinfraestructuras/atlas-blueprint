/**
 * usePermissions — centralized, DB-driven permission resolver.
 *
 * Queries the user's role from project_members once, then exposes
 * typed boolean flags per action per module. Replaces the old
 * hardcoded ROLE_CAN matrix in useProjectRole.
 *
 * The role is fetched via the security-definer RPC `get_project_role`
 * to avoid RLS recursion.
 */

import { useProjectRole, type ProjectRole } from "./useProjectRole";

// ─── Permission matrix (single source of truth) ─────────────────────────────

export interface PermissionSet {
  create: boolean;
  edit: boolean;
  delete: boolean;
  validate: boolean;
  approve: boolean;
  viewAudit: boolean;
  manageMembers: boolean;
  export: boolean;
}

const EMPTY: PermissionSet = {
  create: false,
  edit: false,
  delete: false,
  validate: false,
  approve: false,
  viewAudit: false,
  manageMembers: false,
  export: false,
};

const PERMISSIONS_BY_ROLE: Record<string, PermissionSet> = {
  admin: {
    create: true,
    edit: true,
    delete: true,
    validate: true,
    approve: true,
    viewAudit: true,
    manageMembers: true,
    export: true,
  },
  project_manager: {
    create: true,
    edit: true,
    delete: false,
    validate: true,
    approve: true,
    viewAudit: true,
    manageMembers: false,
    export: true,
  },
  quality_manager: {
    create: true,
    edit: true,
    delete: false,
    validate: true,
    approve: true,
    viewAudit: true,
    manageMembers: false,
    export: true,
  },
  technician: {
    create: true,
    edit: true,
    delete: false,
    validate: false,
    approve: false,
    viewAudit: false,
    manageMembers: false,
    export: true,
  },
  viewer: {
    create: false,
    edit: false,
    delete: false,
    validate: false,
    approve: false,
    viewAudit: false,
    manageMembers: false,
    export: true,
  },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const {
    role,
    loading,
    isAdmin,
    isManager,
    isQuality,
  } = useProjectRole();

  const perms: PermissionSet = role
    ? (PERMISSIONS_BY_ROLE[role] ?? EMPTY)
    : EMPTY;

  return {
    role,
    loading,
    permissions: perms,
    // Convenience shortcuts
    canCreate: perms.create,
    canEdit: perms.edit,
    canDelete: perms.delete,
    canValidate: perms.validate,
    canApprove: perms.approve,
    canViewAudit: perms.viewAudit,
    canManageMembers: perms.manageMembers,
    canExport: perms.export,
    // Role-level helpers
    isAdmin,
    isManager,
    isQuality,
  };
}

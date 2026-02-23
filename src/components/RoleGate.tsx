import React from "react";
import { useProjectRole } from "@/hooks/useProjectRole";

interface RoleGateProps {
  /** The permission action to check (e.g. "create", "edit", "delete", "validate", "viewAudit") */
  action: string;
  /** Content shown when permission is granted */
  children: React.ReactNode;
  /** Optional fallback when permission is denied (defaults to nothing) */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on the user's project role permissions.
 * Usage: <RoleGate action="create"><Button>New</Button></RoleGate>
 */
export function RoleGate({ action, children, fallback = null }: RoleGateProps) {
  const { can, loading } = useProjectRole();
  if (loading) return null;
  return can(action) ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Only renders for project admins */
export function RoleGateAdmin({ children, fallback = null }: RoleGateAdminProps) {
  const { isAdmin, loading } = useProjectRole();
  if (loading) return null;
  return isAdmin ? <>{children}</> : <>{fallback}</>;
}

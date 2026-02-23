import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";

export type ProjectRole = "admin" | "project_manager" | "quality_manager" | "technician" | "viewer" | null;

/** Permission matrix — what each role can do */
const ROLE_CAN: Record<string, Record<string, boolean>> = {
  admin:           { create: true, edit: true, delete: true, validate: true, viewAudit: true, manageMembers: true },
  project_manager: { create: true, edit: true, delete: false, validate: true, viewAudit: true, manageMembers: false },
  quality_manager: { create: true, edit: true, delete: false, validate: true, viewAudit: true, manageMembers: false },
  technician:      { create: true, edit: true, delete: false, validate: false, viewAudit: false, manageMembers: false },
  viewer:          { create: false, edit: false, delete: false, validate: false, viewAudit: false, manageMembers: false },
};

export function useProjectRole() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [role, setRole] = useState<ProjectRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProject) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("project_members")
          .select("role")
          .eq("project_id", activeProject.id)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!cancelled) {
          setRole(error || !data ? null : (data.role as ProjectRole));
        }
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, activeProject]);

  const can = (action: string): boolean => {
    if (!role) return false;
    return ROLE_CAN[role]?.[action] ?? false;
  };

  const isAdmin = role === "admin";
  const isManager = role === "admin" || role === "project_manager";
  const isQuality = role === "quality_manager" || isManager;
  const canCreate = can("create");
  const canEdit = can("edit");
  const canDelete = can("delete");
  const canValidate = can("validate");

  return {
    role,
    loading,
    can,
    isAdmin,
    isManager,
    isQuality,
    canCreate,
    canEdit,
    canDelete,
    canValidate,
  };
}

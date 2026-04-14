import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { type PermissionSet, PERMISSIONS_BY_ROLE } from "./usePermissions";

export type ProjectRole = "admin" | "project_manager" | "quality_manager" | "technician" | "viewer" | null;

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
        const { data, error } = await supabase.rpc('get_project_role', {
          _user_id: user.id,
          _project_id: activeProject.id,
        });

        if (!cancelled) {
          setRole(error || !data ? null : (data as ProjectRole));
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
    return PERMISSIONS_BY_ROLE[role]?.[action as keyof PermissionSet] ?? false;
  };

  const isAdmin = role === "admin";
  const isManager = role === "admin" || role === "project_manager";
  const isQuality = role === "quality_manager" || isManager;
  const isViewer = role === "viewer";
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
    isViewer,
    canCreate,
    canEdit,
    canDelete,
    canValidate,
  };
}

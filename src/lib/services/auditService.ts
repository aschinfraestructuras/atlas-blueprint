import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: number;
  project_id: string | null;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  diff: unknown;
  module: string | null;
  performed_by: string | null;
  created_at: string;
}

export const auditService = {
  async getByProject(projectId: string): Promise<AuditEntry[]> {
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, project_id, user_id, entity, entity_id, action, diff, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      module: null,
      performed_by: null,
    })) as AuditEntry[];
  },
};

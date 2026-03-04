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
  description: string | null;
  created_at: string;
  user_display_name: string | null;
}

export const auditService = {
  async getByProject(projectId: string, filters?: { module?: string; dateFrom?: string; dateTo?: string }): Promise<AuditEntry[]> {
    let query = (supabase as any)
      .from("vw_audit_log")
      .select("id, project_id, user_id, entity, entity_id, action, diff, module, performed_by, description, created_at, user_display_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (filters?.module) {
      query = query.eq("module", filters.module);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      // add 1 day to include the entire day
      const d = new Date(filters.dateTo);
      d.setDate(d.getDate() + 1);
      query = query.lt("created_at", d.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AuditEntry[];
  },

  async log({
    projectId,
    entity,
    entityId,
    action,
    module,
    description,
    diff,
  }: {
    projectId: string;
    entity: string;
    entityId?: string | null;
    action: string;
    module?: string;
    description?: string;
    diff?: Record<string, unknown>;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("audit_log").insert({
      project_id: projectId,
      user_id: user.id,
      performed_by: user.id,
      entity,
      entity_id: entityId ?? null,
      action,
      module: module ?? entity,
      description: description ?? null,
      diff: diff ?? null,
    });
    if (error) console.error("Audit log error:", error.message);
  },
};

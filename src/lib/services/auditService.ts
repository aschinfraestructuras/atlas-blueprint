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
      .select("id, project_id, user_id, entity, entity_id, action, diff, module, performed_by, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as AuditEntry[];
  },

  async log({
    projectId,
    entity,
    entityId,
    action,
    module,
    diff,
  }: {
    projectId: string;
    entity: string;
    entityId?: string | null;
    action: string;
    module?: string;
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
      diff: diff ?? null,
    });
    if (error) console.error("Audit log error:", error.message);
  },
};

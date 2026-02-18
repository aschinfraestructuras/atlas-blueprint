// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase } from "@/integrations/supabase/client";

export interface NonConformity {
  id: string;
  project_id: string;
  reference: string | null;
  description: string;
  severity: string;
  status: string;
  responsible: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ncService = {
  async getByProject(projectId: string): Promise<NonConformity[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("non_conformities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as NonConformity[];
  },

  async getOpenCount(projectId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from("non_conformities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("status", "closed");
    if (error) throw error;
    return count ?? 0;
  },
};

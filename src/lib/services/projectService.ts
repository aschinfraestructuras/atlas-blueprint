import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Project[];
  },

  async getActiveCount(): Promise<number> {
    const { count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (error) throw error;
    return count ?? 0;
  },
};

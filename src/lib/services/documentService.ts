import { supabase } from "@/integrations/supabase/client";

export interface Document {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  revision: string | null;
  status: string;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: string;
  tags: string[] | null;
  issued_at: string | null;
}

export const documentService = {
  async getByProject(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Document[];
  },

  async getPendingCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("status", "approved");
    if (error) throw error;
    return count ?? 0;
  },
};

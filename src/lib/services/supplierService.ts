import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  status: string;
  approval_status: string;
  nif_cif: string | null;
  contacts: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const supplierService = {
  async getByProject(projectId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Supplier[];
  },
};

import { supabase } from "@/integrations/supabase/client";

export interface TestResult {
  id: string;
  project_id: string;
  test_id: string;
  status: string;
  sample_ref: string | null;
  result: Record<string, unknown> | null;
  date: string;
  location: string | null;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
  tests_catalog?: {
    id: string;
    name: string;
    code: string;
    standard: string | null;
  };
}

export const testService = {
  async getByProject(projectId: string): Promise<TestResult[]> {
    const { data, error } = await supabase
      .from("test_results")
      .select("*, tests_catalog(id, name, code, standard)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TestResult[];
  },

  async getPendingCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("test_results")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "pending");
    if (error) throw error;
    return count ?? 0;
  },
};

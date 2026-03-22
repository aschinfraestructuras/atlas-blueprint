import { supabase } from "@/integrations/supabase/client";

export interface ProjectWorker {
  id: string;
  project_id: string;
  subcontractor_id: string | null;
  company: string | null;
  name: string;
  role_function: string | null;
  worker_number: string | null;
  has_safety_training: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWorkerInput {
  project_id: string;
  subcontractor_id?: string | null;
  company?: string | null;
  name: string;
  role_function?: string | null;
  worker_number?: string | null;
  has_safety_training?: boolean;
  status?: string;
  notes?: string | null;
}

export const projectWorkerService = {
  async list(projectId: string, subcontractorId?: string | null): Promise<ProjectWorker[]> {
    let q = supabase
      .from("project_workers")
      .select("*")
      .eq("project_id", projectId)
      .order("name");

    if (subcontractorId === null) {
      q = q.is("subcontractor_id", null);
    } else if (subcontractorId) {
      q = q.eq("subcontractor_id", subcontractorId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ProjectWorker[];
  },

  async create(input: ProjectWorkerInput): Promise<ProjectWorker> {
    const { data, error } = await supabase
      .from("project_workers")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as ProjectWorker;
  },

  async update(id: string, fields: Partial<ProjectWorkerInput>): Promise<ProjectWorker> {
    const { data, error } = await supabase
      .from("project_workers")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as ProjectWorker;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("project_workers").delete().eq("id", id);
    if (error) throw error;
  },
};

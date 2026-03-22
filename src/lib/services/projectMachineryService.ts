import { supabase } from "@/integrations/supabase/client";

export interface ProjectMachinery {
  id: string;
  project_id: string;
  subcontractor_id: string | null;
  company: string | null;
  designation: string;
  type: string | null;
  plate: string | null;
  serial_number: string | null;
  sound_power_db: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMachineryInput {
  project_id: string;
  subcontractor_id?: string | null;
  company?: string | null;
  designation: string;
  type?: string | null;
  plate?: string | null;
  serial_number?: string | null;
  sound_power_db?: number | null;
  status?: string;
  notes?: string | null;
}

export const projectMachineryService = {
  async list(projectId: string, subcontractorId?: string | null): Promise<ProjectMachinery[]> {
    let q = supabase
      .from("project_machinery")
      .select("*")
      .eq("project_id", projectId)
      .order("designation");

    if (subcontractorId === null) {
      q = q.is("subcontractor_id", null);
    } else if (subcontractorId) {
      q = q.eq("subcontractor_id", subcontractorId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ProjectMachinery[];
  },

  async create(input: ProjectMachineryInput): Promise<ProjectMachinery> {
    const { data, error } = await supabase
      .from("project_machinery")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as ProjectMachinery;
  },

  async update(id: string, fields: Partial<ProjectMachineryInput>): Promise<ProjectMachinery> {
    const { data, error } = await supabase
      .from("project_machinery")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as ProjectMachinery;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("project_machinery").delete().eq("id", id);
    if (error) throw error;
  },
};

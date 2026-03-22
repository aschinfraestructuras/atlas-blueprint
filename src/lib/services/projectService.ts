import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string | null;
  location: string | null;
  contractor: string | null;
  contract_number: string | null;
  start_date: string | null;
  status: string;
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
}

export interface ProjectInsert {
  name: string;
  code: string;
  client?: string;
  location?: string;
  start_date?: string;
  status: string;
  created_by: string;
}

export interface ProjectUpdate {
  name?: string;
  code?: string;
  client?: string;
  location?: string;
  start_date?: string;
  status?: string;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Project[];
  },

  async create(payload: ProjectInsert): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const project = data as Project;

    // Ensure creator is inserted as admin member (trigger also handles this,
    // but explicit insert guarantees it in case trigger is delayed).
    await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: payload.created_by, role: "admin" })
      .select()
      .maybeSingle(); // ignore unique-conflict errors silently

    return project;
  },

  async update(id: string, payload: ProjectUpdate): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) throw error;
  },

  async unarchive(id: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .update({ status: "active" })
      .eq("id", id);
    if (error) throw error;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .update({ status: "inactive" })
      .eq("id", id);
    if (error) throw error;
  },

  async isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("code", code);
    if (excludeId) query = query.neq("id", excludeId);
    const { count, error } = await query;
    if (error) throw error;
    return (count ?? 0) === 0;
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

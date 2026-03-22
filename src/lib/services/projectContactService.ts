import { supabase } from "@/integrations/supabase/client";

export interface ProjectContact {
  id: string;
  project_id: string;
  name: string;
  email: string;
  company: string | null;
  role_title: string | null;
  role_type: string;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export type ProjectContactInput = Omit<ProjectContact, "id" | "created_at">;

export const projectContactService = {
  async list(projectId: string): Promise<ProjectContact[]> {
    const { data, error } = await (supabase as any)
      .from("project_contacts")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    if (error) throw error;
    return (data ?? []) as ProjectContact[];
  },

  async create(input: ProjectContactInput): Promise<ProjectContact> {
    const { data, error } = await (supabase as any)
      .from("project_contacts")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as ProjectContact;
  },

  async update(id: string, fields: Partial<ProjectContactInput>): Promise<void> {
    const { error } = await (supabase as any)
      .from("project_contacts")
      .update(fields)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("project_contacts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

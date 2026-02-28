import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface TechnicalOfficeItem {
  id: string;
  project_id: string;
  created_by: string;
  type: string;        // RFI | Submittal | Clarification
  title: string;
  description: string | null;
  status: string;      // open | in_progress | closed | cancelled
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicalOfficeItemInput {
  project_id: string;
  created_by: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
}

export const technicalOfficeService = {
  async getByProject(projectId: string): Promise<TechnicalOfficeItem[]> {
    const { data, error } = await supabase
      .from("technical_office_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TechnicalOfficeItem[];
  },

  async create(input: TechnicalOfficeItemInput): Promise<TechnicalOfficeItem> {
    const { data, error } = await supabase
      .from("technical_office_items")
      .insert({
        project_id: input.project_id,
        created_by: input.created_by,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "open",
        due_date: input.due_date ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "technical_office_items",
      entityId: (data as TechnicalOfficeItem).id,
      action: "INSERT",
      module: "technicalOffice",
      diff: { type: input.type, title: input.title, status: input.status ?? "open" },
    });
    return data as TechnicalOfficeItem;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<TechnicalOfficeItemInput, "project_id" | "created_by">>
  ): Promise<TechnicalOfficeItem> {
    const { data, error } = await supabase
      .from("technical_office_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "technical_office_items",
      entityId: id,
      action: "UPDATE",
      module: "technicalOffice",
      diff: updates as Record<string, unknown>,
    });
    return data as TechnicalOfficeItem;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase.from("technical_office_items").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "technical_office_items", entityId: id, action: "DELETE", module: "technicalOffice" });
  },
};

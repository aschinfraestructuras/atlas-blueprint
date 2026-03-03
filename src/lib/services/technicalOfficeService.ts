import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export const TECH_OFFICE_TYPES = ["RFI", "SUBMITTAL", "TRANSMITTAL", "CLARIFICATION", "APPROVAL_REQUEST", "CHANGE_NOTICE"] as const;
export type TechOfficeType = typeof TECH_OFFICE_TYPES[number];

export const TECH_OFFICE_STATUSES = ["draft", "open", "in_review", "in_progress", "responded", "closed", "cancelled", "archived"] as const;
export type TechOfficeStatus = typeof TECH_OFFICE_STATUSES[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export interface TechnicalOfficeItem {
  id: string;
  project_id: string;
  created_by: string;
  code: string | null;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  recipient: string | null;
  assigned_to: string | null;
  due_date: string | null;
  deadline: string | null;
  responded_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  nc_id: string | null;
  work_item_id: string | null;
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
  priority?: string;
  recipient?: string;
  assigned_to?: string;
  due_date?: string;
  deadline?: string;
  work_item_id?: string | null;
  nc_id?: string | null;
}

export interface TechOfficeMessage {
  id: string;
  item_id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

export const technicalOfficeService = {
  async getByProject(projectId: string): Promise<TechnicalOfficeItem[]> {
    const { data, error } = await supabase
      .from("technical_office_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TechnicalOfficeItem[];
  },

  async getById(id: string): Promise<TechnicalOfficeItem> {
    const { data, error } = await supabase
      .from("technical_office_items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as TechnicalOfficeItem;
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
        priority: input.priority ?? "normal",
        recipient: input.recipient ?? null,
        assigned_to: input.assigned_to ?? null,
        due_date: input.due_date ?? null,
        deadline: input.deadline ?? null,
        work_item_id: input.work_item_id ?? null,
        nc_id: input.nc_id ?? null,
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
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
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

  async changeStatus(id: string, projectId: string, newStatus: string): Promise<TechnicalOfficeItem> {
    const respondedAt = newStatus === "responded" ? new Date().toISOString() : undefined;
    const updatePayload: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (respondedAt) updatePayload.responded_at = respondedAt;

    const { data, error } = await supabase
      .from("technical_office_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "technical_office_items",
      entityId: id,
      action: "STATUS_CHANGE",
      module: "technicalOffice",
      diff: { status: newStatus },
    });
    return data as TechnicalOfficeItem;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("technical_office_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id, status: "cancelled" } as any)
      .eq("id", id);
    await auditService.log({ projectId, entity: "technical_office_items", entityId: id, action: "DELETE", module: "technicalOffice" });
  },

  async restore(id: string, projectId: string): Promise<void> {
    await supabase
      .from("technical_office_items")
      .update({ is_deleted: false, deleted_at: null, deleted_by: null, status: "open" } as any)
      .eq("id", id);
    await auditService.log({ projectId, entity: "technical_office_items", entityId: id, action: "UPDATE", module: "technicalOffice", description: "Restored" });
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase.from("technical_office_items").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "technical_office_items", entityId: id, action: "DELETE", module: "technicalOffice" });
  },

  // Messages
  async getMessages(itemId: string): Promise<TechOfficeMessage[]> {
    const { data, error } = await (supabase as any)
      .from("technical_office_messages")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as TechOfficeMessage[];
  },

  async addMessage(itemId: string, projectId: string, userId: string, message: string): Promise<TechOfficeMessage> {
    const { data, error } = await (supabase as any)
      .from("technical_office_messages")
      .insert({ item_id: itemId, user_id: userId, message })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "technical_office_messages",
      entityId: (data as TechOfficeMessage).id,
      action: "INSERT",
      module: "technicalOffice",
      description: "Mensagem adicionada",
    });
    return data as TechOfficeMessage;
  },
};

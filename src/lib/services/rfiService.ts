import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface Rfi {
  id: string;
  project_id: string;
  code: string;
  subject: string;
  description: string | null;
  zone: string | null;
  work_item_id: string | null;
  recipient: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  created_by: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  nc_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RfiMessage {
  id: string;
  rfi_id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
  // joined
  user_email?: string;
  user_name?: string;
}

export interface RfiInput {
  project_id: string;
  subject: string;
  description?: string;
  zone?: string;
  work_item_id?: string | null;
  recipient?: string | null;
  priority?: string;
  deadline?: string;
  created_by: string;
}

export const rfiService = {
  async getByProject(projectId: string): Promise<Rfi[]> {
    const { data, error } = await (supabase as any)
      .from("rfis")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Rfi[];
  },

  /** Server-side paginated query */
  async getByProjectPaginated(
    projectId: string,
    options: {
      from: number;
      to: number;
      status?: string;
      search?: string;
    },
  ): Promise<{ data: Rfi[]; count: number }> {
    let q = (supabase as any)
      .from("rfis")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(options.from, options.to);

    if (options.status && options.status !== "all") q = q.eq("status", options.status);
    if (options.search) q = q.or(`subject.ilike.%${options.search}%,code.ilike.%${options.search}%`);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data: (data ?? []) as Rfi[], count: count ?? 0 };
  },

  async getById(id: string): Promise<Rfi> {
    const { data, error } = await (supabase as any)
      .from("rfis")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Rfi;
  },

  async create(input: RfiInput): Promise<Rfi> {
    const { data, error } = await (supabase as any)
      .from("rfis")
      .insert({
        project_id: input.project_id,
        subject: input.subject,
        description: input.description ?? null,
        zone: input.zone ?? null,
        work_item_id: input.work_item_id ?? null,
        recipient: input.recipient ?? null,
        priority: input.priority ?? "normal",
        deadline: input.deadline ?? null,
        created_by: input.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "rfis",
      entityId: (data as Rfi).id,
      action: "INSERT",
      module: "technicalOffice",
      description: `RFI criado: ${input.subject}`,
      diff: { subject: input.subject, priority: input.priority ?? "normal" },
    });
    return data as Rfi;
  },

  async update(id: string, projectId: string, updates: Partial<Rfi>): Promise<Rfi> {
    const { data, error } = await (supabase as any)
      .from("rfis")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "rfis",
      entityId: id,
      action: "UPDATE",
      module: "technicalOffice",
      diff: updates as Record<string, unknown>,
    });
    return data as Rfi;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any)
      .from("rfis")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id, status: "cancelled" })
      .eq("id", id);
    await auditService.log({
      projectId,
      entity: "rfis",
      entityId: id,
      action: "DELETE",
      module: "technicalOffice",
      description: "RFI eliminado (soft delete para rastreabilidade)",
    });
  },

  // Messages
  async getMessages(rfiId: string): Promise<RfiMessage[]> {
    const { data, error } = await (supabase as any)
      .from("rfi_messages")
      .select("*")
      .eq("rfi_id", rfiId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as RfiMessage[];
  },

  async addMessage(rfiId: string, projectId: string, userId: string, message: string, attachmentUrl?: string): Promise<RfiMessage> {
    const { data, error } = await (supabase as any)
      .from("rfi_messages")
      .insert({
        rfi_id: rfiId,
        user_id: userId,
        message,
        attachment_url: attachmentUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "rfi_messages",
      entityId: (data as RfiMessage).id,
      action: "INSERT",
      module: "technicalOffice",
      description: `Mensagem adicionada ao RFI`,
    });
    return data as RfiMessage;
  },

  async closeRfi(id: string, projectId: string): Promise<Rfi> {
    return this.update(id, projectId, { status: "closed" } as any);
  },
};

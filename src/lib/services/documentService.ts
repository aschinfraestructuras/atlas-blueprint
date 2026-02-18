import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

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

export interface DocumentInput {
  project_id: string;
  title: string;
  doc_type: string;
  revision?: string;
  status?: string;
  file_url?: string;
  created_by: string;
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

  async create(input: DocumentInput): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        project_id: input.project_id,
        title: input.title,
        doc_type: input.doc_type,
        revision: input.revision ?? "0",
        status: input.status ?? "draft",
        file_url: input.file_url ?? null,
        created_by: input.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "documents",
      entityId: (data as Document).id,
      action: "INSERT",
      module: "documents",
      diff: { title: input.title, doc_type: input.doc_type, status: input.status ?? "draft" },
    });
    return data as Document;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<DocumentInput, "project_id" | "created_by">>): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "documents",
      entityId: id,
      action: "UPDATE",
      module: "documents",
      diff: updates as Record<string, unknown>,
    });
    return data as Document;
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

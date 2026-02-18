import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  revision: string | null;
  status: string;
  /** @deprecated use file_path */
  file_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
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
  created_by: string;
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

export type DocumentStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected";

/** Returns true if the document's fields can still be edited */
export function isDocumentEditable(status: string): boolean {
  return status === "draft";
}

/** Returns true if only attachments / comments can be added */
export function isDocumentLockedForFields(status: string): boolean {
  return ["submitted", "in_review", "approved", "rejected"].includes(status);
}

// ─── Storage constants ────────────────────────────────────────────────────────

const BUCKET = "qms-files";

export function slugifyFilename(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s/\\]+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^\.+/, "")
    || "file";
}

export function buildStoragePath(
  projectId: string,
  documentId: string,
  fileName: string
): string {
  const safe = slugifyFilename(fileName);
  const ts = Date.now();
  // First segment MUST be project UUID (RLS: storage_path_project_id)
  return `${projectId}/documents/${documentId}/${ts}_${safe}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const documentService = {
  async getByProject(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Document[];
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
      description: `Documento criado: ${input.title}`,
      diff: { title: input.title, doc_type: input.doc_type, status: input.status ?? "draft" },
    });

    return data as Document;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Pick<Document, "title" | "doc_type" | "status" | "revision">>
  ): Promise<Document> {
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
      description: updates.status ? undefined : `Documento atualizado`,
      diff: updates as Record<string, unknown>,
    });

    return data as Document;
  },

  /** Transition document status with audit trail */
  async changeStatus(
    id: string,
    projectId: string,
    fromStatus: string,
    toStatus: DocumentStatus
  ): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .update({ status: toStatus })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: id,
      action: "status_change",
      module: "documents",
      description: `Document status: ${fromStatus} → ${toStatus}`,
      diff: { from: fromStatus, to: toStatus },
    });

    return data as Document;
  },

  async uploadFile(
    file: File,
    projectId: string,
    documentId: string,
    uploadedBy: string
  ): Promise<void> {
    const storagePath = buildStoragePath(projectId, documentId, file.name);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      throw new Error(`Falha no upload: ${uploadError.message ?? String(uploadError)}`);
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .eq("id", documentId);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
      throw updateError;
    }

    await auditService
      .log({
        projectId,
        entity: "documents",
        entityId: documentId,
        action: "attachment_add",
        module: "documents",
        description: `Added attachment: ${file.name}`,
        diff: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
          uploaded_by: uploadedBy,
        },
      })
      .catch(() => null);
  },

  async getSignedUrl(
    storagePath: string,
    projectId?: string,
    documentId?: string
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;

    if (projectId && documentId) {
      auditService
        .log({
          projectId,
          entity: "documents",
          entityId: documentId,
          action: "attachment_download",
          module: "documents",
          description: `Downloaded document file`,
          diff: { storage_path: storagePath },
        })
        .catch(() => null);
    }

    return data.signedUrl;
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

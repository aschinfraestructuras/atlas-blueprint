import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentStatus = "draft" | "in_review" | "approved" | "obsolete" | "archived";

export const DOCUMENT_STATUSES = [
  "draft", "in_review", "approved", "obsolete", "archived",
] as const satisfies readonly DocumentStatus[];

export const DOC_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft:      ["in_review", "archived"],
  in_review:  ["approved", "draft", "archived"],
  approved:   ["obsolete", "archived"],
  obsolete:   ["archived"],
  archived:   ["draft"],
};

export interface Document {
  id: string;
  project_id: string;
  code: string | null;
  title: string;
  doc_type: string;
  type_outro: string | null;
  disciplina: string;
  disciplina_outro: string | null;
  revision: string | null;
  status: DocumentStatus;
  current_version_id: string | null;
  /** @deprecated use file_path from current version */
  file_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  version: string;
  tags: string[] | null;
  issued_at: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  change_description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  is_current: boolean;
}

export interface DocumentLink {
  id: string;
  document_id: string;
  linked_entity_type: string;
  linked_entity_id: string;
  created_at: string;
  created_by: string | null;
}

export interface DocumentInput {
  project_id: string;
  title: string;
  doc_type: string;
  type_outro?: string;
  disciplina?: string;
  disciplina_outro?: string;
  revision?: string;
  status?: DocumentStatus;
  created_by: string;
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

export function isDocumentEditable(status: string): boolean {
  return !["archived", "obsolete"].includes(status);
}

export function getDocumentTransitions(status: string): DocumentStatus[] {
  return DOC_STATUS_TRANSITIONS[status as DocumentStatus] ?? [];
}

export function canDeleteDocument(status: string): boolean {
  return ["draft", "archived"].includes(status);
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
  return `${projectId}/documents/${documentId}/${ts}_${safe}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const documentService = {
  async getByProject(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Document[];
  },

  /** Server-side paginated query */
  async getByProjectPaginated(
    projectId: string,
    options: {
      from: number;
      to: number;
      status?: string;
      search?: string;
      disciplina?: string;
    },
  ): Promise<{ data: Document[]; count: number }> {
    let q = supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(options.from, options.to);

    if (options.status && options.status !== "all") q = q.eq("status", options.status);
    if (options.disciplina && options.disciplina !== "all") q = q.eq("disciplina", options.disciplina);
    if (options.search) q = q.or(`title.ilike.%${options.search}%,code.ilike.%${options.search}%`);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data: (data ?? []) as unknown as Document[], count: count ?? 0 };
  },

  async getById(id: string): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Document;
  },

  /** Create document via RPC with auto-generated code */
  async create(input: DocumentInput): Promise<Document> {
    const { data, error } = await supabase.rpc("fn_create_document", {
      p_project_id: input.project_id,
      p_title: input.title,
      p_doc_type: input.doc_type,
      p_type_outro: input.type_outro ?? null,
      p_disciplina: input.disciplina ?? "geral",
      p_disciplina_outro: input.disciplina_outro ?? null,
      p_revision: input.revision ?? "0",
      p_status: input.status ?? "draft",
    });
    if (error) throw error;
    return data as unknown as Document;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Pick<Document, "title" | "doc_type" | "type_outro" | "disciplina" | "disciplina_outro" | "status" | "revision">>
  ): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .update({ ...updates, updated_by: (await supabase.auth.getUser()).data.user?.id })
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

    return data as unknown as Document;
  },

  /** Transition document status — fetches real current status to prevent stale-state races */
  async changeStatus(
    id: string,
    projectId: string,
    _fromStatusHint: string,
    toStatus: DocumentStatus
  ): Promise<Document> {
    // Defensive: always fetch the real current status from DB
    const { data: current, error: fetchErr } = await supabase
      .from("documents")
      .select("status")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error(`Falha ao verificar estado atual: ${fetchErr.message}`);

    const realFromStatus = (current as { status: string }).status;
    const allowed = getDocumentTransitions(realFromStatus);
    if (!allowed.includes(toStatus)) {
      throw new Error(`Transição inválida: ${realFromStatus} → ${toStatus}. Permitidas: ${allowed.join(", ")}`);
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const updatePayload: Record<string, unknown> = {
      status: toStatus,
      updated_by: userId,
    };

    if (toStatus === "approved") {
      updatePayload.approved_by = userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: id,
      action: "STATUS_CHANGE",
      module: "documents",
      description: `Document status: ${realFromStatus} → ${toStatus}`,
      diff: { from: realFromStatus, to: toStatus },
    });

    return data as unknown as Document;
  },

  /** Upload file and create a new version */
  async uploadFile(
    file: File,
    projectId: string,
    documentId: string,
    _uploadedBy: string,
    changeDescription?: string
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

    // Create version via RPC
    const { error: rpcError } = await supabase.rpc("fn_create_new_version", {
      p_document_id: documentId,
      p_file_path: storagePath,
      p_file_name: file.name,
      p_file_size: file.size,
      p_mime_type: file.type || null,
      p_change_description: changeDescription ?? null,
    });

    if (rpcError) {
      // Cleanup uploaded file on RPC failure
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
      throw rpcError;
    }
  },

  /** Get version history for a document */
  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DocumentVersion[];
  },

  /** Get links for a document */
  async getLinks(documentId: string): Promise<DocumentLink[]> {
    const { data, error } = await supabase
      .from("document_links")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DocumentLink[];
  },

  /** Link document to an entity */
  async addLink(documentId: string, entityType: string, entityId: string): Promise<void> {
    const { error } = await supabase
      .from("document_links")
      .insert({
        document_id: documentId,
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
    if (error) throw error;
  },

  /** Remove a link */
  async removeLink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from("document_links")
      .delete()
      .eq("id", linkId);
    if (error) throw error;
  },

  /** Soft delete */
  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("documents")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", id)
      .eq("project_id", projectId);
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: id,
      action: "SOFT_DELETE",
      module: "documents",
    });
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
      .eq("is_deleted", false)
      .neq("status", "approved");
    if (error) throw error;
    return count ?? 0;
  },
};

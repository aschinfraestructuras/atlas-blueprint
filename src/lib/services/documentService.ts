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

// ─── Storage constants ────────────────────────────────────────────────────────

const BUCKET = "atlas_files";

/**
 * Normalise a filename so it is safe for Supabase Storage:
 * - decompose Unicode accents → strip combining characters
 * - replace spaces/slashes with "_"
 * - keep only [a-zA-Z0-9._-]
 */
export function slugifyFilename(raw: string): string {
  return raw
    .normalize("NFD")                        // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")         // strip combining marks
    .replace(/[\s/\\]+/g, "_")               // spaces & separators → _
    .replace(/[^a-zA-Z0-9._-]/g, "")        // remove remaining unsafe chars
    .replace(/^\.+/, "")                     // no leading dots
    || "file";
}

/**
 * Build a canonical, collision-resistant storage path.
 * Format: projects/{project_id}/documents/{document_id}/{timestamp}_{safe_name}
 */
export function buildStoragePath(
  projectId: string,
  documentId: string,
  fileName: string
): string {
  const safe = slugifyFilename(fileName);
  const ts = Date.now();
  return `projects/${projectId}/documents/${documentId}/${ts}_${safe}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const documentService = {
  // ── Read ──────────────────────────────────────────────────────────────────

  async getByProject(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Document[];
  },

  // ── Create ────────────────────────────────────────────────────────────────

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
      diff: { title: input.title, doc_type: input.doc_type, status: input.status ?? "draft" },
    });

    return data as Document;
  },

  // ── Update ────────────────────────────────────────────────────────────────

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
      diff: updates as Record<string, unknown>,
    });

    return data as Document;
  },

  // ── Upload file ───────────────────────────────────────────────────────────

  /**
   * Upload a file to `atlas_files` bucket and update the document row.
   *
   * Steps (atomic-ish):
   *  1. Upload to Storage (bail on error — document is NOT touched)
   *  2. Update documents.file_path / file_name / file_size / mime_type
   *  3. Write audit log
   */
  async uploadFile(
    file: File,
    projectId: string,
    documentId: string,
    uploadedBy: string
  ): Promise<void> {
    const storagePath = buildStoragePath(projectId, documentId, file.name);

    // 1. Upload to storage (upsert = overwrite same path)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      // Surface a readable message
      const msg = uploadError.message ?? String(uploadError);
      throw new Error(`Falha no upload: ${msg}`);
    }

    // 2. Update document metadata
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
      // Storage upload succeeded but DB update failed.
      // Best-effort: attempt to remove the orphaned file.
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
      throw updateError;
    }

    // 3. Audit log — non-blocking
    await auditService
      .log({
        projectId,
        entity: "documents",
        entityId: documentId,
        action: "upload_file",
        module: "documents",
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

  // ── Signed URL (download / view) ──────────────────────────────────────────

  /**
   * Create a signed URL valid for 1 hour.
   * Logs a download_file audit entry (non-blocking).
   */
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
          action: "download_file",
          module: "documents",
          diff: { storage_path: storagePath },
        })
        .catch(() => null);
    }

    return data.signedUrl;
  },

  // ── Legacy helpers (kept for document_files table compatibility) ───────────

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

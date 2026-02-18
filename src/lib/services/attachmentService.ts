import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType = "test" | "non_conformity";

export interface Attachment {
  id: string;
  project_id: string;
  entity_type: EntityType;
  entity_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
}

const BUCKET = "atlas_files";

// ─── Path helpers ──────────────────────────────────────────────────────────────

/**
 * Remove accents, replace unsafe characters with underscores.
 * Reused from documentService pattern — duplicated here to keep services independent.
 */
function slugifyFilename(raw: string): string {
  return (
    raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s/\\]+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/^\.+/, "") || "file"
  );
}

/**
 * Canonical path: projects/{project_id}/{entity_type}/{entity_id}/{ts}_{safe_name}
 */
export function buildAttachmentPath(
  projectId: string,
  entityType: EntityType,
  entityId: string,
  fileName: string
): string {
  const safe = slugifyFilename(fileName);
  return `projects/${projectId}/${entityType}/${entityId}/${Date.now()}_${safe}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const MODULE_MAP: Record<EntityType, string> = {
  test: "tests",
  non_conformity: "non_conformities",
};

export const attachmentService = {
  // ── List ────────────────────────────────────────────────────────────────────

  async list(entityType: EntityType, entityId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Attachment[];
  },

  // ── Upload ──────────────────────────────────────────────────────────────────

  /**
   * Upload a file and register it in the attachments table.
   * - If storage upload fails → DB is NOT touched.
   * - If DB insert fails → storage file is cleaned up.
   * - Audit log is non-blocking.
   */
  async upload(
    file: File,
    projectId: string,
    entityType: EntityType,
    entityId: string,
    createdBy: string
  ): Promise<Attachment> {
    const storagePath = buildAttachmentPath(projectId, entityType, entityId, file.name);

    // 1. Storage upload (bail early on error)
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (storageErr) {
      throw new Error(`Falha no upload: ${storageErr.message ?? String(storageErr)}`);
    }

    // 2. DB insert
    const { data, error: dbErr } = await supabase
      .from("attachments")
      .insert({
        project_id: projectId,
        entity_type: entityType,
        entity_id: entityId,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (dbErr) {
      // Cleanup orphaned storage object
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
      throw dbErr;
    }

    // 3. Audit log (non-blocking)
    auditService
      .log({
        projectId,
        entity: entityType === "test" ? "test_results" : "non_conformities",
        entityId,
        action: "upload_attachment",
        module: MODULE_MAP[entityType],
        diff: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
          uploaded_by: createdBy,
        },
      })
      .catch(() => null);

    return data as Attachment;
  },

  // ── Signed URL (download / view) ─────────────────────────────────────────────

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour
    if (error) throw error;
    return data.signedUrl;
  },

  // ── Delete ───────────────────────────────────────────────────────────────────

  /**
   * Delete an attachment row and its storage object.
   * Storage removal is best-effort (non-blocking) to avoid blocking the user
   * if the file was already removed manually.
   */
  async delete(attachment: Attachment): Promise<void> {
    const { error: dbErr } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachment.id);
    if (dbErr) throw dbErr;

    // Best-effort storage cleanup
    await supabase.storage
      .from(BUCKET)
      .remove([attachment.file_path])
      .catch(() => null);

    // Audit log (non-blocking)
    auditService
      .log({
        projectId: attachment.project_id,
        entity:
          attachment.entity_type === "test" ? "test_results" : "non_conformities",
        entityId: attachment.entity_id,
        action: "delete_attachment",
        module: MODULE_MAP[attachment.entity_type as EntityType],
        diff: { file_name: attachment.file_name, storage_path: attachment.file_path },
      })
      .catch(() => null);
  },
};

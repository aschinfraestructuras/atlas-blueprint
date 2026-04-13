import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | "documents"
  | "tests"
  | "non_conformities"
  | "suppliers"
  | "subcontractors"
  | "survey"
  | "survey_records"
  | "technical_office"
  | "work_items"
  | "ppi"
  | "ppi_instances"
  | "plans"
  | "topography_equipment"
  | "topography_requests"
  | "topography_controls"
  | "equipment_calibrations"
  | "planning_wbs"
  | "planning_activities"
  | "rfis"
  | "concrete_batches"
  | "weld_records"
  | "soil_samples"
  | "compaction_tests"
  | "recycled_materials"
  | "daily_reports"
  | "material_lot"
  | "materials";

export interface GeoData {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
}

export interface Attachment {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_by: string | null;  // legacy
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  captured_at: string | null;
}

const BUCKET = "qms-files";

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Remove accents, replace unsafe characters with underscores.
 */
export function slugifyFilename(raw: string): string {
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
 * Canonical path: {project_id}/{entity_type}/{entity_id}/{ts}_{safe_name}
 *
 * The first segment MUST be the project UUID — RLS uses storage_path_project_id()
 * which calls split_part(name, '/', 1) to extract it.
 * Do NOT add any prefix before the project_id.
 */
export function buildAttachmentPath(
  projectId: string,
  entityType: EntityType,
  entityId: string,
  fileName: string
): string {
  const safe = slugifyFilename(fileName);
  return `${projectId}/${entityType}/${entityId}/${Date.now()}_${safe}`;
}

/**
 * Generate a signed URL for any storage path in qms-files.
 * Convenience wrapper usable outside the full attachment context.
 */
export async function getSignedUrlForPath(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(`Falha a gerar URL: ${error.message}`);
  return data.signedUrl;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const attachmentService = {
  // ── List ───────────────────────────────────────────────────────────────────

  async list(entityType: EntityType, entityId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Attachment[];
  },

  // ── Count (for badges) ─────────────────────────────────────────────────────

  async countByEntity(entityType: EntityType, entityId: string): Promise<number> {
    const { count, error } = await supabase
      .from("attachments")
      .select("*", { count: "exact", head: true })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    if (error) return 0;
    return count ?? 0;
  },

  // ── Upload ─────────────────────────────────────────────────────────────────

  async upload(
    file: File,
    projectId: string,
    entityType: EntityType,
    entityId: string,
    uploadedBy: string,
    geo?: GeoData | null
  ): Promise<Attachment> {
    // Defensive: prefer authenticated user; fall back to caller-provided ID
    // TODO(tech-debt): remove uploadedBy param once all callers use auth context
    const authUser = (await supabase.auth.getUser()).data.user;
    const resolvedUser = authUser?.id ?? uploadedBy;

    const storagePath = buildAttachmentPath(projectId, entityType, entityId, file.name);

    // 1. Storage upload
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
    const row: Record<string, unknown> = {
      project_id: projectId,
      entity_type: entityType,
      entity_id: entityId,
      file_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: resolvedUser,
      created_by: resolvedUser,
    };
    if (geo) {
      row.latitude = geo.latitude;
      row.longitude = geo.longitude;
      row.accuracy_m = geo.accuracy_m;
      row.captured_at = geo.captured_at;
    }

    const { data, error: dbErr } = await supabase
      .from("attachments")
      .insert(row as any)
      .select()
      .single();

    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
      throw dbErr;
    }

    // 3. Audit log (non-blocking)
    auditService
      .log({
        projectId,
        entity: entityType,
        entityId,
        action: "attachment_add",
        module: entityType,
        description: `Added attachment: ${file.name}`,
        diff: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
        },
      })
      .catch(() => null);

    return data as unknown as Attachment;
  },

  // ── Signed URL ─────────────────────────────────────────────────────────────

  async getSignedUrl(
    storagePath: string,
    projectId?: string,
    entityType?: EntityType,
    entityId?: string,
    fileName?: string
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;

    // Audit log download (non-blocking)
    if (projectId && entityId && entityType) {
      auditService
        .log({
          projectId,
          entity: entityType,
          entityId,
          action: "attachment_download",
          module: entityType,
          description: `Downloaded attachment: ${fileName ?? storagePath.split("/").pop()}`,
        })
        .catch(() => null);
    }

    return data.signedUrl;
  },

  // ── Delete ─────────────────────────────────────────────────────────────────

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
        entity: attachment.entity_type as EntityType,
        entityId: attachment.entity_id,
        action: "attachment_delete",
        module: attachment.entity_type,
        description: `Deleted attachment: ${attachment.file_name}`,
        diff: { file_name: attachment.file_name, storage_path: attachment.file_path },
      })
      .catch(() => null);
  },
};

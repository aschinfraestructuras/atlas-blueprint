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

export interface DocumentFile {
  id: string;
  document_id: string;
  project_id: string;
  file_name: string;
  mime_type: string | null;
  size: number | null;
  storage_path: string;
  storage_bucket: string;
  uploaded_by: string;
  created_at: string;
  sha256: string | null;
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

const BUCKET = "qms-files";
/** Build the canonical storage path for a document file. */
export function buildStoragePath(projectId: string, documentId: string, fileName: string): string {
  // Sanitise filename: strip directory separators
  const safe = fileName.replace(/[/\\]/g, "_");
  return `${projectId}/${documentId}/${safe}`;
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

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<DocumentInput, "project_id" | "created_by">>
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

  /** Upload a file to Storage, register it in document_files, and update documents.file_url. */
  async uploadFile(
    file: File,
    projectId: string,
    documentId: string,
    uploadedBy: string
  ): Promise<DocumentFile> {
    const storagePath = buildStoragePath(projectId, documentId, file.name);

    // 1. Upload to storage (upsert = overwrite same path)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    // 2. Register in document_files table
    const { data: fileRow, error: dbError } = await supabase
      .from("document_files")
      .insert({
        document_id: documentId,
        project_id: projectId,
        file_name: file.name,
        mime_type: file.type || null,
        size: file.size,
        storage_path: storagePath,
        storage_bucket: BUCKET,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    if (dbError) throw dbError;

    // 3. Update documents.file_url with the storage path
    const { error: updateError } = await supabase
      .from("documents")
      .update({ file_url: storagePath })
      .eq("id", documentId);
    if (updateError) throw updateError;

    // 4. Audit log
    await auditService.log({
      projectId,
      entity: "documents",
      entityId: documentId,
      action: "UPLOAD",
      module: "documents",
      diff: { file_name: file.name, size: file.size, storage_path: storagePath },
    });

    return fileRow as DocumentFile;
  },

  /** Get a signed URL valid for 60 minutes for a storage path. */
  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60); // 1 hour
    if (error) throw error;
    return data.signedUrl;
  },

  /** Get all file records for a document (latest first). */
  async getDocumentFiles(documentId: string): Promise<DocumentFile[]> {
    const { data, error } = await supabase
      .from("document_files")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DocumentFile[];
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

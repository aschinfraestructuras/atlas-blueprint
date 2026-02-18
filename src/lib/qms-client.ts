/**
 * QMS data-access helpers
 * Thin wrappers around supabase client – no UI logic here.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  DocumentInsert,
  DocumentFileInsert,
  ProjectInsert,
  ProjectMemberInsert,
  SupplierInsert,
  TestCatalogInsert,
  TestResultInsert,
} from './qms-types';
import { buildStoragePath } from './qms-types';

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getMyProjects() {
  return supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function createProject(data: ProjectInsert) {
  return supabase.from('projects').insert(data).select().single();
}

// ─── Project Members ─────────────────────────────────────────────────────────

export async function getProjectMembers(projectId: string) {
  return supabase
    .from('project_members')
    .select('*, profiles!inner(full_name, email)')
    .eq('project_id', projectId);
}

export async function addProjectMember(data: ProjectMemberInsert) {
  return supabase.from('project_members').insert(data);
}

export async function removeProjectMember(projectId: string, userId: string) {
  return supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(projectId: string) {
  return supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
}

export async function createDocument(data: DocumentInsert) {
  return supabase.from('documents').insert(data).select().single();
}

export async function updateDocument(
  id: string,
  patch: Partial<Omit<DocumentInsert, 'project_id' | 'created_by'>>
) {
  return supabase.from('documents').update(patch).eq('id', id).select().single();
}

export async function deleteDocument(id: string) {
  return supabase.from('documents').delete().eq('id', id);
}

// ─── Document Files ───────────────────────────────────────────────────────────

export async function uploadDocumentFile(
  projectId: string,
  documentId: string,
  file: File,
  uploadedBy: string
) {
  const path = buildStoragePath(projectId, documentId, file.name);

  const { error: uploadError } = await supabase.storage
    .from('qms-files')
    .upload(path, file, { upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const insert: DocumentFileInsert = {
    project_id: projectId,
    document_id: documentId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size: file.size,
    uploaded_by: uploadedBy,
  };

  // Insert into attachments table instead of document_files
  const attachmentInsert = {
    project_id: projectId,
    entity_type: "documents" as const,
    entity_id: documentId,
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: uploadedBy,
    created_by: uploadedBy,
  };

  return supabase.from('attachments').insert(attachmentInsert).select().single();
}

export async function getDocumentFileUrl(storagePath: string) {
  return supabase.storage.from('qms-files').createSignedUrl(storagePath, 3600);
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function getSuppliers(projectId: string) {
  return supabase
    .from('suppliers')
    .select('*')
    .eq('project_id', projectId)
    .order('name');
}

export async function createSupplier(data: SupplierInsert) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('suppliers').insert(data as any).select().single();
}

export async function updateSupplier(
  id: string,
  patch: Partial<Omit<SupplierInsert, 'project_id'>>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('suppliers').update(patch as any).eq('id', id).select().single();
}

// ─── Tests Catalog ───────────────────────────────────────────────────────────

export async function getTestsCatalog(projectId: string) {
  return supabase
    .from('tests_catalog')
    .select('*')
    .eq('project_id', projectId)
    .order('code');
}

export async function createTestCatalog(data: TestCatalogInsert) {
  return supabase.from('tests_catalog').insert(data).select().single();
}

// ─── Test Results ─────────────────────────────────────────────────────────────

export async function getTestResults(projectId: string) {
  return supabase
    .from('test_results')
    .select('*, tests_catalog(code, name), suppliers(name)')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
}

export async function createTestResult(data: TestResultInsert) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('test_results').insert(data as any).select().single();
}

export async function updateTestResult(
  id: string,
  patch: Partial<Omit<TestResultInsert, 'project_id' | 'test_id'>>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('test_results').update(patch as any).eq('id', id).select().single();
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export async function getAuditLog(projectId: string, limit = 100) {
  return supabase
    .from('audit_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

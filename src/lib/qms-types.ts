/**
 * QMS Domain Types
 * Hand-written; mirrors the Postgres schema exactly.
 * Do NOT auto-generate – update manually when schema changes.
 */
import type { Json } from '@/integrations/supabase/types';

// ─── Roles ───────────────────────────────────────────────────────────────────

export type ProjectRoleCode =
  | 'admin'
  | 'quality_manager'
  | 'quality_tech'
  | 'site_manager'
  | 'lab_tech'
  | 'surveyor'
  | 'inspector'
  | 'viewer';

export interface Role {
  code: ProjectRoleCode;
  name: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'inactive' | 'completed' | 'archived';

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  code: string;
  name: string;
  status?: ProjectStatus;
  tenant_id?: string | null;
}

// ─── Project Members ─────────────────────────────────────────────────────────

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRoleCode;
  created_at: string;
}

export interface ProjectMemberInsert {
  project_id: string;
  user_id: string;
  role: ProjectRoleCode;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: number;
  project_id: string | null;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: AuditAction;
  diff: Json | null;
  created_at: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'obsolete';

export interface Document {
  id: string;
  project_id: string;
  title: string;
  doc_type: string;
  status: DocumentStatus;
  version: string;
  issued_at: string | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentInsert {
  project_id: string;
  title: string;
  doc_type: string;
  status?: DocumentStatus;
  version?: string;
  issued_at?: string | null;
  tags?: string[];
  created_by: string;
}

// ─── Document Files ───────────────────────────────────────────────────────────

export interface DocumentFile {
  id: string;
  project_id: string;
  document_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size: number | null;
  sha256: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentFileInsert {
  project_id: string;
  document_id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  size?: number | null;
  sha256?: string | null;
  uploaded_by: string;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export type SupplierStatus = 'active' | 'inactive' | 'suspended';

export interface Supplier {
  id: string;
  project_id: string;
  name: string;
  nif_cif: string | null;
  category: string | null;
  status: SupplierStatus;
  contacts: Json;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  project_id: string;
  name: string;
  nif_cif?: string | null;
  category?: string | null;
  status?: SupplierStatus;
  /** Use a plain object – will be stored as jsonb */
  contacts?: Json;
}

// ─── Tests Catalog ───────────────────────────────────────────────────────────

export interface TestCatalog {
  id: string;
  project_id: string;
  code: string;
  name: string;
  standard: string | null;
  frequency: string | null;
  acceptance_criteria: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCatalogInsert {
  project_id: string;
  code: string;
  name: string;
  standard?: string | null;
  frequency?: string | null;
  acceptance_criteria?: string | null;
  active?: boolean;
}

// ─── Test Results ─────────────────────────────────────────────────────────────

export type TestResultStatus = 'pending' | 'pass' | 'fail' | 'inconclusive';

export interface TestResult {
  id: string;
  project_id: string;
  test_id: string;
  supplier_id: string | null;
  sample_ref: string | null;
  location: string | null;
  date: string;
  result: Json;
  status: TestResultStatus;
  created_at: string;
  updated_at: string;
}

export interface TestResultInsert {
  project_id: string;
  test_id: string;
  supplier_id?: string | null;
  sample_ref?: string | null;
  location?: string | null;
  date?: string;
  /** Numeric / qualitative values stored as JSON */
  result?: Json;
  status?: TestResultStatus;
}

// ─── Storage convention ───────────────────────────────────────────────────────

export const QMS_BUCKET = 'qms-files' as const;

/**
 * Build a canonical storage path that satisfies the RLS policy.
 * Convention: `{project_id}/{document_id}/{timestamp}_{filename}`
 */
export function buildStoragePath(
  projectId: string,
  documentId: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `${projectId}/${documentId}/${Date.now()}_${sanitized}`;
}

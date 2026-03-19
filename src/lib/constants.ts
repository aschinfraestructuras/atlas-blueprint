/**
 * Centralized frontend constants — single source of truth.
 *
 * Re-exports domain constants already defined in their respective modules
 * and adds any shared enums/constants not yet centralized.
 *
 * Consumers should import from here instead of reaching into individual services.
 */

// ─── Roles ───────────────────────────────────────────────────────────────────
// Matches get_project_role RPC return values and project_members.role column.

export const PROJECT_ROLES = [
  "admin",
  "project_manager",
  "quality_manager",
  "technician",
  "viewer",
] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

// ─── Document statuses ───────────────────────────────────────────────────────
// Re-exported from documentService (canonical owner)

export {
  DOCUMENT_STATUSES,
  DOC_STATUS_TRANSITIONS,
  type DocumentStatus,
} from "@/lib/services/documentService";

// ─── NC statuses ─────────────────────────────────────────────────────────────
// Re-exported from stateMachines (canonical owner)

export {
  NC_STATUSES,
  NC_TRANSITIONS,
  NC_EDITABLE_STATUSES,
  NC_DELETABLE_STATUSES,
  type NCStatus,
} from "@/lib/stateMachines";

// ─── Test statuses ───────────────────────────────────────────────────────────

export {
  TEST_STATUSES,
  TEST_TRANSITIONS,
  TEST_EDITABLE_STATUSES,
  TEST_DELETABLE_STATUSES,
  type TestStatus,
} from "@/lib/stateMachines";

// ─── PPI statuses ────────────────────────────────────────────────────────────

export {
  PPI_STATUSES,
  PPI_TRANSITIONS,
  PPI_EDITABLE_STATUSES,
  PPI_DELETABLE_STATUSES,
  type PPIStatus,
} from "@/lib/stateMachines";

// ─── Entity types (for attachments) ──────────────────────────────────────────

export { type EntityType } from "@/lib/services/attachmentService";

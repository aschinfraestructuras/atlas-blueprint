/**
 * Centralised state-machine definitions for PPI, Tests and NC.
 *
 * Single source of truth for:
 *  - allowed status values per module
 *  - valid forward/backward transitions
 *  - which statuses allow hard delete (draft only)
 *  - which statuses allow editing
 */

// ─── NC ───────────────────────────────────────────────────────────────────────

export const NC_STATUSES = [
  "draft", "open", "in_progress", "pending_verification", "closed", "archived",
] as const;
export type NCStatus = typeof NC_STATUSES[number];

/**
 * NC transition table (matches fn_update_nc_status in DB):
 *  draft → open | archived
 *  open  → in_progress | closed | archived
 *  in_progress → pending_verification | open | archived
 *  pending_verification → closed | in_progress | archived
 *  closed → archived | open
 *  archived → open
 */
export const NC_TRANSITIONS: Record<NCStatus, NCStatus[]> = {
  draft:                ["open", "archived"],
  open:                 ["in_progress", "closed", "archived"],
  in_progress:          ["pending_verification", "open", "archived"],
  pending_verification: ["closed", "in_progress", "archived"],
  closed:               ["archived", "open"],
  archived:             ["open"],
};

/** Statuses that allow field editing */
export const NC_EDITABLE_STATUSES: NCStatus[] = [
  "draft", "open", "in_progress", "pending_verification",
];

/** Hard delete allowed only from draft */
export const NC_DELETABLE_STATUSES: NCStatus[] = ["draft"];

// ─── Tests ────────────────────────────────────────────────────────────────────

export const TEST_STATUSES = [
  "draft", "in_progress", "completed", "approved", "archived",
] as const;
export type TestStatus = typeof TEST_STATUSES[number];

/**
 * Test transition table (matches fn_update_test_status in DB):
 *  draft → in_progress | archived
 *  in_progress → completed | archived
 *  completed → approved | in_progress | archived
 *  approved → archived
 */
export const TEST_TRANSITIONS: Record<string, string[]> = {
  draft:       ["in_progress", "archived"],
  // pending is a legacy alias for draft
  pending:     ["in_progress", "archived"],
  in_progress: ["completed", "archived"],
  completed:   ["approved", "in_progress", "archived"],
  approved:    ["archived"],
  // legacy result statuses
  pass:        ["approved", "archived"],
  fail:        ["in_progress", "archived"],
  inconclusive:["in_progress", "archived"],
};

export const TEST_EDITABLE_STATUSES = ["draft", "pending", "in_progress"];
export const TEST_DELETABLE_STATUSES = ["draft", "pending"];

// ─── PPI ──────────────────────────────────────────────────────────────────────

export const PPI_STATUSES = [
  "draft", "in_progress", "submitted", "approved", "rejected", "archived",
] as const;
export type PPIStatus = typeof PPI_STATUSES[number];

/**
 * PPI transition table (matches fn_ppi_instance_transition in DB):
 *  draft → in_progress | archived
 *  in_progress → submitted | archived
 *  submitted → approved | rejected | archived
 *  rejected → in_progress | archived
 *  approved → archived
 */
export const PPI_TRANSITIONS: Record<PPIStatus, PPIStatus[]> = {
  draft:       ["in_progress", "archived"],
  in_progress: ["submitted", "archived"],
  submitted:   ["approved", "rejected", "archived"],
  rejected:    ["in_progress", "archived"],
  approved:    ["archived"],
  archived:    [],
};

export const PPI_EDITABLE_STATUSES: PPIStatus[] = ["draft", "in_progress", "rejected"];
export const PPI_DELETABLE_STATUSES: PPIStatus[] = ["draft"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getNCTransitions(status: string): NCStatus[] {
  return NC_TRANSITIONS[status as NCStatus] ?? [];
}

export function getTestTransitions(status: string): string[] {
  return TEST_TRANSITIONS[status] ?? [];
}

export function getPPITransitions(status: string): PPIStatus[] {
  return PPI_TRANSITIONS[status as PPIStatus] ?? [];
}

export function canDeleteNC(status: string): boolean {
  return NC_DELETABLE_STATUSES.includes(status as NCStatus);
}

export function canDeleteTest(status: string): boolean {
  return TEST_DELETABLE_STATUSES.includes(status);
}

export function canDeletePPI(status: string): boolean {
  return PPI_DELETABLE_STATUSES.includes(status as PPIStatus);
}

export function canEditNC(status: string): boolean {
  return NC_EDITABLE_STATUSES.includes(status as NCStatus);
}

export function canEditTest(status: string): boolean {
  return TEST_EDITABLE_STATUSES.includes(status);
}

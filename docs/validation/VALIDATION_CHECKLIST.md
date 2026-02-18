# QMS End-to-End Validation Checklist

## Prerequisites

1. Open [Supabase Auth > Users](https://supabase.com/dashboard/project/qrsdpsugfjmrdeychxzf/auth/users) and **create two users**:
   | User | Email | Role |
   |---|---|---|
   | Alice | alice@test.local | (no app_role needed) |
   | Bob | bob@test.local | (no app_role needed) |
   Copy their UUIDs from the Users table.

2. In each SQL file under `docs/validation/`, replace every `ALICE_UUID_HERE` and `BOB_UUID_HERE` with the real UUIDs.

---

## Step 1 — Run Seed Script

Open [SQL Editor](https://supabase.com/dashboard/project/qrsdpsugfjmrdeychxzf/sql/new) and paste **`01_seed_and_rls_test.sql`**.

**Expected output (final SELECT):**

| entity | count |
|---|---|
| projects | 2 |
| project_members | 2 |
| documents | 2 |
| suppliers | 2 |
| tests_catalog | 2 |
| test_results | 2 |

---

## Step 2 — Run RLS Isolation Tests

Paste **`02_rls_isolation_tests.sql`** in SQL Editor (still as postgres/service role — `set_config` simulates the JWT).

**Expected NOTICE output:**
```
PASS A1 — SELECT isolation on documents ✓
PASS A2 — SELECT isolation on suppliers/catalog/results ✓
PASS A3a — INSERT into own project ✓
PASS A4 — INSERT into foreign project blocked ✓
PASS A5 — UPDATE own project doc ✓
PASS A6 — UPDATE foreign project blocked (0 rows affected) ✓
PASS A7 — DELETE own project doc ✓
PASS A8 — DELETE foreign project blocked (0 rows affected) ✓
══ Alice (PRJ-A) tests complete ══
PASS B1 — SELECT isolation ✓
PASS B2 — Supplier SELECT isolation ✓
PASS B3 — Tests SELECT isolation ✓
PASS B5 — INSERT into foreign project blocked ✓
PASS B6 — INSERT test result in own project ✓
══ Bob (PRJ-B) tests complete ══
```

**Audit log verification (final SELECTs in Part 2):**
- Expect rows for `documents INSERT`, `documents UPDATE`, `documents DELETE`, `test_results INSERT`.
- Every row must have `has_diff = true`.

---

## Step 3 — Run Membership & Schema Tests

Paste **`03_membership_and_schema_tests.sql`**.

**Expected:**
- T1/T1b/T2/T3 all print `PASS`.
- T4 (RLS status): all 11 tables show `✓ RLS ON`.
- T5 (audit triggers): 4 rows — `audit_documents`, `audit_suppliers`, `audit_tests_catalog`, `audit_test_results`.
- T6 (updated_at triggers): rows for `documents`, `profiles`, `projects`, `suppliers`, `tests_catalog`, `test_results`, `tenants`.

---

## Step 4 — Storage Test Plan (manual, via Supabase Dashboard or curl)

### 4.1 Bucket existence
Go to [Storage](https://supabase.com/dashboard/project/qrsdpsugfjmrdeychxzf/storage/buckets) → confirm **`qms-files`** bucket exists and is **private**.

### 4.2 Upload test (Alice's project)
Using the Supabase JS client authenticated as **Alice**:
```ts
// Should SUCCEED — path starts with Alice's project_id
await supabase.storage.from('qms-files').upload(
  `${PRJ_A_ID}/test-file.pdf`,
  fileBlob
);
```
Expected: `{ data: { path: '...' }, error: null }`

### 4.3 Upload blocked (wrong project)
```ts
// Should FAIL — Alice not a member of PRJ-B
await supabase.storage.from('qms-files').upload(
  `${PRJ_B_ID}/sneaky.pdf`,
  fileBlob
);
```
Expected: `{ data: null, error: { statusCode: '403' } }`

### 4.4 Download test (own project)
```ts
// Should SUCCEED — Alice reads her own file
const { data } = await supabase.storage.from('qms-files')
  .createSignedUrl(`${PRJ_A_ID}/test-file.pdf`, 60);
```
Expected: returns a signed URL.

### 4.5 Download blocked (foreign project)
```ts
// Should FAIL — Alice cannot read PRJ-B files
await supabase.storage.from('qms-files')
  .createSignedUrl(`${PRJ_B_ID}/beta-doc.pdf`, 60);
```
Expected: `{ data: null, error: { message: 'Object not found' } }` (RLS hides the row).

### 4.6 Delete blocked (non-admin)
Bob (`quality_tech`) attempts to delete a file in PRJ-B:
```ts
await supabase.storage.from('qms-files').remove([`${PRJ_B_ID}/test-file.pdf`]);
```
Expected: `403` — only project admins satisfy the `storage_delete_project_admin` policy.

### 4.7 Path injection attempt
```ts
// Attempt to escape project_id scope via path traversal
await supabase.storage.from('qms-files').upload(
  `${PRJ_A_ID}/../${PRJ_B_ID}/injected.pdf`,
  fileBlob
);
```
Expected: rejected (Supabase normalises paths, `storage_path_project_id` extracts segment[1]).

---

## Step 5 — Cleanup (after validation)

```sql
-- Run as service role in SQL Editor
DELETE FROM public.test_results   WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.tests_catalog  WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.suppliers      WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.document_files WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.documents      WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.project_members WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.projects        WHERE code IN ('PRJ-A','PRJ-B');
-- Delete test users from Auth > Users panel manually
```

---

## Schema Verification Summary

| Check | Passes When |
|---|---|
| RLS enabled | All 11 tables show `✓ RLS ON` in T4 |
| Isolation (SELECT) | Alice/Bob each see 0 rows from the other's project |
| Isolation (INSERT) | Cross-project INSERT raises `insufficient_privilege` |
| Isolation (UPDATE) | Cross-project UPDATE returns 0 rows affected |
| Isolation (DELETE) | Cross-project DELETE returns 0 rows affected |
| Membership control | Non-admin INSERT/DELETE on `project_members` is blocked |
| Audit triggers | `audit_log` has rows with `has_diff = true` for all 4 tables |
| updated_at triggers | `updated_at` column changes on every UPDATE |
| Storage isolation | 403 on upload/read to foreign `project_id` path |
| Storage admin gate | Non-admin DELETE on storage returns 403 |

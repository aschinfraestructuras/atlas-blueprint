-- =============================================================================
-- QMS VALIDATION SCRIPT — Part 1: Seed + RLS Isolation Tests
-- Run in Supabase SQL Editor (service role / postgres user)
-- Prerequisites:
--   • Create 2 real auth users first (Auth > Users > Invite/Create):
--       alice@test.local  (remember her UUID → set below)
--       bob@test.local    (remember his UUID → set below)
-- =============================================================================

-- ─── 0. CONFIGURATION ────────────────────────────────────────────────────────
-- ⚠ Replace with REAL UUIDs from Auth > Users panel
DO $$
BEGIN
  RAISE NOTICE 'STEP 0: Set your real user UUIDs below before running!';
END $$;

\set ALICE_ID 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'  -- replace
\set BOB_ID   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'  -- replace

-- ─── 1. CLEAN SLATE (idempotent) ─────────────────────────────────────────────
DELETE FROM public.test_results   WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.tests_catalog  WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.suppliers      WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.document_files WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.documents      WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.project_members WHERE project_id IN (SELECT id FROM public.projects WHERE code IN ('PRJ-A','PRJ-B'));
DELETE FROM public.projects        WHERE code IN ('PRJ-A','PRJ-B');
DELETE FROM public.audit_log       WHERE entity IN ('documents','suppliers','tests_catalog','test_results')
                                   AND created_at > now() - interval '1 hour';

-- ─── 2. CREATE PROJECTS ───────────────────────────────────────────────────────
INSERT INTO public.projects (code, name, status)
VALUES
  ('PRJ-A', 'Project Alpha', 'active'),
  ('PRJ-B', 'Project Beta',  'active');

-- Store IDs for later use
DO $$
DECLARE
  prj_a uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-A');
  prj_b uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-B');
BEGIN
  RAISE NOTICE 'PRJ-A id = %', prj_a;
  RAISE NOTICE 'PRJ-B id = %', prj_b;
END $$;

-- ─── 3. ASSIGN MEMBERS ───────────────────────────────────────────────────────
-- Alice → admin of PRJ-A only
-- Bob   → quality_tech of PRJ-B only
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, 'ALICE_UUID_HERE'::uuid, 'admin'         FROM public.projects WHERE code = 'PRJ-A';

INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, 'BOB_UUID_HERE'::uuid,   'quality_tech'  FROM public.projects WHERE code = 'PRJ-B';

-- ─── 4. SEED BUSINESS DATA ───────────────────────────────────────────────────
-- Documents
INSERT INTO public.documents (project_id, title, doc_type, status, version, created_by)
SELECT id, 'Alpha Procedure v1', 'procedure', 'draft', '1.0', 'ALICE_UUID_HERE'::uuid
FROM public.projects WHERE code = 'PRJ-A';

INSERT INTO public.documents (project_id, title, doc_type, status, version, created_by)
SELECT id, 'Beta Specification', 'spec',      'draft', '1.0', 'BOB_UUID_HERE'::uuid
FROM public.projects WHERE code = 'PRJ-B';

-- Suppliers
INSERT INTO public.suppliers (project_id, name, status)
SELECT id, 'Alpha Concrete Ltd',  'active' FROM public.projects WHERE code = 'PRJ-A';

INSERT INTO public.suppliers (project_id, name, status)
SELECT id, 'Beta Steel Corp',     'active' FROM public.projects WHERE code = 'PRJ-B';

-- Tests catalog
INSERT INTO public.tests_catalog (project_id, code, name, active)
SELECT id, 'TC-A-001', 'Compressive Strength (Alpha)', true FROM public.projects WHERE code = 'PRJ-A';

INSERT INTO public.tests_catalog (project_id, code, name, active)
SELECT id, 'TC-B-001', 'Tensile Strength (Beta)',      true FROM public.projects WHERE code = 'PRJ-B';

-- Test results
INSERT INTO public.test_results (project_id, test_id, status, result)
SELECT p.id, tc.id, 'pending', '{"value": 35, "unit": "MPa"}'::jsonb
FROM public.projects p
JOIN public.tests_catalog tc ON tc.project_id = p.id
WHERE p.code = 'PRJ-A';

INSERT INTO public.test_results (project_id, test_id, status, result)
SELECT p.id, tc.id, 'pending', '{"value": 420, "unit": "MPa"}'::jsonb
FROM public.projects p
JOIN public.tests_catalog tc ON tc.project_id = p.id
WHERE p.code = 'PRJ-B';

-- ─── 5. VERIFY SEED (run as service role — sees everything) ──────────────────
SELECT 'projects'       AS entity, count(*) FROM public.projects       WHERE code IN ('PRJ-A','PRJ-B')
UNION ALL
SELECT 'project_members',          count(*) FROM public.project_members pm JOIN public.projects p ON p.id = pm.project_id WHERE p.code IN ('PRJ-A','PRJ-B')
UNION ALL
SELECT 'documents',                count(*) FROM public.documents       d  JOIN public.projects p ON p.id = d.project_id  WHERE p.code IN ('PRJ-A','PRJ-B')
UNION ALL
SELECT 'suppliers',                count(*) FROM public.suppliers        s  JOIN public.projects p ON p.id = s.project_id  WHERE p.code IN ('PRJ-A','PRJ-B')
UNION ALL
SELECT 'tests_catalog',            count(*) FROM public.tests_catalog    tc JOIN public.projects p ON p.id = tc.project_id WHERE p.code IN ('PRJ-A','PRJ-B')
UNION ALL
SELECT 'test_results',             count(*) FROM public.test_results     tr JOIN public.projects p ON p.id = tr.project_id WHERE p.code IN ('PRJ-A','PRJ-B');
-- Expected: each row = 2 (one per project)

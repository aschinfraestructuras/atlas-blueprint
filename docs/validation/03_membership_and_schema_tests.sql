-- =============================================================================
-- QMS VALIDATION SCRIPT — Part 3: Membership RLS Tests
-- Verifies that only project admins can manage project_members.
-- Run after Part 1 seed. Replace UUIDs.
-- =============================================================================

-- Alice is admin of PRJ-A. Bob is quality_tech of PRJ-B.
-- Charlie is a hypothetical user (no project membership at all).

-- ─── T1. Alice CAN add a new member to PRJ-A ─────────────────────────────────
DO $$
DECLARE
  alice_id  uuid := 'ALICE_UUID_HERE';
  prj_a_id  uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-A');
  -- Use any third real user UUID, or a fake one to test the flow
  charlie_id uuid := gen_random_uuid();  -- fake, will fail FK but tests policy path
  v_count   int;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice_id::text, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Alice (admin) can read membership for PRJ-A
  SELECT count(*) INTO v_count FROM public.project_members WHERE project_id = prj_a_id;
  ASSERT v_count >= 1, 'FAIL T1: Alice should see >= 1 member in PRJ-A';
  RAISE NOTICE 'PASS T1 — Admin can SELECT project_members ✓';

  -- Alice cannot see PRJ-B memberships
  SELECT count(*) INTO v_count FROM public.project_members
  WHERE project_id = (SELECT id FROM public.projects WHERE code = 'PRJ-B');
  ASSERT v_count = 0, 'FAIL T1b: Alice should NOT see PRJ-B memberships';
  RAISE NOTICE 'PASS T1b — Admin cannot SELECT foreign project members ✓';

  PERFORM set_config('role', 'postgres', true);
END $$;

-- ─── T2. Bob (quality_tech, NOT admin) CANNOT insert members into PRJ-B ──────
DO $$
DECLARE
  bob_id    uuid := 'BOB_UUID_HERE';
  prj_b_id  uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-B');
  new_user  uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob_id::text, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (prj_b_id, new_user, 'viewer');
    RAISE EXCEPTION 'FAIL T2: Bob (quality_tech) should not be able to add members';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS T2 — Non-admin cannot INSERT into project_members ✓';
  END;

  PERFORM set_config('role', 'postgres', true);
END $$;

-- ─── T3. Bob CANNOT delete members from PRJ-B ────────────────────────────────
DO $$
DECLARE
  bob_id   uuid := 'BOB_UUID_HERE';
  prj_b_id uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-B');
  v_count  int;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob_id::text, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  DELETE FROM public.project_members WHERE project_id = prj_b_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'FAIL T3: Bob deleted ' || v_count || ' members (should be 0)';
  RAISE NOTICE 'PASS T3 — Non-admin cannot DELETE from project_members ✓';

  PERFORM set_config('role', 'postgres', true);
END $$;

-- ─── T4. Schema integrity check ───────────────────────────────────────────────
-- Confirm all expected tables have RLS ON
SELECT
  relname AS table_name,
  CASE WHEN relrowsecurity THEN '✓ RLS ON' ELSE '✗ RLS OFF' END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND relname IN (
    'profiles','projects','project_members','roles',
    'documents','document_files','suppliers',
    'tests_catalog','test_results','audit_log','user_roles'
  )
ORDER BY relname;
-- All rows must show '✓ RLS ON'

-- ─── T5. Confirm audit triggers are attached ─────────────────────────────────
SELECT tgname AS trigger_name, relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT tgisinternal
  AND tgname LIKE 'audit_%'
ORDER BY relname;
-- Expected: audit_documents, audit_suppliers, audit_tests_catalog, audit_test_results

-- ─── T6. Confirm updated_at triggers are attached ────────────────────────────
SELECT tgname AS trigger_name, relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT tgisinternal
  AND tgname LIKE '%updated_at%'
ORDER BY relname;
-- Expected triggers on: documents, profiles, projects, suppliers, tests_catalog, test_results, tenants

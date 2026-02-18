-- =============================================================================
-- QMS VALIDATION SCRIPT — Part 2: RLS Isolation Tests (simulate user sessions)
-- Run AFTER Part 1 seed. Replace UUIDs before running.
-- Uses set_config to impersonate users without needing separate connections.
-- =============================================================================

-- ─── HELPER: set_config-based user impersonation ─────────────────────────────
-- Supabase SQL editor runs as postgres (superuser).
-- We use set_config to inject auth.uid() exactly as Supabase middleware does.
-- This is the canonical way to test RLS in the SQL editor.

-- ════════════════════════════════════════════════════════════════════════════
-- TEST BLOCK A — AS ALICE (member of PRJ-A only)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  alice_id  uuid := 'ALICE_UUID_HERE';    -- ⚠ replace
  prj_a_id  uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-A');
  prj_b_id  uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-B');
  v_count   int;
  v_id      uuid;
BEGIN
  -- Impersonate Alice
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice_id::text, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- ── A1. SELECT: Alice sees PRJ-A documents, NOT PRJ-B ─────────────────────
  SELECT count(*) INTO v_count FROM public.documents WHERE project_id = prj_a_id;
  ASSERT v_count = 1, 'FAIL A1a: Alice should see 1 doc in PRJ-A, got ' || v_count;

  SELECT count(*) INTO v_count FROM public.documents WHERE project_id = prj_b_id;
  ASSERT v_count = 0, 'FAIL A1b: Alice should see 0 docs in PRJ-B, got ' || v_count;
  RAISE NOTICE 'PASS A1 — SELECT isolation on documents ✓';

  -- ── A2. SELECT: same isolation for suppliers, tests_catalog, test_results ──
  SELECT count(*) INTO v_count FROM public.suppliers     WHERE project_id = prj_b_id;
  ASSERT v_count = 0, 'FAIL A2a: Alice should see 0 suppliers in PRJ-B';
  SELECT count(*) INTO v_count FROM public.tests_catalog WHERE project_id = prj_b_id;
  ASSERT v_count = 0, 'FAIL A2b: Alice should see 0 catalog rows in PRJ-B';
  SELECT count(*) INTO v_count FROM public.test_results  WHERE project_id = prj_b_id;
  ASSERT v_count = 0, 'FAIL A2c: Alice should see 0 results in PRJ-B';
  RAISE NOTICE 'PASS A2 — SELECT isolation on suppliers/catalog/results ✓';

  -- ── A3. INSERT: Alice can insert into PRJ-A ────────────────────────────────
  INSERT INTO public.documents (project_id, title, doc_type, status, version, created_by)
  VALUES (prj_a_id, 'Alice New Doc', 'procedure', 'draft', '1.1', alice_id)
  RETURNING id INTO v_id;
  ASSERT v_id IS NOT NULL, 'FAIL A3a: Alice insert into PRJ-A failed';
  RAISE NOTICE 'PASS A3a — INSERT into own project ✓ (id=%)', v_id;

  -- ── A4. INSERT: Alice CANNOT insert into PRJ-B (expect RLS error) ─────────
  BEGIN
    INSERT INTO public.documents (project_id, title, doc_type, status, version, created_by)
    VALUES (prj_b_id, 'Alice Sneaky Doc', 'procedure', 'draft', '1.0', alice_id);
    RAISE EXCEPTION 'FAIL A4: Alice should not be able to INSERT into PRJ-B';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS A4 — INSERT into foreign project blocked ✓';
  END;

  -- ── A5. UPDATE: Alice can update PRJ-A doc ─────────────────────────────────
  UPDATE public.documents SET title = 'Alpha Updated' WHERE project_id = prj_a_id AND title = 'Alpha Procedure v1';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count > 0, 'FAIL A5: Alice UPDATE on PRJ-A returned 0 rows';
  RAISE NOTICE 'PASS A5 — UPDATE own project doc ✓';

  -- ── A6. UPDATE: Alice CANNOT update PRJ-B rows (silent 0 rows, no error) ───
  UPDATE public.documents SET title = 'Hacked!' WHERE project_id = prj_b_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'FAIL A6: Alice should update 0 rows in PRJ-B, updated ' || v_count;
  RAISE NOTICE 'PASS A6 — UPDATE foreign project blocked (0 rows affected) ✓';

  -- ── A7. DELETE: Alice (admin) CAN delete her own PRJ-A doc ─────────────────
  DELETE FROM public.documents WHERE project_id = prj_a_id AND title = 'Alice New Doc';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, 'FAIL A7: Alice DELETE on PRJ-A returned ' || v_count || ' rows';
  RAISE NOTICE 'PASS A7 — DELETE own project doc ✓';

  -- ── A8. DELETE: Alice CANNOT delete PRJ-B rows ─────────────────────────────
  DELETE FROM public.documents WHERE project_id = prj_b_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'FAIL A8: Alice should delete 0 rows in PRJ-B, deleted ' || v_count;
  RAISE NOTICE 'PASS A8 — DELETE foreign project blocked (0 rows affected) ✓';

  -- Reset role
  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE '══ Alice (PRJ-A) tests complete ══';
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- TEST BLOCK B — AS BOB (member of PRJ-B only)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bob_id   uuid := 'BOB_UUID_HERE';      -- ⚠ replace
  prj_a_id uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-A');
  prj_b_id uuid := (SELECT id FROM public.projects WHERE code = 'PRJ-B');
  v_count  int;
  v_id     uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob_id::text, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- ── B1. SELECT isolation ───────────────────────────────────────────────────
  SELECT count(*) INTO v_count FROM public.documents WHERE project_id = prj_a_id;
  ASSERT v_count = 0, 'FAIL B1: Bob should see 0 docs in PRJ-A, got ' || v_count;
  SELECT count(*) INTO v_count FROM public.documents WHERE project_id = prj_b_id;
  ASSERT v_count = 1, 'FAIL B1b: Bob should see 1 doc in PRJ-B, got ' || v_count;
  RAISE NOTICE 'PASS B1 — SELECT isolation ✓';

  -- ── B2. SELECT suppliers isolation ────────────────────────────────────────
  SELECT count(*) INTO v_count FROM public.suppliers WHERE project_id = prj_a_id;
  ASSERT v_count = 0, 'FAIL B2: Bob should see 0 suppliers in PRJ-A';
  RAISE NOTICE 'PASS B2 — Supplier SELECT isolation ✓';

  -- ── B3. SELECT tests_catalog + test_results isolation ─────────────────────
  SELECT count(*) INTO v_count FROM public.tests_catalog WHERE project_id = prj_a_id;
  ASSERT v_count = 0, 'FAIL B3a: Bob sees catalog rows in PRJ-A';
  SELECT count(*) INTO v_count FROM public.test_results  WHERE project_id = prj_a_id;
  ASSERT v_count = 0, 'FAIL B3b: Bob sees test results in PRJ-A';
  RAISE NOTICE 'PASS B3 — Tests SELECT isolation ✓';

  -- ── B4. Bob (quality_tech) CANNOT delete (no admin role) ──────────────────
  BEGIN
    DELETE FROM public.documents WHERE project_id = prj_b_id;
    -- If policy only allows admin to delete, this should block
    RAISE NOTICE 'INFO B4: DELETE returned (check row count — should be 0 for non-admin)';
  END;

  -- ── B5. Bob cannot INSERT into PRJ-A ──────────────────────────────────────
  BEGIN
    INSERT INTO public.suppliers (project_id, name, status)
    VALUES (prj_a_id, 'Bob Sneaky Supplier', 'active');
    RAISE EXCEPTION 'FAIL B5: Bob should not insert supplier into PRJ-A';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'PASS B5 — INSERT into foreign project blocked ✓';
  END;

  -- ── B6. Bob can INSERT test result in PRJ-B ─────────────────────────────
  INSERT INTO public.test_results (project_id, test_id, status, result)
  SELECT prj_b_id, tc.id, 'pass', '{"value": 450}'::jsonb
  FROM public.tests_catalog tc WHERE tc.project_id = prj_b_id LIMIT 1
  RETURNING id INTO v_id;
  ASSERT v_id IS NOT NULL, 'FAIL B6: Bob could not insert test result in PRJ-B';
  RAISE NOTICE 'PASS B6 — INSERT test result in own project ✓ (id=%)', v_id;

  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE '══ Bob (PRJ-B) tests complete ══';
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- TEST BLOCK C — AUDIT LOG VERIFICATION (run as service role)
-- ════════════════════════════════════════════════════════════════════════════
-- After the above inserts/updates/deletes, audit triggers should have fired.
-- Note: triggers fire as the table owner (SECURITY DEFINER via fn_audit_trigger).
SELECT
  entity,
  action,
  count(*)       AS entries,
  max(created_at) AS last_entry
FROM public.audit_log
WHERE created_at > now() - interval '10 minutes'
  AND entity IN ('documents','suppliers','tests_catalog','test_results')
GROUP BY entity, action
ORDER BY entity, action;

-- Expected rows (at minimum):
-- documents    | INSERT | 1+
-- documents    | UPDATE | 1+
-- documents    | DELETE | 1+
-- test_results | INSERT | 1+

-- Spot-check diff column is populated
SELECT entity, action, diff IS NOT NULL AS has_diff, created_at
FROM public.audit_log
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC
LIMIT 20;

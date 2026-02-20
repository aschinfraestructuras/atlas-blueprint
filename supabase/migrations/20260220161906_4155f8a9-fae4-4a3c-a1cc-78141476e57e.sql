
-- Fix: audit_log_insert_authenticated policy had WITH CHECK (true)
-- which allowed any authenticated user to insert arbitrary audit log entries
-- including with spoofed user_id or project_id values.
-- New policy: only allows inserting rows where user_id matches auth.uid()
-- (or user_id is NULL, which is used by SECURITY DEFINER trigger functions
--  that insert on behalf of the system).

DROP POLICY IF EXISTS audit_log_insert_authenticated ON public.audit_log;

CREATE POLICY audit_log_insert_authenticated
  ON public.audit_log
  FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- The user_id field must match the calling user (or be null for system/trigger inserts)
    (user_id = auth.uid() OR user_id IS NULL)
    AND
    -- performed_by must also match the calling user (or be null)
    (performed_by = auth.uid() OR performed_by IS NULL)
  );

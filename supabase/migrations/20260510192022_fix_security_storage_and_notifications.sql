-- ══════════════════════════════════════════════════════
-- FIX 1: Remover política storage demasiado permissiva
-- "authenticated can read qms-files" sem verificação de projecto
-- A política correcta qms_files_select já existe com RLS por projecto
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "authenticated can read qms-files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can upload qms-files" ON storage.objects;

-- Garantir que qms_files_insert tem verificação de projecto
DROP POLICY IF EXISTS "qms_files_insert" ON storage.objects;
CREATE POLICY "qms_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qms-files'
    AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND (pm.project_id)::text = (string_to_array(name, '/'))[1]
        AND pm.is_active = true
    )
  );

-- ══════════════════════════════════════════════════════
-- FIX 2: notification_recipients — anon só pode ver token específico
-- (necessário para confirmação externa de HP por email)
-- Tornar mais restrito: apenas campos não sensíveis visíveis
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "anon_confirm_receipt_select" ON public.notification_recipients;
CREATE POLICY "anon_confirm_receipt_select" ON public.notification_recipients
  FOR SELECT TO anon
  USING (
    confirmation_token IS NOT NULL
    AND (confirmation_token)::text = COALESCE(
      (current_setting('request.headers', true)::json ->> 'x-confirmation-token'),
      ''
    )
  );

-- ══════════════════════════════════════════════════════
-- FIX 3: Realtime — garantir que publications não expõem
-- dados entre projectos (adicionar filtro na tabela notifications)
-- ══════════════════════════════════════════════════════
-- A política notifications_select_own já garante user_id = auth.uid()
-- O problema é que roles={public} inclui anon — corrigir para authenticated
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ══════════════════════════════════════════════════════
-- FIX 4: project_integrations — adicionar políticas RLS
-- (tabela sem políticas de escrita)
-- ══════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.project_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_integrations_select" ON public.project_integrations;
CREATE POLICY "project_integrations_select" ON public.project_integrations
  FOR SELECT TO authenticated
  USING (is_project_member((SELECT auth.uid()), project_id));

DROP POLICY IF EXISTS "project_integrations_insert" ON public.project_integrations;
CREATE POLICY "project_integrations_insert" ON public.project_integrations
  FOR INSERT TO authenticated
  WITH CHECK (is_project_admin((SELECT auth.uid()), project_id));

DROP POLICY IF EXISTS "project_integrations_update" ON public.project_integrations;
CREATE POLICY "project_integrations_update" ON public.project_integrations
  FOR UPDATE TO authenticated
  USING (is_project_admin((SELECT auth.uid()), project_id));

DROP POLICY IF EXISTS "project_integrations_delete" ON public.project_integrations;
CREATE POLICY "project_integrations_delete" ON public.project_integrations
  FOR DELETE TO authenticated
  USING (is_project_admin((SELECT auth.uid()), project_id));

-- Verificação final
SELECT 'storage_policies' as check, count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
UNION ALL
SELECT 'notification_policies', count(*) FROM pg_policies WHERE tablename IN ('notifications', 'notification_recipients')
UNION ALL
SELECT 'integration_policies', count(*) FROM pg_policies WHERE tablename = 'project_integrations';

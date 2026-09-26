-- Corrigir as 3 policies RLS que re-avaliam current_setting() por linha
-- (substituir por (SELECT current_setting(...)) para avaliação única por query)

-- 1. notification_recipients — SELECT anon
DROP POLICY IF EXISTS "anon_confirm_receipt_select" ON public.notification_recipients;
CREATE POLICY "anon_confirm_receipt_select" ON public.notification_recipients
  FOR SELECT TO anon
  USING (
    (confirmation_token)::text = COALESCE(
      ((SELECT current_setting('request.headers', true))::json ->> 'x-confirmation-token'),
      ''
    )
  );

-- 2. notification_recipients — UPDATE anon
DROP POLICY IF EXISTS "anon_confirm_receipt_update" ON public.notification_recipients;
CREATE POLICY "anon_confirm_receipt_update" ON public.notification_recipients
  FOR UPDATE TO anon
  USING (
    confirmed_at IS NULL
    AND (confirmation_token)::text = COALESCE(
      ((SELECT current_setting('request.headers', true))::json ->> 'x-confirmation-token'),
      ''
    )
  );

-- 3. notifications_log — SELECT anon
DROP POLICY IF EXISTS "anon_read_notif_log_by_token" ON public.notifications_log;
CREATE POLICY "anon_read_notif_log_by_token" ON public.notifications_log
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM notification_recipients nr
      WHERE nr.notification_id = notifications_log.id
        AND (nr.confirmation_token)::text = COALESCE(
          ((SELECT current_setting('request.headers', true))::json ->> 'x-confirmation-token'),
          ''
        )
    )
  );

-- Drop existing policy first, then recreate
DROP POLICY IF EXISTS "anon_read_notif_log_by_token" ON public.notifications_log;

CREATE POLICY "anon_read_notif_log_by_token"
  ON public.notifications_log
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients nr
      WHERE nr.notification_id = notifications_log.id
        AND nr.confirmation_token::text = current_setting('request.headers', true)::json->>'x-confirmation-token'
    )
  );

-- Ensure token-scoped policies exist on notification_recipients
DROP POLICY IF EXISTS "anon_select_by_token" ON public.notification_recipients;
CREATE POLICY "anon_select_by_token"
  ON public.notification_recipients
  FOR SELECT
  TO anon
  USING (
    confirmation_token::text = current_setting('request.headers', true)::json->>'x-confirmation-token'
  );

DROP POLICY IF EXISTS "anon_update_by_token" ON public.notification_recipients;
CREATE POLICY "anon_update_by_token"
  ON public.notification_recipients
  FOR UPDATE
  TO anon
  USING (
    confirmation_token::text = current_setting('request.headers', true)::json->>'x-confirmation-token'
  )
  WITH CHECK (
    confirmation_token::text = current_setting('request.headers', true)::json->>'x-confirmation-token'
  );
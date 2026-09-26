-- Corrigir policy anon_read_notif_log_by_token para usar (SELECT current_setting())
DROP POLICY IF EXISTS "anon_read_notif_log_by_token" ON public.notifications_log;

CREATE POLICY "anon_read_notif_log_by_token" ON public.notifications_log
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.notification_recipients nr
      WHERE nr.notification_id = notifications_log.id
        AND (nr.confirmation_token)::text = COALESCE(
          (( SELECT current_setting('request.headers', true))::json ->> 'x-confirmation-token'),
          ''
        )
    )
  );

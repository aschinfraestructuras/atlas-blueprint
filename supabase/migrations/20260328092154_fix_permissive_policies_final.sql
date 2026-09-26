-- O problema: notif_recipients_all usa "public" que inclui "anon"
-- Solução: converter para "authenticated" em vez de "public"

-- notification_recipients
DROP POLICY IF EXISTS notif_recipients_all ON public.notification_recipients;
CREATE POLICY notif_recipients_all ON public.notification_recipients
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM notifications_log nl
    WHERE nl.id = notification_recipients.notification_id
    AND is_project_member((SELECT auth.uid()), nl.project_id)
  )
);

-- notifications_log
DROP POLICY IF EXISTS notif_log_all ON public.notifications_log;
CREATE POLICY notif_log_all ON public.notifications_log
FOR ALL TO authenticated
USING (is_project_member((SELECT auth.uid()), project_id))
WITH CHECK (is_project_member((SELECT auth.uid()), project_id));

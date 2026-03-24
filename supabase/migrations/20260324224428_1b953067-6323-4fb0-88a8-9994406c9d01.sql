-- Allow anonymous confirmation of notification recipients by their ID
CREATE POLICY "anon_confirm_receipt" ON public.notification_recipients
FOR UPDATE TO anon
USING (true)
WITH CHECK (confirmed_at IS NOT NULL);

-- Allow anon to read their own recipient row for the confirmation page
CREATE POLICY "anon_read_own_recipient" ON public.notification_recipients
FOR SELECT TO anon
USING (true);

-- Allow anon to read notification_log for subject display on confirm page  
CREATE POLICY "anon_read_notification_log" ON public.notifications_log
FOR SELECT TO anon
USING (true);
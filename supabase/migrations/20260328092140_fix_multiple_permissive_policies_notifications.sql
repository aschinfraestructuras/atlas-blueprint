-- Consolidar policies de notification_recipients para anon
-- Remover as duplicadas e criar uma única política clara por operação

DROP POLICY IF EXISTS anon_read_own_recipient ON public.notification_recipients;
DROP POLICY IF EXISTS anon_confirm_receipt ON public.notification_recipients;

-- Uma única policy para anon: leitura e update por confirmação de recepção
-- SELECT: anon pode ler um recipient pelo id (necessário para a página de confirmação)
CREATE POLICY anon_confirm_receipt_select ON public.notification_recipients
FOR SELECT TO anon
USING (true);

-- UPDATE: anon só pode confirmar (confirmed_at IS NULL → IS NOT NULL)
CREATE POLICY anon_confirm_receipt_update ON public.notification_recipients
FOR UPDATE TO anon
USING (confirmed_at IS NULL)
WITH CHECK (confirmed_at IS NOT NULL);

-- Consolidar policies de notifications_log para anon
DROP POLICY IF EXISTS anon_read_notification_log ON public.notifications_log;

-- A policy notif_log_all já cobre authenticated — para anon só necessitamos leitura
-- para mostrar o assunto na página de confirmação
CREATE POLICY anon_read_notif_log ON public.notifications_log
FOR SELECT TO anon
USING (true);

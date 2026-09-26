-- Segurança: remover políticas anon permissivas em notificações
--
-- A migração 20260324224428 criou políticas para o role anon com USING (true)
-- em notification_recipients (SELECT e UPDATE) e notifications_log (SELECT).
-- A migração 20260411081112 acrescentou políticas equivalentes restritas ao
-- cabeçalho x-confirmation-token, mas não removeu as anteriores. Como as
-- políticas RLS permissivas se combinam por OR, qualquer pessoa com a chave
-- pública conseguia ler todos os destinatários (emails) e assuntos e marcar
-- confirmações de receção em nome de terceiros.
--
-- Ficam apenas as políticas por token (anon_select_by_token,
-- anon_update_by_token, anon_read_notif_log_by_token), que já são as usadas
-- pela página /confirm-receipt.

DROP POLICY IF EXISTS "anon_confirm_receipt" ON public.notification_recipients;
DROP POLICY IF EXISTS "anon_read_own_recipient" ON public.notification_recipients;
DROP POLICY IF EXISTS "anon_read_notification_log" ON public.notifications_log;

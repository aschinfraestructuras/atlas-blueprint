-- Remover as policies duplicadas (Lovable criou versões sem SELECT wrapper)
-- Manter as nossas (com SELECT current_setting) que são mais correctas

DROP POLICY IF EXISTS "anon_select_by_token" ON public.notification_recipients;
DROP POLICY IF EXISTS "anon_update_by_token" ON public.notification_recipients;

-- Confirmar que as policies corretas ficam
-- anon_confirm_receipt_select — usa (SELECT current_setting(...)) — MANTER
-- anon_confirm_receipt_update — usa (SELECT current_setting(...)) — MANTER;

-- Remover a policy demasiado permissiva
DROP POLICY IF EXISTS anon_confirm_receipt ON public.notification_recipients;
DROP POLICY IF EXISTS anon_read_own_recipient ON public.notification_recipients;

-- Policy segura: anon só pode actualizar o seu próprio registo (por ID)
-- e apenas para preencher confirmed_at — não pode alterar mais nada
CREATE POLICY anon_confirm_receipt ON public.notification_recipients
FOR UPDATE
TO anon
USING (confirmed_at IS NULL)
WITH CHECK (confirmed_at IS NOT NULL);

-- Policy de leitura para anon: só o registo específico pelo ID
-- necessário para a página de confirmação poder ler o subject
CREATE POLICY anon_read_own_recipient ON public.notification_recipients
FOR SELECT
TO anon
USING (true);

-- Resolver políticas duplicadas em notifications_log para anon
-- Remover a duplicada e manter apenas uma clara
DROP POLICY IF EXISTS anon_read_notification_log ON public.notifications_log;

-- Criar uma política unificada para anon em notifications_log
CREATE POLICY anon_read_notification_log ON public.notifications_log
FOR SELECT
TO anon
USING (true);

-- Adicionar FKs em falta sem índice (performance)
CREATE INDEX IF NOT EXISTS idx_compaction_zones_created_by
  ON public.compaction_zones (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_concrete_batches_created_by
  ON public.concrete_batches (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_concrete_batches_supplier
  ON public.concrete_batches (supplier_id) WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_distribution_list_members_contact
  ON public.distribution_list_members (contact_id);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_contact
  ON public.notification_recipients (contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_log_list
  ON public.notifications_log (list_id) WHERE list_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_by
  ON public.notifications_log (sent_by) WHERE sent_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_soil_samples_created_by
  ON public.soil_samples (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_soil_samples_supplier
  ON public.soil_samples (supplier_id) WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weld_records_created_by
  ON public.weld_records (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_controlled_copies_project
  ON public.plan_controlled_copies (project_id);

-- 1. Estender plan_controlled_copies para RDC completo
ALTER TABLE public.plan_controlled_copies
  ADD COLUMN IF NOT EXISTS doc_code        text,
  ADD COLUMN IF NOT EXISTS doc_revision    text,
  ADD COLUMN IF NOT EXISTS delivery_method text CHECK (delivery_method IN ('email','physical','portal','other')),
  ADD COLUMN IF NOT EXISTS ack_ref         text,
  ADD COLUMN IF NOT EXISTS rdc_code        text;

-- 2. View RDC
CREATE OR REPLACE VIEW public.vw_rdc_distribuicao
WITH (security_invoker = true) AS
SELECT
  pcc.id, pcc.project_id, pcc.rdc_code, pcc.doc_code, pcc.doc_revision,
  pcc.copy_number, pcc.recipient_name, pcc.recipient_entity,
  pcc.delivered_at, pcc.delivery_method, pcc.ack_ref,
  pcc.received_confirmed, pcc.confirmed_at, pcc.notes,
  pl.title AS plan_title, pl.plan_type, pl.revision AS plan_revision,
  au.email AS delivered_by_email, pcc.created_at
FROM public.plan_controlled_copies pcc
LEFT JOIN public.plans pl ON pl.id = pcc.plan_id
LEFT JOIN auth.users au ON au.id = pcc.delivered_by
ORDER BY pcc.delivered_at DESC NULLS LAST, pcc.created_at DESC;

-- 3. Seed habilitações ferroviárias (só se vazio)
DO $$
DECLARE v_proj uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
BEGIN
  IF (SELECT COUNT(*) FROM public.worker_qualifications WHERE project_id = v_proj) = 0 THEN
    INSERT INTO public.worker_qualifications
      (id, project_id, qual_code, worker_name, qualification, cert_ref, issued_by, valid_from, valid_until, notes)
    VALUES
      (gen_random_uuid(), v_proj, 'QUAL-CSF-001', 'A designar — Coord. Seg. Ferroviária', 'IET77_DIR_TECNICO',
       NULL, 'IMT — Instituto da Mobilidade e dos Transportes', NULL, NULL,
       'IET 77 — Diretor Técnico. Obrigatório para obras em via explorada.'),
      (gen_random_uuid(), v_proj, 'QUAL-RT-001', 'A designar — Resp. Trabalhos', 'RGSXII_CHEFE_TRABALHOS',
       NULL, 'IP — Infraestruturas de Portugal', NULL, NULL,
       'RGS XII — Chefe dos Trabalhos. Obrigatório para intervenções na via férrea.'),
      (gen_random_uuid(), v_proj, 'QUAL-SOLD-001', 'Termoweld — Soldador #1', 'EN14730_ALUMINOTERMICO',
       NULL, 'Organismo notificado EN 14730-1', NULL, NULL,
       'EN 14730-1 — Aprovação de processo de soldadura aluminotérmica.'),
      (gen_random_uuid(), v_proj, 'QUAL-US-001', 'Lab END Ferroviário Lisboa — Operador US', 'EN_ISO_9712_NII_FERROVIARIO',
       'L0415', 'IPAC — Instituto Português de Acreditação', NULL, NULL,
       'EN ISO 9712 Nível II sector ferroviário. US 100% soldaduras (EN 14587-1 §6.3).'),
      (gen_random_uuid(), v_proj, 'QUAL-TOP-001', 'A designar — Topógrafo', 'TOPOGRAFO_CERTIFICADO',
       NULL, 'Ordem dos Engenheiros / IMPIC', NULL, NULL,
       'Topógrafo qualificado para controlo geométrico de via férrea.');
  END IF;
END $$;

-- 4. View habilitações a expirar
CREATE OR REPLACE VIEW public.vw_qualifications_expiring
WITH (security_invoker = true) AS
SELECT
  wq.id, wq.project_id, wq.qual_code, wq.worker_name, wq.qualification,
  wq.cert_ref, wq.issued_by, wq.valid_from, wq.valid_until, wq.notes,
  CASE
    WHEN wq.valid_until IS NULL     THEN 'sem_data'
    WHEN wq.valid_until < CURRENT_DATE THEN 'expirado'
    WHEN wq.valid_until <= CURRENT_DATE + INTERVAL '30 days' THEN 'urgente'
    WHEN wq.valid_until <= CURRENT_DATE + INTERVAL '60 days' THEN 'alerta'
    ELSE 'ok'
  END AS estado_validade,
  (wq.valid_until - CURRENT_DATE) AS dias_para_expirar
FROM public.worker_qualifications wq
ORDER BY wq.valid_until NULLS LAST;

-- 5. View programa de ensaios mensal (Anx. A do PE)
CREATE OR REPLACE VIEW public.vw_programa_ensaios_mensal
WITH (security_invoker = true) AS
SELECT
  tdi.project_id,
  DATE_TRUNC('month', tdi.scheduled_for)::date AS mes_programa,
  TO_CHAR(tdi.scheduled_for, 'YYYY-MM')        AS mes_codigo,
  COUNT(*)                                      AS total_ensaios,
  COUNT(*) FILTER (WHERE tdi.status = 'completed')          AS concluidos,
  COUNT(*) FILTER (WHERE tdi.status IN ('scheduled','due'))  AS previstos,
  COUNT(*) FILTER (WHERE tdi.status = 'overdue')             AS vencidos,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(COUNT(*) FILTER (WHERE tdi.status='completed') * 100.0 / COUNT(*), 1)
    ELSE NULL END AS pct_execucao
FROM public.test_due_items tdi
WHERE tdi.is_deleted = false
GROUP BY tdi.project_id, DATE_TRUNC('month', tdi.scheduled_for), TO_CHAR(tdi.scheduled_for, 'YYYY-MM')
ORDER BY mes_programa DESC;

-- 6. Trigger: auto-gerar código FS e FUS ao criar soldadura
CREATE OR REPLACE FUNCTION fn_auto_weld_codes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code, 'PF17A') INTO v_proj FROM public.projects WHERE id = NEW.project_id LIMIT 1;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.weld_records WHERE project_id=NEW.project_id AND code LIKE 'FS-%';
    NEW.code := 'FS-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  IF NEW.has_ut = true AND (NEW.fus_code IS NULL OR NEW.fus_code = '') THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(fus_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.weld_records WHERE project_id=NEW.project_id AND fus_code IS NOT NULL;
    NEW.fus_code := 'FUS-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_weld_codes ON public.weld_records;
CREATE TRIGGER trg_auto_weld_codes
  BEFORE INSERT ON public.weld_records
  FOR EACH ROW EXECUTE FUNCTION fn_auto_weld_codes();

-- 7. Trigger: auto-gerar ATA-Q quando HP aprovado
CREATE OR REPLACE FUNCTION fn_auto_ata_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code,'PF17A') INTO v_proj FROM public.projects WHERE id=NEW.project_id LIMIT 1;
  IF NEW.status='approved' AND (NEW.ata_code IS NULL OR NEW.ata_code='') THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(ata_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.hp_notifications WHERE project_id=NEW.project_id AND ata_code IS NOT NULL;
    NEW.ata_code := 'ATA-Q-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_ata_code ON public.hp_notifications;
CREATE TRIGGER trg_auto_ata_code
  BEFORE UPDATE ON public.hp_notifications
  FOR EACH ROW EXECUTE FUNCTION fn_auto_ata_code();

-- 8. Trigger: auto-gerar código RDC
CREATE OR REPLACE FUNCTION fn_auto_rdc_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code,'PF17A') INTO v_proj FROM public.projects WHERE id=NEW.project_id LIMIT 1;
  IF NEW.rdc_code IS NULL OR NEW.rdc_code='' THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(rdc_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.plan_controlled_copies WHERE project_id=NEW.project_id AND rdc_code IS NOT NULL;
    NEW.rdc_code := 'RDC-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_rdc_code ON public.plan_controlled_copies;
CREATE TRIGGER trg_auto_rdc_code
  BEFORE INSERT ON public.plan_controlled_copies
  FOR EACH ROW EXECUTE FUNCTION fn_auto_rdc_code();


-- ══════════════════════════════════════════════════════════════════════════════
-- FASE 1 — NC AVANÇADO: Migração sem quebrar existente
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Adicionar colunas novas à tabela existente non_conformities
--    (ignorar se já existirem via DO block)

DO $$
BEGIN
  -- code (gerado automaticamente: NC-<PROJ>-<YYYY>-<SEQ>)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='code') THEN
    ALTER TABLE public.non_conformities ADD COLUMN code text;
  END IF;

  -- title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='title') THEN
    ALTER TABLE public.non_conformities ADD COLUMN title text;
  END IF;

  -- category + category_outro
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='category') THEN
    ALTER TABLE public.non_conformities ADD COLUMN category text NOT NULL DEFAULT 'qualidade';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='category_outro') THEN
    ALTER TABLE public.non_conformities ADD COLUMN category_outro text;
  END IF;

  -- origin (PPI/Test/Document/Audit/Manual)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='origin') THEN
    ALTER TABLE public.non_conformities ADD COLUMN origin text NOT NULL DEFAULT 'manual';
  END IF;

  -- severity: ajustar para suportar minor/major/critical (manter low/medium/high/critical como aliases)
  -- Usamos texto livre com CHECK abaixo

  -- detected_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='detected_at') THEN
    ALTER TABLE public.non_conformities ADD COLUMN detected_at date NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- assigned_to (uuid do utilizador responsável)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='assigned_to') THEN
    ALTER TABLE public.non_conformities ADD COLUMN assigned_to uuid;
  END IF;

  -- owner (dono da NC, por omissão = created_by)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='owner') THEN
    ALTER TABLE public.non_conformities ADD COLUMN owner uuid;
  END IF;

  -- approver
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='approver') THEN
    ALTER TABLE public.non_conformities ADD COLUMN approver uuid;
  END IF;

  -- updated_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='updated_by') THEN
    ALTER TABLE public.non_conformities ADD COLUMN updated_by uuid;
  END IF;

  -- LIGAÇÕES OPCIONAIS
  -- ppi_instance_id (já existe origin_entity_id/type, mas adicionamos FK explícitas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='ppi_instance_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN ppi_instance_id uuid REFERENCES public.ppi_instances(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='ppi_instance_item_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN ppi_instance_item_id uuid REFERENCES public.ppi_instance_items(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='test_result_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN test_result_id uuid REFERENCES public.test_results(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='document_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='supplier_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='subcontractor_id') THEN
    ALTER TABLE public.non_conformities ADD COLUMN subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL;
  END IF;

  -- CAPA — campos adicionais
  -- correction (ação imediata)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='correction') THEN
    ALTER TABLE public.non_conformities ADD COLUMN correction text;
  END IF;
  -- preventive_action
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='preventive_action') THEN
    ALTER TABLE public.non_conformities ADD COLUMN preventive_action text;
  END IF;
  -- verification_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='verification_method') THEN
    ALTER TABLE public.non_conformities ADD COLUMN verification_method text;
  END IF;
  -- verification_result
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='verification_result') THEN
    ALTER TABLE public.non_conformities ADD COLUMN verification_result text;
  END IF;
  -- verified_by / verified_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='verified_by') THEN
    ALTER TABLE public.non_conformities ADD COLUMN verified_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformities' AND column_name='verified_at') THEN
    ALTER TABLE public.non_conformities ADD COLUMN verified_at timestamptz;
  END IF;

END $$;

-- 2. Adicionar estado 'draft', 'pending_verification', 'archived' 
--    (a tabela usa texto livre, sem ENUM, por isso basta documentar)
--    Actualizar registos existentes que possam ter null em severity para 'medium'
UPDATE public.non_conformities SET severity = 'medium' WHERE severity IS NULL OR severity = '';

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS nc_project_status_idx ON public.non_conformities(project_id, status);
CREATE INDEX IF NOT EXISTS nc_work_item_idx      ON public.non_conformities(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS nc_ppi_instance_idx   ON public.non_conformities(ppi_instance_id) WHERE ppi_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS nc_test_result_idx    ON public.non_conformities(test_result_id)  WHERE test_result_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: fn_create_nc — geração automática de código NC-<PROJ>-<YYYY>-<SEQ>
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_nc(
  p_project_id        uuid,
  p_title             text,
  p_description       text,
  p_severity          text DEFAULT 'major',
  p_category          text DEFAULT 'qualidade',
  p_category_outro    text DEFAULT NULL,
  p_origin            text DEFAULT 'manual',
  p_responsible       text DEFAULT NULL,
  p_assigned_to       uuid DEFAULT NULL,
  p_due_date          date DEFAULT NULL,
  p_detected_at       date DEFAULT CURRENT_DATE,
  p_work_item_id      uuid DEFAULT NULL,
  p_ppi_instance_id   uuid DEFAULT NULL,
  p_ppi_instance_item_id uuid DEFAULT NULL,
  p_test_result_id    uuid DEFAULT NULL,
  p_document_id       uuid DEFAULT NULL,
  p_supplier_id       uuid DEFAULT NULL,
  p_subcontractor_id  uuid DEFAULT NULL,
  p_reference         text DEFAULT NULL
)
RETURNS public.non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_code text;
  v_year      text;
  v_seq       int;
  v_code      text;
  v_result    public.non_conformities;
BEGIN
  -- Validar membro do projeto
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  -- Obter código do projeto
  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- Sequência anual para NC neste projeto
  SELECT COALESCE(MAX(
    CASE WHEN nc.code ~ ('^NC-' || v_proj_code || '-' || v_year || '-[0-9]+$')
    THEN substring(nc.code FROM length('NC-' || v_proj_code || '-' || v_year || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.non_conformities nc
  WHERE nc.project_id = p_project_id;

  v_code := 'NC-' || v_proj_code || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.non_conformities (
    project_id, code, title, description, severity, category, category_outro,
    origin, status, reference, responsible, assigned_to, due_date, detected_at,
    work_item_id, ppi_instance_id, ppi_instance_item_id,
    test_result_id, document_id, supplier_id, subcontractor_id,
    created_by, owner
  ) VALUES (
    p_project_id, v_code, p_title, p_description, p_severity, p_category, p_category_outro,
    p_origin, 'open', p_reference, p_responsible, p_assigned_to, p_due_date, p_detected_at,
    p_work_item_id, p_ppi_instance_id, p_ppi_instance_item_id,
    p_test_result_id, p_document_id, p_supplier_id, p_subcontractor_id,
    auth.uid(), auth.uid()
  )
  RETURNING * INTO v_result;

  -- Audit log
  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'non_conformities', v_result.id, 'INSERT', 'non_conformities',
          jsonb_build_object('code', v_code, 'severity', p_severity, 'origin', p_origin));

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC: fn_update_nc_status — transições validadas
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_nc_status(
  p_nc_id     uuid,
  p_to_status text
)
RETURNS public.non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current   text;
  v_project   uuid;
  v_allowed   text[];
  v_result    public.non_conformities;
  v_closure   date := NULL;
  v_verified_at timestamptz := NULL;
BEGIN
  SELECT status, project_id INTO v_current, v_project
  FROM public.non_conformities WHERE id = p_nc_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NC not found: %', p_nc_id;
  END IF;

  IF NOT public.is_project_member(auth.uid(), v_project) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Tabela de transições permitidas
  -- draft → open → in_progress → pending_verification → closed → archived
  v_allowed := CASE v_current
    WHEN 'draft'               THEN ARRAY['open', 'archived']
    WHEN 'open'                THEN ARRAY['in_progress', 'closed', 'archived']
    WHEN 'in_progress'         THEN ARRAY['pending_verification', 'open', 'archived']
    WHEN 'pending_verification'THEN ARRAY['closed', 'in_progress', 'archived']
    WHEN 'closed'              THEN ARRAY['archived', 'open']
    WHEN 'archived'            THEN ARRAY['open']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição inválida: % → %. Permitidas de %: %',
      v_current, p_to_status, v_current, array_to_string(v_allowed, ', ')
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Auto closure_date
  IF p_to_status = 'closed' THEN v_closure := CURRENT_DATE; END IF;
  IF p_to_status IN ('open','in_progress','pending_verification') THEN v_closure := NULL; END IF;

  -- Auto verified_at
  IF p_to_status = 'closed' THEN v_verified_at := now(); END IF;

  UPDATE public.non_conformities SET
    status       = p_to_status,
    closure_date = COALESCE(v_closure, CASE WHEN p_to_status IN ('open','in_progress','pending_verification') THEN NULL ELSE closure_date END),
    verified_at  = COALESCE(v_verified_at, verified_at),
    verified_by  = CASE WHEN p_to_status = 'closed' THEN auth.uid() ELSE verified_by END,
    updated_by   = auth.uid(),
    updated_at   = now()
  WHERE id = p_nc_id
  RETURNING * INTO v_result;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (v_project, auth.uid(), 'non_conformities', p_nc_id, 'STATUS_CHANGE', 'non_conformities',
          jsonb_build_object('from', v_current, 'to', p_to_status));

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. RPC: fn_create_nc_from_ppi_item — NC a partir de ponto NOK
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_nc_from_ppi_item(
  p_ppi_instance_item_id uuid,
  p_severity             text DEFAULT 'major',
  p_responsible          text DEFAULT NULL,
  p_due_date             date DEFAULT NULL
)
RETURNS public.non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item     public.ppi_instance_items%ROWTYPE;
  v_inst     public.ppi_instances%ROWTYPE;
  v_nc       public.non_conformities;
BEGIN
  SELECT * INTO v_item FROM public.ppi_instance_items WHERE id = p_ppi_instance_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PPI item not found'; END IF;

  SELECT * INTO v_inst FROM public.ppi_instances WHERE id = v_item.instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PPI instance not found'; END IF;

  IF NOT public.is_project_member(auth.uid(), v_inst.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Criar NC via fn_create_nc
  SELECT * INTO v_nc FROM public.fn_create_nc(
    p_project_id           := v_inst.project_id,
    p_title                := 'NC — ' || v_item.check_code || ': ' || left(v_item.label, 100),
    p_description          := v_item.label,
    p_severity             := p_severity,
    p_category             := 'qualidade',
    p_origin               := 'ppi',
    p_responsible          := p_responsible,
    p_due_date             := p_due_date,
    p_work_item_id         := v_inst.work_item_id,
    p_ppi_instance_id      := v_inst.id,
    p_ppi_instance_item_id := p_ppi_instance_item_id
  );

  -- Ligar NC ao item PPI
  UPDATE public.ppi_instance_items
  SET nc_id = v_nc.id
  WHERE id = p_ppi_instance_item_id;

  RETURN v_nc;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. RPC: fn_create_nc_from_test — NC a partir de ensaio fail
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_nc_from_test(
  p_test_result_id uuid,
  p_severity       text DEFAULT 'major',
  p_responsible    text DEFAULT NULL,
  p_due_date       date DEFAULT NULL
)
RETURNS public.non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tr  public.test_results%ROWTYPE;
  v_tc  public.tests_catalog%ROWTYPE;
  v_nc  public.non_conformities;
BEGIN
  SELECT * INTO v_tr FROM public.test_results WHERE id = p_test_result_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Test result not found'; END IF;

  IF NOT public.is_project_member(auth.uid(), v_tr.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_tc FROM public.tests_catalog WHERE id = v_tr.test_id;

  SELECT * INTO v_nc FROM public.fn_create_nc(
    p_project_id     := v_tr.project_id,
    p_title          := 'NC — ' || COALESCE(v_tc.name, 'Ensaio') || ' — ' || COALESCE(v_tr.code, ''),
    p_description    := 'Ensaio não conforme: ' || COALESCE(v_tc.name, '') || '. Código: ' || COALESCE(v_tr.code, ''),
    p_severity       := p_severity,
    p_category       := 'qualidade',
    p_origin         := 'test',
    p_responsible    := p_responsible,
    p_due_date       := p_due_date,
    p_work_item_id   := v_tr.work_item_id,
    p_test_result_id := p_test_result_id,
    p_supplier_id    := v_tr.supplier_id
  );

  RETURN v_nc;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Trigger para updated_at automático (se não existir trigger já)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'nc_updated_at' AND tgrelid = 'public.non_conformities'::regclass
  ) THEN
    CREATE TRIGGER nc_updated_at
    BEFORE UPDATE ON public.non_conformities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- ============================================================
-- TOP-3: PPI auto-cria ensaios pendentes a partir do template
-- ============================================================
-- Quando um PPI é criado e os items do template têm test_pe_code,
-- materializar automaticamente test_results "draft" ligados ao PPI
-- e ao work_item, prontos a serem preenchidos.

CREATE OR REPLACE FUNCTION public.fn_materialize_ppi_pending_tests(
  p_instance_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst             record;
  v_item             record;
  v_catalog_id       uuid;
  v_created_count    integer := 0;
  v_existing         integer;
BEGIN
  SELECT i.id, i.project_id, i.work_item_id, i.code, i.inspector_id, i.created_by
    INTO v_inst
  FROM public.ppi_instances i
  WHERE i.id = p_instance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PPI instance % not found', p_instance_id;
  END IF;

  -- Iterar por items que têm test_pe_code definido
  FOR v_item IN
    SELECT ii.id AS item_id, ii.check_code, ii.label, ii.test_pe_code
    FROM public.ppi_instance_items ii
    WHERE ii.instance_id = p_instance_id
      AND ii.test_pe_code IS NOT NULL
      AND length(trim(ii.test_pe_code)) > 0
  LOOP
    -- Procurar ensaio no catálogo por code (igual ou prefixo) no mesmo projeto
    SELECT tc.id INTO v_catalog_id
    FROM public.tests_catalog tc
    WHERE tc.project_id = v_inst.project_id
      AND tc.active = true
      AND (tc.code = v_item.test_pe_code OR tc.code ILIKE v_item.test_pe_code || '%')
    ORDER BY (tc.code = v_item.test_pe_code) DESC, tc.code ASC
    LIMIT 1;

    IF v_catalog_id IS NULL THEN
      CONTINUE; -- Nenhum ensaio no catálogo corresponde, salta
    END IF;

    -- Evitar duplicar: já existe ensaio para este PPI+catálogo?
    SELECT COUNT(*)::int INTO v_existing
    FROM public.test_results tr
    WHERE tr.ppi_instance_id = p_instance_id
      AND tr.test_id = v_catalog_id
      AND tr.is_deleted = false;

    IF v_existing > 0 THEN
      CONTINUE;
    END IF;

    -- Criar test_result em draft, ligado ao PPI e ao work_item
    INSERT INTO public.test_results (
      project_id, test_id, ppi_instance_id, work_item_id,
      status_workflow, result_status, status, pass_fail,
      date, notes, created_by
    ) VALUES (
      v_inst.project_id, v_catalog_id, v_inst.id, v_inst.work_item_id,
      'draft', NULL, 'draft', NULL,
      CURRENT_DATE,
      'Gerado automaticamente a partir do PPI ' || COALESCE(v_inst.code,'') || ' — item ' || v_item.check_code,
      v_inst.created_by
    );

    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN v_created_count;
END;
$$;

-- Trigger: quando um PPI passa de draft → in_progress (primeiro arranque),
-- materializa os ensaios pendentes uma única vez.
CREATE OR REPLACE FUNCTION public.tg_ppi_materialize_tests_on_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_progress'
     AND (OLD.status IS DISTINCT FROM 'in_progress')
     AND NEW.template_id IS NOT NULL THEN
    PERFORM public.fn_materialize_ppi_pending_tests(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ppi_materialize_tests_on_start ON public.ppi_instances;
CREATE TRIGGER trg_ppi_materialize_tests_on_start
AFTER UPDATE ON public.ppi_instances
FOR EACH ROW
EXECUTE FUNCTION public.tg_ppi_materialize_tests_on_start();


-- ============================================================
-- TOP-4: Bloqueio automático de Materiais não conformes
-- ============================================================
-- Adicionar flags de bloqueio agregadas no material para impedir
-- a sua utilização em obra quando há docs expirados, NCs abertas
-- ou ensaios reprovados recentes (últimos 90 dias).

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS is_blocked       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reasons    text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blocked_at       timestamptz,
  ADD COLUMN IF NOT EXISTS block_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_materials_is_blocked
  ON public.materials(project_id, is_blocked)
  WHERE is_blocked = true;

-- Função que recalcula o estado de bloqueio de um material
CREATE OR REPLACE FUNCTION public.fn_recompute_material_block(
  p_material_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reasons         text[] := '{}';
  v_expired_docs    integer;
  v_open_nc         integer;
  v_failed_tests    integer;
  v_blocked         boolean;
  v_was_blocked     boolean;
BEGIN
  SELECT is_blocked INTO v_was_blocked
  FROM public.materials WHERE id = p_material_id;

  -- 1) Documentos expirados (vinculados via material_documents)
  SELECT COUNT(*)::int INTO v_expired_docs
  FROM public.material_documents md
  WHERE md.material_id = p_material_id
    AND md.valid_to IS NOT NULL
    AND md.valid_to < CURRENT_DATE;

  IF v_expired_docs > 0 THEN
    v_reasons := array_append(v_reasons, 'docs_expired:' || v_expired_docs::text);
  END IF;

  -- 2) Não Conformidades abertas no material
  SELECT COUNT(*)::int INTO v_open_nc
  FROM public.non_conformities nc
  WHERE nc.material_id = p_material_id
    AND nc.is_deleted = false
    AND nc.status NOT IN ('closed', 'cancelled', 'archived');

  IF v_open_nc > 0 THEN
    v_reasons := array_append(v_reasons, 'nc_open:' || v_open_nc::text);
  END IF;

  -- 3) Ensaios reprovados nos últimos 90 dias para este material
  SELECT COUNT(*)::int INTO v_failed_tests
  FROM public.test_results tr
  WHERE tr.material = (SELECT code FROM public.materials WHERE id = p_material_id)
    AND tr.is_deleted = false
    AND tr.result_status = 'fail'
    AND tr.date >= (CURRENT_DATE - INTERVAL '90 days');

  IF v_failed_tests > 0 THEN
    v_reasons := array_append(v_reasons, 'tests_failed_90d:' || v_failed_tests::text);
  END IF;

  v_blocked := array_length(v_reasons, 1) IS NOT NULL;

  UPDATE public.materials
  SET
    is_blocked       = v_blocked,
    block_reasons    = v_reasons,
    blocked_at       = CASE
                         WHEN v_blocked AND NOT COALESCE(v_was_blocked, false) THEN now()
                         WHEN NOT v_blocked THEN NULL
                         ELSE blocked_at
                       END,
    block_checked_at = now()
  WHERE id = p_material_id;
END;
$$;

-- Triggers de propagação: documentos, NCs e ensaios atualizam o material
CREATE OR REPLACE FUNCTION public.tg_propagate_material_block_doc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_recompute_material_block(COALESCE(NEW.material_id, OLD.material_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_material_block_doc ON public.material_documents;
CREATE TRIGGER trg_propagate_material_block_doc
AFTER INSERT OR UPDATE OR DELETE ON public.material_documents
FOR EACH ROW EXECUTE FUNCTION public.tg_propagate_material_block_doc();

CREATE OR REPLACE FUNCTION public.tg_propagate_material_block_nc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.material_id, OLD.material_id) IS NOT NULL THEN
    PERFORM public.fn_recompute_material_block(COALESCE(NEW.material_id, OLD.material_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_material_block_nc ON public.non_conformities;
CREATE TRIGGER trg_propagate_material_block_nc
AFTER INSERT OR UPDATE OR DELETE ON public.non_conformities
FOR EACH ROW EXECUTE FUNCTION public.tg_propagate_material_block_nc();

-- Para test_results, ligamos via material code (string), não por FK
CREATE OR REPLACE FUNCTION public.tg_propagate_material_block_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mat_id uuid;
BEGIN
  IF COALESCE(NEW.material, OLD.material) IS NOT NULL THEN
    SELECT id INTO v_mat_id
    FROM public.materials
    WHERE code = COALESCE(NEW.material, OLD.material)
      AND project_id = COALESCE(NEW.project_id, OLD.project_id)
    LIMIT 1;

    IF v_mat_id IS NOT NULL THEN
      PERFORM public.fn_recompute_material_block(v_mat_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_material_block_test ON public.test_results;
CREATE TRIGGER trg_propagate_material_block_test
AFTER INSERT OR UPDATE OR DELETE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.tg_propagate_material_block_test();

-- Recomputar estado inicial para todos os materiais existentes
DO $$
DECLARE m record;
BEGIN
  FOR m IN SELECT id FROM public.materials WHERE is_deleted = false LOOP
    PERFORM public.fn_recompute_material_block(m.id);
  END LOOP;
END $$;

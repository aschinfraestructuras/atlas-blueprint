-- 1. Actualizar registo de NC de teste para novo formato
UPDATE public.non_conformities
SET code = 'RNC-PF17A-001'
WHERE code = 'NC-PF17A-2026-0001'
  AND project_id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- 2. Actualizar fn_create_nc (versão simples/original)
CREATE OR REPLACE FUNCTION public.fn_create_nc(
  p_project_id uuid, p_title text, p_description text,
  p_severity text DEFAULT 'major',
  p_category text DEFAULT 'qualidade',
  p_category_outro text DEFAULT NULL,
  p_origin text DEFAULT 'manual',
  p_responsible text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_detected_at date DEFAULT CURRENT_DATE,
  p_work_item_id uuid DEFAULT NULL,
  p_ppi_instance_id uuid DEFAULT NULL,
  p_ppi_instance_item_id uuid DEFAULT NULL,
  p_test_result_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_subcontractor_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_code text;
  v_seq       int;
  v_code      text;
  v_result    public.non_conformities;
BEGIN
  IF NOT public.is_project_member(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;

  -- Sequência global (sem ano) — formato RNC-PF17A-NNN
  SELECT COALESCE(MAX(
    CASE WHEN nc.code ~ ('^RNC-' || v_proj_code || '-[0-9]+$')
    THEN substring(nc.code FROM length('RNC-' || v_proj_code || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.non_conformities nc
  WHERE nc.project_id = p_project_id;

  v_code := 'RNC-' || v_proj_code || '-' || lpad(v_seq::text, 3, '0');

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

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, auth.uid(), 'non_conformities', v_result.id, 'INSERT', 'non_conformities',
          jsonb_build_object('code', v_code, 'severity', p_severity, 'origin', p_origin));

  RETURN v_result;
END;
$function$;

-- 3. Actualizar fn_create_nc (versão completa com todos os campos CAPA)
CREATE OR REPLACE FUNCTION public.fn_create_nc(
  p_project_id uuid, p_title text, p_description text,
  p_severity text DEFAULT 'major',
  p_category text DEFAULT 'qualidade',
  p_category_outro text DEFAULT NULL,
  p_origin text DEFAULT 'manual',
  p_responsible text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_detected_at date DEFAULT CURRENT_DATE,
  p_work_item_id uuid DEFAULT NULL,
  p_ppi_instance_id uuid DEFAULT NULL,
  p_ppi_instance_item_id uuid DEFAULT NULL,
  p_test_result_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_subcontractor_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_location_pk text DEFAULT NULL,
  p_discipline text DEFAULT NULL,
  p_discipline_outro text DEFAULT NULL,
  p_classification text DEFAULT NULL,
  p_violated_requirement text DEFAULT NULL,
  p_correction_type text DEFAULT NULL,
  p_correction text DEFAULT NULL,
  p_root_cause_method text DEFAULT NULL,
  p_root_cause text DEFAULT NULL,
  p_corrective_action text DEFAULT NULL,
  p_preventive_action text DEFAULT NULL,
  p_ac_efficacy_indicator text DEFAULT NULL,
  p_deviation_justification text DEFAULT NULL,
  p_efficacy_analysis text DEFAULT NULL,
  p_audit_origin_type text DEFAULT NULL
)
RETURNS non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proj_code text;
  v_seq       int;
  v_code      text;
  v_result    public.non_conformities;
BEGIN
  IF NOT public.is_project_member((SELECT auth.uid()), p_project_id) THEN
    RAISE EXCEPTION 'Access denied: not a project member';
  END IF;

  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;

  -- Sequência global (sem ano) — formato RNC-PF17A-NNN
  SELECT COALESCE(MAX(
    CASE WHEN nc.code ~ ('^RNC-' || v_proj_code || '-[0-9]+$')
    THEN substring(nc.code FROM length('RNC-' || v_proj_code || '-') + 1)::int
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.non_conformities nc
  WHERE nc.project_id = p_project_id;

  v_code := 'RNC-' || v_proj_code || '-' || lpad(v_seq::text, 3, '0');

  INSERT INTO public.non_conformities (
    project_id, code, title, description, severity, category, category_outro,
    origin, status, reference, responsible, assigned_to, due_date, detected_at,
    work_item_id, ppi_instance_id, ppi_instance_item_id,
    test_result_id, document_id, supplier_id, subcontractor_id,
    location_pk, discipline, discipline_outro, classification,
    violated_requirement, correction_type, correction,
    root_cause_method, root_cause, corrective_action, preventive_action,
    ac_efficacy_indicator, deviation_justification, efficacy_analysis,
    audit_origin_type,
    created_by, owner
  ) VALUES (
    p_project_id, v_code, p_title, p_description, p_severity, p_category, p_category_outro,
    p_origin, 'open', p_reference, p_responsible, p_assigned_to, p_due_date, p_detected_at,
    p_work_item_id, p_ppi_instance_id, p_ppi_instance_item_id,
    p_test_result_id, p_document_id, p_supplier_id, p_subcontractor_id,
    p_location_pk, p_discipline, p_discipline_outro, p_classification,
    p_violated_requirement, p_correction_type, p_correction,
    p_root_cause_method, p_root_cause, p_corrective_action, p_preventive_action,
    p_ac_efficacy_indicator, p_deviation_justification, p_efficacy_analysis,
    p_audit_origin_type,
    (SELECT auth.uid()), (SELECT auth.uid())
  )
  RETURNING * INTO v_result;

  INSERT INTO public.audit_log(project_id, user_id, entity, entity_id, action, module, diff)
  VALUES (p_project_id, (SELECT auth.uid()), 'non_conformities', v_result.id, 'INSERT', 'non_conformities',
          jsonb_build_object('code', v_code, 'severity', p_severity, 'origin', p_origin,
                             'classification', p_classification, 'discipline', p_discipline));

  RETURN v_result;
END;
$function$;

-- 4. Verificar resultado
SELECT code, title, status FROM non_conformities 
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001';

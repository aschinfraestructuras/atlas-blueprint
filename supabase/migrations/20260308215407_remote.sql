-- Fix: Remove auth.users exposure from vw_audit_log
-- Must DROP first because we're removing the user_email column
DROP VIEW IF EXISTS public.vw_audit_log;

CREATE VIEW public.vw_audit_log
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.project_id,
  a.user_id,
  a.entity,
  a.entity_id,
  a.action,
  a.diff,
  a.module,
  a.performed_by,
  a.description,
  a.created_at,
  COALESCE(p.full_name, LEFT(a.user_id::text, 8)) AS user_display_name
FROM audit_log a
LEFT JOIN profiles p ON p.user_id = a.user_id;

-- Fix: fn_nc_auto_fields missing search_path
CREATE OR REPLACE FUNCTION public.fn_nc_auto_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_seq  integer;
  v_proj_code text;
BEGIN
  SELECT COALESCE(MAX(nc_sequence), 0) + 1
    INTO v_seq
    FROM public.non_conformities
   WHERE project_id = NEW.project_id;

  NEW.nc_sequence := v_seq;

  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(p.code, 'PROJ') INTO v_proj_code
      FROM public.projects p WHERE p.id = NEW.project_id;
    NEW.code := 'RNC-' || v_proj_code || '-' || LPAD(v_seq::text, 3, '0');
  END IF;

  IF NEW.classification = 'maior' THEN
    NEW.fip_validation_required := true;
    NEW.validation_deadline := NOW() + INTERVAL '4 hours';
  ELSIF NEW.classification = 'menor' THEN
    NEW.fip_validation_required := false;
    NEW.validation_deadline := NOW() + INTERVAL '1 day';
  END IF;

  IF NEW.classification = 'maior'      THEN NEW.severity := 'high';
  ELSIF NEW.classification = 'menor'   THEN NEW.severity := 'medium';
  ELSIF NEW.classification = 'observacao' THEN NEW.severity := 'low';
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix: fn_generate_rfi_code missing search_path
CREATE OR REPLACE FUNCTION public.fn_generate_rfi_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  seq int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO seq
  FROM public.rfis
  WHERE project_id = NEW.project_id;
  
  NEW.code := 'RFI-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$function$;

-- Fix: fn_supplier_eval_template missing search_path  
CREATE OR REPLACE FUNCTION public.fn_supplier_eval_template()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'qualidade_trabalho', jsonb_build_object('label', 'Qualidade do trabalho/produto', 'weight', 35, 'score', null, 'notes', ''),
    'cumprimento_prazos', jsonb_build_object('label', 'Cumprimento de prazos', 'weight', 25, 'score', null, 'notes', ''),
    'gestao_ncs', jsonb_build_object('label', 'Gestão de Não Conformidades', 'weight', 25, 'score', null, 'notes', ''),
    'cooperacao_sgq', jsonb_build_object('label', 'Cooperação com o SGQ', 'weight', 15, 'score', null, 'notes', '')
  );
$function$;

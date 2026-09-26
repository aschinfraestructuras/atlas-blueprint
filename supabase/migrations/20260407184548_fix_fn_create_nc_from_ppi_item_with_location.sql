-- Melhorar fn_create_nc_from_ppi_item para passar localização completa
-- A função existente não passava pk, disciplina, zone nem element_ref
-- Esta versão enriquece a NC com todos os dados disponíveis da instância PPI

CREATE OR REPLACE FUNCTION public.fn_create_nc_from_ppi_item(
  p_ppi_instance_item_id uuid,
  p_severity text DEFAULT 'major',
  p_responsible text DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS public.non_conformities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item     public.ppi_instance_items%ROWTYPE;
  v_inst     public.ppi_instances%ROWTYPE;
  v_tpl      public.ppi_templates%ROWTYPE;
  v_nc       public.non_conformities;
  v_loc_pk   text;
  v_desc     text;
BEGIN
  -- Obter item
  SELECT * INTO v_item FROM public.ppi_instance_items WHERE id = p_ppi_instance_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PPI item not found'; END IF;

  -- Obter instância
  SELECT * INTO v_inst FROM public.ppi_instances WHERE id = v_item.instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PPI instance not found'; END IF;

  -- Verificar acesso
  IF NOT public.is_project_member((SELECT auth.uid()), v_inst.project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Obter template para disciplina
  SELECT * INTO v_tpl FROM public.ppi_templates WHERE id = v_inst.template_id;

  -- Formatar PK (ex: 30500 → "30+500")
  IF v_inst.pk_inicio IS NOT NULL THEN
    v_loc_pk := LPAD((v_inst.pk_inicio / 1000)::text, 1, '0')
                || '+' ||
                LPAD((v_inst.pk_inicio % 1000)::text, 3, '0');
    IF v_inst.pk_fim IS NOT NULL AND v_inst.pk_fim != v_inst.pk_inicio THEN
      v_loc_pk := v_loc_pk || ' → ' ||
                  LPAD((v_inst.pk_fim / 1000)::text, 1, '0')
                  || '+' ||
                  LPAD((v_inst.pk_fim % 1000)::text, 3, '0');
    END IF;
  END IF;

  -- Enriquecer descrição com contexto de localização
  v_desc := v_item.label;
  IF v_inst.element_ref IS NOT NULL THEN
    v_desc := v_desc || chr(10) || 'Elemento: ' || v_inst.element_ref;
  END IF;
  IF v_inst.zone IS NOT NULL THEN
    v_desc := v_desc || chr(10) || 'Zona: ' || v_inst.zone;
  END IF;
  IF v_inst.code IS NOT NULL THEN
    v_desc := v_desc || chr(10) || 'PPI: ' || v_inst.code;
  END IF;

  -- Criar NC via fn_create_nc (versão completa com todos os campos)
  SELECT * INTO v_nc FROM public.fn_create_nc(
    p_project_id           := v_inst.project_id,
    p_title                := 'NC — ' || v_item.check_code || ': ' || left(v_item.label, 100),
    p_description          := v_desc,
    p_severity             := p_severity,
    p_category             := 'qualidade',
    p_origin               := 'ppi',
    p_responsible          := p_responsible,
    p_due_date             := p_due_date,
    p_work_item_id         := v_inst.work_item_id,
    p_ppi_instance_id      := v_inst.id,
    p_ppi_instance_item_id := p_ppi_instance_item_id,
    p_location_pk          := v_loc_pk,
    p_discipline           := COALESCE(v_tpl.disciplina, NULL)
  );

  -- Ligar NC ao item PPI
  UPDATE public.ppi_instance_items
  SET nc_id = v_nc.id, requires_nc = true
  WHERE id = p_ppi_instance_item_id;

  RETURN v_nc;
END;
$function$;

-- Confirmar que a função foi actualizada
SELECT proname, pronargs FROM pg_proc 
WHERE proname = 'fn_create_nc_from_ppi_item';

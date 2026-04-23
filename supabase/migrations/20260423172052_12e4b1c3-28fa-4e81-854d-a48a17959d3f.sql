-- 1) Limpar TODAS as notificações de lixo histórico (planning_due titles in EN, etc.)
DELETE FROM public.notifications
WHERE title LIKE 'planning\_due:%' ESCAPE '\'
   OR title LIKE 'supplier\_doc:%' ESCAPE '\'
   OR title LIKE 'material\_doc:%' ESCAPE '\'
   OR title LIKE 'calibration:%'
   OR title LIKE 'nc\_due:%' ESCAPE '\'
   OR title LIKE 'rfi\_due:%' ESCAPE '\'
   OR title LIKE 'tech\_office\_due:%' ESCAPE '\'
   OR title LIKE 'ppi\_pending:%' ESCAPE '\'
   OR title LIKE 'ppi\_approval:%' ESCAPE '\'
   OR title LIKE 'quarantine\_lot:%' ESCAPE '\'
   OR title LIKE 'subcontractor\_doc:%' ESCAPE '\';

-- 2) Limpar notificações órfãs (entidade já apagada/inexistente em vw_deadlines)
DELETE FROM public.notifications n
WHERE n.type IN ('expiration_warning','expiration_overdue')
  AND n.link_entity_id IS NOT NULL
  AND n.link_entity_type IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.vw_deadlines d
    WHERE d.id = n.link_entity_id
      AND d.source = n.link_entity_type
      AND d.project_id = n.project_id
  );

-- 3) Corrigir a função de geração para usar nomes humanos legíveis (PT-PT)
--    e validar contra vw_deadlines (que já filtra is_deleted nas tabelas-base)
CREATE OR REPLACE FUNCTION public.fn_generate_deadline_notifications(
  p_project_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  v_user_id uuid;
  v_rec record;
  v_source_label text;
  v_title text;
BEGIN
  FOR v_user_id IN
    SELECT pm.user_id FROM project_members pm
    WHERE pm.project_id = p_project_id AND pm.is_active = true
  LOOP
    FOR v_rec IN
      SELECT * FROM vw_deadlines d
      WHERE d.project_id = p_project_id
        AND d.severity IN ('critical', 'warning')
        AND d.days_remaining <= p_days_ahead
    LOOP
      -- Map technical source codes to human-readable PT-PT labels
      v_source_label := CASE v_rec.source
        WHEN 'supplier_doc'      THEN 'Documento de fornecedor'
        WHEN 'material_doc'      THEN 'Documento de material'
        WHEN 'calibration'       THEN 'Calibração de equipamento'
        WHEN 'nc_due'            THEN 'Não conformidade'
        WHEN 'rfi_due'           THEN 'RFI'
        WHEN 'tech_office_due'   THEN 'Item de escritório técnico'
        WHEN 'planning_due'      THEN 'Atividade de planeamento'
        WHEN 'ppi_pending'       THEN 'PPI pendente'
        WHEN 'ppi_approval'      THEN 'PPI por aprovar'
        WHEN 'quarantine_lot'    THEN 'Lote em quarentena'
        WHEN 'subcontractor_doc' THEN 'Documento de subempreiteiro'
        ELSE v_rec.source
      END;

      v_title := v_source_label || ': ' || COALESCE(v_rec.doc_name, v_rec.id::text);

      INSERT INTO notifications (project_id, user_id, type, title, body, link_entity_type, link_entity_id)
      SELECT
        p_project_id,
        v_user_id,
        CASE WHEN v_rec.severity = 'critical' THEN 'expiration_overdue' ELSE 'expiration_warning' END,
        v_title,
        CASE
          WHEN v_rec.days_remaining < 0 THEN 'Em atraso há ' || abs(v_rec.days_remaining) || ' dias'
          WHEN v_rec.days_remaining = 0 THEN 'Vence hoje'
          ELSE 'Vence em ' || v_rec.days_remaining || ' dias'
        END,
        v_rec.source,
        v_rec.id
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.project_id = p_project_id
          AND n.user_id = v_user_id
          AND n.link_entity_type = v_rec.source
          AND n.link_entity_id = v_rec.id
          AND n.created_at > now() - interval '7 days'
      );
      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$function$;
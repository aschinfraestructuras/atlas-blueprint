-- Função para gerar código automático de actividade: {wbs_code}-{NNN}
CREATE OR REPLACE FUNCTION public.fn_generate_activity_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_wbs_code text;
  v_seq      integer;
BEGIN
  -- Só gera se não foi fornecido código manualmente
  IF NEW.code IS NOT NULL AND trim(NEW.code) != '' THEN
    RETURN NEW;
  END IF;

  -- Buscar o wbs_code do nó WBS associado
  SELECT wbs_code INTO v_wbs_code
  FROM public.planning_wbs
  WHERE id = NEW.wbs_id;

  IF v_wbs_code IS NULL THEN
    v_wbs_code := 'GEN';
  END IF;

  -- Calcular próximo número sequencial para este WBS + projecto
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ ('^' || regexp_replace(v_wbs_code, '\.', '\.', 'g') || '-\d+$')
      THEN (regexp_replace(code, '^.*-(\d+)$', '\1'))::integer
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM public.planning_activities
  WHERE project_id = NEW.project_id
    AND wbs_id = NEW.wbs_id;

  NEW.code := v_wbs_code || '-' || LPAD(v_seq::text, 3, '0');

  RETURN NEW;
END;
$function$;

-- Trigger para gerar código ao inserir actividade
DROP TRIGGER IF EXISTS trg_activity_code ON public.planning_activities;
CREATE TRIGGER trg_activity_code
  BEFORE INSERT ON public.planning_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_activity_code();

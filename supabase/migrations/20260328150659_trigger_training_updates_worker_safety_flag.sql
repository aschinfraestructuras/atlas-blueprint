-- ============================================================
-- TRIGGER: quando trabalhador assina formação (signed=true)
-- actualiza automaticamente has_safety_training=true
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_training_signed_update_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só actua quando worker_id existe e signed passa a true
  IF NEW.worker_id IS NOT NULL AND NEW.signed = true 
     AND (OLD.signed = false OR OLD IS NULL) THEN
    UPDATE public.project_workers
    SET has_safety_training = true,
        updated_at = now()
    WHERE id = NEW.worker_id
      AND has_safety_training = false;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_training_attendee_signed ON public.training_attendees;
CREATE TRIGGER trg_training_attendee_signed
  AFTER INSERT OR UPDATE OF signed ON public.training_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_training_signed_update_worker();

-- ============================================================
-- Actualizar has_safety_training com base nas presenças reais
-- Todos os workers que têm formandos com signed=true
-- ============================================================
UPDATE public.project_workers pw
SET has_safety_training = true, updated_at = now()
WHERE pw.id IN (
  SELECT DISTINCT ta.worker_id
  FROM public.training_attendees ta
  WHERE ta.worker_id IS NOT NULL
    AND ta.signed = true
)
AND pw.has_safety_training = false;

-- ============================================================
-- VIEW: trabalhadores sem formação de segurança
-- Cruza project_workers com training_attendees via worker_id
-- ============================================================
CREATE OR REPLACE VIEW public.vw_workers_training_status
WITH (security_invoker = true)
AS
SELECT
  pw.project_id,
  pw.id AS worker_id,
  pw.name,
  pw.role_function,
  pw.company,
  pw.subcontractor_id,
  sub.name AS subcontractor_name,
  pw.status AS worker_status,
  pw.has_safety_training,

  -- Total de sessões que frequentou
  COUNT(DISTINCT ta.session_id) AS sessions_attended,

  -- Total de sessões em que assinou
  COUNT(DISTINCT ta.session_id) FILTER (WHERE ta.signed = true) AS sessions_signed,

  -- Última sessão frequentada
  MAX(ts.session_date) AS last_training_date,

  -- Tipos de formação frequentados
  STRING_AGG(DISTINCT ts.session_type, ', ') AS training_types,

  -- Estado real de formação
  CASE
    WHEN COUNT(DISTINCT ta.session_id) FILTER (WHERE ta.signed = true) > 0 THEN 'trained'
    WHEN COUNT(DISTINCT ta.session_id) > 0 THEN 'attended_not_signed'
    ELSE 'no_training'
  END AS training_status

FROM public.project_workers pw
LEFT JOIN public.subcontractors sub ON sub.id = pw.subcontractor_id AND sub.is_deleted = false
LEFT JOIN public.training_attendees ta ON ta.worker_id = pw.id
LEFT JOIN public.training_sessions ts ON ts.id = ta.session_id AND ts.project_id = pw.project_id
WHERE pw.status = 'active'
GROUP BY pw.project_id, pw.id, pw.name, pw.role_function, pw.company,
         pw.subcontractor_id, sub.name, pw.status, pw.has_safety_training
ORDER BY training_status DESC, pw.name;

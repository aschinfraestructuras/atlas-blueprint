-- ============================================================
-- [1] Adicionar worker_id à training_attendees (nullable)
-- Mantém compatibilidade — formandos externos continuam sem worker_id
-- ============================================================
ALTER TABLE public.training_attendees
  ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES public.project_workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_attendees_worker_id
  ON public.training_attendees(worker_id) WHERE worker_id IS NOT NULL;

-- ============================================================
-- [2] Ligar automaticamente os formandos já inseridos
-- aos trabalhadores existentes pelo nome exacto
-- ============================================================
UPDATE public.training_attendees ta
SET worker_id = pw.id
FROM public.project_workers pw
WHERE LOWER(TRIM(ta.name)) = LOWER(TRIM(pw.name))
  AND pw.project_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND ta.worker_id IS NULL;

-- ============================================================
-- [3] VIEW: trabalhadores sem formação (gap de formação)
-- Mostra quem está activo mas sem qualquer sessão de formação
-- ============================================================
CREATE OR REPLACE VIEW public.vw_worker_training_gap
WITH (security_invoker = true)
AS
SELECT
  pw.project_id,
  pw.id AS worker_id,
  pw.name,
  pw.company,
  pw.role_function,
  pw.subcontractor_id,
  sub.name AS subcontractor_name,
  pw.status,
  pw.has_safety_training,

  -- Sessões de formação frequentadas
  COUNT(DISTINCT ta.session_id) AS sessions_attended,

  -- Última formação
  MAX(ts.session_date) AS last_training_date,

  -- Tipos de formação frequentados
  STRING_AGG(DISTINCT ts.session_type, ', ' ORDER BY ts.session_type) AS training_types,

  -- Assinou em todas as sessões que frequentou?
  BOOL_AND(ta.signed) AS all_signed,

  -- Há quanto tempo foi a última formação (dias)
  CASE WHEN MAX(ts.session_date) IS NOT NULL
    THEN CURRENT_DATE - MAX(ts.session_date)
    ELSE NULL
  END AS days_since_last_training,

  -- Status de lacuna
  CASE
    WHEN COUNT(DISTINCT ta.session_id) = 0 THEN 'sem_formacao'
    WHEN CURRENT_DATE - MAX(ts.session_date) > 365 THEN 'formacao_expirada'
    WHEN NOT pw.has_safety_training THEN 'seg_em_falta'
    ELSE 'ok'
  END AS training_status

FROM public.project_workers pw
LEFT JOIN public.subcontractors sub ON sub.id = pw.subcontractor_id AND sub.is_deleted = false
LEFT JOIN public.training_attendees ta ON ta.worker_id = pw.id
LEFT JOIN public.training_sessions ts ON ts.id = ta.session_id
  AND ts.project_id = pw.project_id
WHERE pw.project_id IS NOT NULL
GROUP BY pw.project_id, pw.id, pw.name, pw.company, pw.role_function,
  pw.subcontractor_id, sub.name, pw.status, pw.has_safety_training
ORDER BY
  CASE WHEN COUNT(DISTINCT ta.session_id) = 0 THEN 0 ELSE 1 END,
  pw.company, pw.name;

-- Adicionar campo hierárquico a project_workers
ALTER TABLE public.project_workers
  ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.project_workers(id),
  ADD COLUMN IF NOT EXISTS org_function text,      -- função no organigrama (Director Obra, TQ, Encarregado, etc.)
  ADD COLUMN IF NOT EXISTS org_order   int DEFAULT 0; -- ordem de apresentação dentro do mesmo nível

COMMENT ON COLUMN public.project_workers.reports_to    IS 'Superior hierárquico directo (FK para outro project_worker)';
COMMENT ON COLUMN public.project_workers.org_function  IS 'Função no organigrama de obra (ex: Director de Obra, TQ, Encarregado Geral)';
COMMENT ON COLUMN public.project_workers.org_order     IS 'Ordem de apresentação no organigrama (menor = mais à esquerda)';

CREATE INDEX IF NOT EXISTS idx_workers_reports_to
  ON public.project_workers (reports_to)
  WHERE reports_to IS NOT NULL;

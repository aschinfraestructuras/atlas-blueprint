-- ─── Tabela de avaliações periódicas de fornecedores/subcontratados ───────────
CREATE TABLE IF NOT EXISTS public.supplier_evaluations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id           uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  period_label          text NOT NULL,          -- ex: "Q2 2026"
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  -- 4 critérios 0-25 cada
  score_delivery        numeric(5,1) CHECK (score_delivery BETWEEN 0 AND 25),
  score_certificates    numeric(5,1) CHECK (score_certificates BETWEEN 0 AND 25),
  score_nc_response     numeric(5,1) CHECK (score_nc_response BETWEEN 0 AND 25),
  score_conformity      numeric(5,1) CHECK (score_conformity BETWEEN 0 AND 25),
  -- total calculado automaticamente
  total_score           numeric(5,1) GENERATED ALWAYS AS (
    COALESCE(score_delivery,0) + COALESCE(score_certificates,0) +
    COALESCE(score_nc_response,0) + COALESCE(score_conformity,0)
  ) STORED,
  -- resultado automático baseado no total
  result                text GENERATED ALWAYS AS (
    CASE
      WHEN (COALESCE(score_delivery,0)+COALESCE(score_certificates,0)+
            COALESCE(score_nc_response,0)+COALESCE(score_conformity,0)) >= 75 THEN 'approved'
      WHEN (COALESCE(score_delivery,0)+COALESCE(score_certificates,0)+
            COALESCE(score_nc_response,0)+COALESCE(score_conformity,0)) >= 50 THEN 'conditional'
      ELSE 'suspended'
    END
  ) STORED,
  -- dados de suporte (calculados do Atlas e guardados como referência)
  lots_total            integer DEFAULT 0,
  lots_approved         integer DEFAULT 0,
  ncs_total             integer DEFAULT 0,
  ncs_closed_on_time    integer DEFAULT 0,
  deliveries_total      integer DEFAULT 0,
  deliveries_on_time    integer DEFAULT 0,
  -- contexto
  notes                 text,
  evaluated_by          uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id),
  UNIQUE (supplier_id, period_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sup_eval_supplier ON public.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sup_eval_project  ON public.supplier_evaluations(project_id);

-- RLS
ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sup_eval_select ON public.supplier_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = supplier_evaluations.project_id
        AND pm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY sup_eval_insert ON public.supplier_evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = supplier_evaluations.project_id
        AND pm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY sup_eval_update ON public.supplier_evaluations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = supplier_evaluations.project_id
        AND pm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY sup_eval_delete ON public.supplier_evaluations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = supplier_evaluations.project_id
        AND pm.user_id = (SELECT auth.uid())
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_sup_eval_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_sup_eval_updated_at
  BEFORE UPDATE ON public.supplier_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_eval_updated_at();

-- Revogar de PUBLIC, manter authenticated
REVOKE EXECUTE ON FUNCTION public.fn_sup_eval_updated_at() FROM PUBLIC;

-- Adicionar as colunas que faltam à tabela existente
ALTER TABLE public.supplier_evaluations
  ADD COLUMN IF NOT EXISTS period_label         text,
  ADD COLUMN IF NOT EXISTS period_start         date,
  ADD COLUMN IF NOT EXISTS period_end           date,
  ADD COLUMN IF NOT EXISTS score_delivery       numeric(5,1),
  ADD COLUMN IF NOT EXISTS score_certificates   numeric(5,1),
  ADD COLUMN IF NOT EXISTS score_nc_response    numeric(5,1),
  ADD COLUMN IF NOT EXISTS score_conformity     numeric(5,1),
  ADD COLUMN IF NOT EXISTS total_score          numeric(5,1),
  ADD COLUMN IF NOT EXISTS lots_total           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lots_approved        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ncs_total            integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ncs_closed_on_time   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_total     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_on_time   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluated_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();

-- Verificar se total_score pode ser um campo calculado — não, já existe como coluna simples
-- Criar trigger para calcular total_score e result automaticamente
CREATE OR REPLACE FUNCTION public.fn_sup_eval_calc()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  NEW.total_score := COALESCE(NEW.score_delivery,0) + COALESCE(NEW.score_certificates,0) +
                     COALESCE(NEW.score_nc_response,0) + COALESCE(NEW.score_conformity,0);
  NEW.result := CASE
    WHEN NEW.total_score >= 75 THEN 'approved'
    WHEN NEW.total_score >= 50 THEN 'conditional'
    ELSE 'suspended'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sup_eval_calc ON public.supplier_evaluations;
CREATE TRIGGER trg_sup_eval_calc
  BEFORE INSERT OR UPDATE ON public.supplier_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_eval_calc();

-- Revogar trigger function de PUBLIC
REVOKE EXECUTE ON FUNCTION public.fn_sup_eval_calc() FROM PUBLIC;

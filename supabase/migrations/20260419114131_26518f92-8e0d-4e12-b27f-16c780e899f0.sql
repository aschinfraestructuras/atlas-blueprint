-- ─────────────────────────────────────────────────────────────────
-- Top-1: Ligar Work Items ao WBS (Opção B — Cirúrgica)
-- ─────────────────────────────────────────────────────────────────

-- 1. Adicionar coluna wbs_id (nullable, para não quebrar Frentes existentes)
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS wbs_id uuid REFERENCES public.planning_wbs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_wbs_id ON public.work_items(wbs_id);

COMMENT ON COLUMN public.work_items.wbs_id IS
  'Liga a Frente de Trabalho a um nó WBS (estrutura analítica). Opcional — Frentes legacy podem ficar sem WBS.';

-- ─────────────────────────────────────────────────────────────────
-- Top-2: Ligação dura entre Não-Conformidades e a sua origem
-- (preparação para o modal "criar NC após ensaio fail")
-- ─────────────────────────────────────────────────────────────────

-- 2. Adicionar FK de origem (test_result OU ppi_item)
ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS source_test_result_id uuid REFERENCES public.test_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_ppi_item_id uuid REFERENCES public.ppi_instance_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nc_source_test_result ON public.non_conformities(source_test_result_id) WHERE source_test_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nc_source_ppi_item    ON public.non_conformities(source_ppi_item_id)    WHERE source_ppi_item_id IS NOT NULL;

COMMENT ON COLUMN public.non_conformities.source_test_result_id IS
  'FK para o resultado de ensaio que originou esta NC (preenchido quando criada via fluxo "fail → criar NC").';
COMMENT ON COLUMN public.non_conformities.source_ppi_item_id IS
  'FK para o item PPI que originou esta NC (preenchido quando criada via fluxo PPI rejeitado).';
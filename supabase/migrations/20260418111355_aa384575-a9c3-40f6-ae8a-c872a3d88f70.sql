-- ─── Tabela principal MQT ──────────────────────────────────────────────────
CREATE TABLE public.mqt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  code_rubrica TEXT NOT NULL,
  parent_code TEXT,
  nivel INT NOT NULL DEFAULT 1,
  familia TEXT,
  is_leaf BOOLEAN NOT NULL DEFAULT false,

  designacao TEXT NOT NULL,
  unidade TEXT,
  quantidade NUMERIC(18,4),
  prazo_garantia TEXT,

  preco_unitario NUMERIC(18,4),
  preco_total NUMERIC(18,2),

  pk_inicio_mqt TEXT,
  pk_fim_mqt TEXT,

  mqt_version TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mqt_items_unique_code_per_project UNIQUE (project_id, code_rubrica, mqt_version)
);

CREATE INDEX idx_mqt_items_project ON public.mqt_items(project_id);
CREATE INDEX idx_mqt_items_familia ON public.mqt_items(project_id, familia);
CREATE INDEX idx_mqt_items_parent ON public.mqt_items(project_id, parent_code);
CREATE INDEX idx_mqt_items_leaf ON public.mqt_items(project_id, is_leaf) WHERE is_leaf = true;
CREATE INDEX idx_mqt_items_pk ON public.mqt_items(project_id, pk_inicio_mqt, pk_fim_mqt) WHERE pk_inicio_mqt IS NOT NULL;
CREATE INDEX idx_mqt_items_designacao_gin ON public.mqt_items USING GIN (to_tsvector('portuguese', designacao));

CREATE TRIGGER update_mqt_items_updated_at
  BEFORE UPDATE ON public.mqt_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.mqt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mqt_items_select_project_members"
ON public.mqt_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = mqt_items.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
  )
);

CREATE POLICY "mqt_items_insert_admin_only"
ON public.mqt_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = mqt_items.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  )
);

CREATE POLICY "mqt_items_update_admin_only"
ON public.mqt_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = mqt_items.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  )
);

CREATE POLICY "mqt_items_delete_admin_only"
ON public.mqt_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = mqt_items.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  )
);

-- ─── Helper: verifica se utilizador é admin do projeto ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_is_project_admin(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = (select auth.uid())
      AND pm.is_active = true
      AND pm.role = 'admin'
  );
$$;

-- ─── Vista pública: itens MQT SEM preços para não-admin ────────────────────
CREATE OR REPLACE VIEW public.vw_mqt_items_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  project_id,
  code_rubrica,
  parent_code,
  nivel,
  familia,
  is_leaf,
  designacao,
  unidade,
  quantidade,
  prazo_garantia,
  CASE WHEN public.fn_is_project_admin(project_id) THEN preco_unitario ELSE NULL END AS preco_unitario,
  CASE WHEN public.fn_is_project_admin(project_id) THEN preco_total ELSE NULL END AS preco_total,
  pk_inicio_mqt,
  pk_fim_mqt,
  mqt_version,
  imported_at,
  imported_by,
  created_at,
  updated_at
FROM public.mqt_items;

-- ─── Vista de KPIs por família ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_mqt_summary
WITH (security_invoker = true)
AS
SELECT
  project_id,
  familia,
  COUNT(*) FILTER (WHERE is_leaf = true) AS total_itens_folha,
  COUNT(*) FILTER (WHERE is_leaf = true AND pk_inicio_mqt IS NOT NULL) AS itens_com_pk,
  SUM(quantidade) FILTER (WHERE is_leaf = true AND unidade ILIKE 'm³') AS volume_m3,
  SUM(quantidade) FILTER (WHERE is_leaf = true AND unidade ILIKE 'm²') AS area_m2,
  SUM(quantidade) FILTER (WHERE is_leaf = true AND unidade = 'm') AS comprimento_m,
  SUM(quantidade) FILTER (WHERE is_leaf = true AND unidade ILIKE 'un') AS unidades,
  SUM(quantidade) FILTER (WHERE is_leaf = true AND unidade ILIKE 'kg') AS peso_kg,
  CASE WHEN public.fn_is_project_admin(project_id)
       THEN SUM(preco_total) FILTER (WHERE is_leaf = true)
       ELSE NULL END AS valor_total_eur
FROM public.mqt_items
GROUP BY project_id, familia;

COMMENT ON TABLE public.mqt_items IS 'Mapa de Quantidades e Trabalhos (MQT) — itens contratuais importados de XML. Apenas admins podem importar/editar.';
COMMENT ON COLUMN public.mqt_items.preco_unitario IS 'RESTRITO: visível apenas para admins via vw_mqt_items_safe.';
COMMENT ON VIEW public.vw_mqt_items_safe IS 'Vista pública dos itens MQT — preços ocultos para não-admins.';
COMMENT ON VIEW public.vw_mqt_summary IS 'Agregação de totais por família (volume, área, comprimento) para KPIs do MQT.';
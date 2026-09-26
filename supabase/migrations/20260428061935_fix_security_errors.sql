-- ════════════════════════════════════════════════════════════
-- ERRO 1 + 2: Security Definer Views
-- vw_deadlines e vw_project_health usam permissões do criador
-- em vez do utilizador que faz a query → inverter para invoker
-- ════════════════════════════════════════════════════════════
ALTER VIEW public.vw_deadlines      SET (security_invoker = true);
ALTER VIEW public.vw_project_health SET (security_invoker = true);

-- ════════════════════════════════════════════════════════════
-- ERRO 3: RLS desactivado em track_geometry_tolerances
-- Esta tabela é pública (tolerâncias EN 13231-1) mas deve ter
-- RLS activado com política de leitura para todos
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.track_geometry_tolerances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tgt_read_all ON public.track_geometry_tolerances;
CREATE POLICY tgt_read_all ON public.track_geometry_tolerances
  FOR SELECT USING (true);

-- ════════════════════════════════════════════════════════════
-- WARNINGS: Function Search Path Mutable
-- fn_tc_updated_at e fn_risk_updated_at sem search_path fixo
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_tc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.fn_risk_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Google Drive Nível 1
-- Adicionar drive_url às tabelas relevantes
-- Campo opcional — não quebra nada existente

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS drive_url text,
  ADD COLUMN IF NOT EXISTS drive_file_name text;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.laboratories
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.material_lots
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.supplier_documents
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.subcontractor_documents
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.monthly_quality_reports
  ADD COLUMN IF NOT EXISTS drive_url text;

ALTER TABLE public.quality_audits
  ADD COLUMN IF NOT EXISTS drive_url text;

-- Tabela de integrações por projecto
-- Para guardar o webhook do Teams e outras configs futuras
CREATE TABLE IF NOT EXISTS public.project_integrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, type)
);

ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_integrations_select"
  ON public.project_integrations FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "project_integrations_admin"
  ON public.project_integrations FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
  ));

-- Índice
CREATE INDEX IF NOT EXISTS idx_project_integrations_project
  ON public.project_integrations (project_id);

-- Adicionar campo de assinatura aos trabalhadores
ALTER TABLE public.project_workers
  ADD COLUMN IF NOT EXISTS signature_storage_path text,
  ADD COLUMN IF NOT EXISTS signature_updated_at   timestamptz;

-- Tabela de configuração de assinaturas por documento
-- Define quais cargos assinam cada tipo de documento
CREATE TABLE IF NOT EXISTS public.document_signature_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  doc_type     text NOT NULL, -- 'rmsgq', 'nc', 'hp_notification', 'weld', 'ppi', 'field_record', 'compaction', 'soil', 'concrete'
  slot_label   text NOT NULL, -- 'Técnico de Qualidade', 'Director de Obra', 'Encarregado', 'Fiscalização'
  slot_order   integer NOT NULL DEFAULT 1,
  worker_id    uuid REFERENCES public.project_workers(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (project_id, doc_type, slot_order)
);

ALTER TABLE public.document_signature_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY dsc_select ON public.document_signature_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = document_signature_config.project_id AND pm.user_id = (SELECT auth.uid())));
CREATE POLICY dsc_all ON public.document_signature_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = document_signature_config.project_id AND pm.user_id = (SELECT auth.uid())));

-- Inserir configuração padrão para o projecto PF17A
-- (pode ser editada pelo utilizador nas Definições)
INSERT INTO public.document_signature_config (project_id, doc_type, slot_label, slot_order)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'rmsgq',        'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'rmsgq',        'Director de Obra',       2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'nc',           'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'nc',           'Director de Obra',       2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'hp_notification','Técnico de Qualidade', 1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'weld',         'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'weld',         'Encarregado de Via',     2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'ppi',          'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'ppi',          'Director de Obra',       2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'field_record', 'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'compaction',   'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'soil',         'Técnico de Qualidade',  1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'concrete',     'Técnico de Qualidade',  1)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

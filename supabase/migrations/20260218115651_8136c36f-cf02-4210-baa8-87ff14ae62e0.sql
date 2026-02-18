
-- ─────────────────────────────────────────────────────────────────
-- Tabela: attachments
-- Anexos/evidências reutilizáveis para qualquer entidade do projeto
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,   -- 'test' | 'non_conformity' | extensível
  entity_id    uuid NOT NULL,
  file_path    text NOT NULL,   -- caminho canónico no bucket atlas_files
  file_name    text NOT NULL,   -- nome original do ficheiro
  file_size    bigint,
  mime_type    text,
  created_by   uuid,            -- auth.uid() no momento do upload
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para lookups frequentes
CREATE INDEX idx_attachments_entity   ON public.attachments (entity_type, entity_id);
CREATE INDEX idx_attachments_project  ON public.attachments (project_id);

-- ─── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: membros do projeto
CREATE POLICY "attachments_select"
ON public.attachments FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

-- INSERT: membros do projeto (uploaded_by deve ser o próprio utilizador)
CREATE POLICY "attachments_insert"
ON public.attachments FOR INSERT
WITH CHECK (
  public.is_project_member(auth.uid(), project_id)
  AND (created_by = auth.uid() OR created_by IS NULL)
);

-- UPDATE: membros do projeto (não se prevê edição mas mantém policy defensiva)
CREATE POLICY "attachments_update"
ON public.attachments FOR UPDATE
USING (public.is_project_member(auth.uid(), project_id));

-- DELETE: admin do projeto OU owner do próprio anexo
CREATE POLICY "attachments_delete"
ON public.attachments FOR DELETE
USING (
  public.is_project_admin(auth.uid(), project_id)
  OR created_by = auth.uid()
);

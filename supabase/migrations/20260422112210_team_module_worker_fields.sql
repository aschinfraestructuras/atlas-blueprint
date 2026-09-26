ALTER TABLE public.project_workers
  ADD COLUMN IF NOT EXISTS birth_date       date   NULL,
  ADD COLUMN IF NOT EXISTS id_number        text   NULL,
  ADD COLUMN IF NOT EXISTS contact_phone    text   NULL,
  ADD COLUMN IF NOT EXISTS contact_email    text   NULL,
  ADD COLUMN IF NOT EXISTS entry_date       date   NULL,
  ADD COLUMN IF NOT EXISTS exit_date        date   NULL,
  ADD COLUMN IF NOT EXISTS discipline       text   NULL,
  ADD COLUMN IF NOT EXISTS ip_qual_status   text   NULL;

COMMENT ON COLUMN public.project_workers.birth_date    IS 'Data de nascimento (IP GR.PR.005)';
COMMENT ON COLUMN public.project_workers.id_number     IS 'N.º CC/BI/NIF';
COMMENT ON COLUMN public.project_workers.contact_phone IS 'Contacto telefónico em obra';
COMMENT ON COLUMN public.project_workers.contact_email IS 'Email do trabalhador';
COMMENT ON COLUMN public.project_workers.entry_date    IS 'Data de entrada na obra';
COMMENT ON COLUMN public.project_workers.exit_date     IS 'Data de saída da obra';
COMMENT ON COLUMN public.project_workers.discipline    IS 'Disciplina (via, catenária, sinalização, etc.)';
COMMENT ON COLUMN public.project_workers.ip_qual_status IS 'Estado qualificação IP GR.PR.005';

CREATE INDEX IF NOT EXISTS idx_project_workers_project_status
  ON public.project_workers (project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_workers_subcontractor_id
  ON public.project_workers (subcontractor_id)
  WHERE subcontractor_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_workers' AND schemaname = 'public'
    AND policyname = 'project_workers_project_member'
  ) THEN
    ALTER TABLE public.project_workers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY project_workers_project_member ON public.project_workers
      USING (project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = (SELECT auth.uid())
      ));
  END IF;
END $$;

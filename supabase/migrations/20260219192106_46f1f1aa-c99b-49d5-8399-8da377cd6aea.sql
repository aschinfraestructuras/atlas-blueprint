
-- ============================================================
-- PPI (Plano de Pontos de Inspeção) — Full Schema Migration
-- Consistent with: projects, work_items, documents RLS pattern
-- ============================================================

-- ─── 1. ppi_templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppi_templates (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code          text        NOT NULL,
  disciplina    text        NOT NULL CHECK (disciplina = ANY(ARRAY[
                              'geral','terras','firmes','betao',
                              'estruturas','drenagem','ferrovia',
                              'instalacoes','outros'
                            ])),
  title         text        NOT NULL,
  description   text        NULL,
  version       integer     NOT NULL DEFAULT 1,
  is_active     boolean     NOT NULL DEFAULT true,
  created_by    uuid        NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppi_templates_project_code_unique UNIQUE (project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ppi_templates_project_id ON public.ppi_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_ppi_templates_disciplina  ON public.ppi_templates(disciplina);
CREATE INDEX IF NOT EXISTS idx_ppi_templates_is_active   ON public.ppi_templates(is_active);

-- ─── 2. ppi_template_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppi_template_items (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id         uuid    NOT NULL REFERENCES public.ppi_templates(id) ON DELETE CASCADE,
  item_no             integer NOT NULL CHECK (item_no >= 1),
  check_code          text    NOT NULL,
  label               text    NOT NULL,
  method              text    NULL,
  acceptance_criteria text    NULL,
  required            boolean NOT NULL DEFAULT true,
  evidence_required   boolean NOT NULL DEFAULT false,
  sort_order          integer NOT NULL DEFAULT 0,
  CONSTRAINT ppi_template_items_template_item_unique UNIQUE (template_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_ppi_template_items_template_id ON public.ppi_template_items(template_id);

-- ─── 3. ppi_instances ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppi_instances (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  work_item_id uuid        NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  template_id  uuid        NULL     REFERENCES public.ppi_templates(id) ON DELETE SET NULL,
  code         text        NOT NULL,
  status       text        NOT NULL DEFAULT 'draft' CHECK (status = ANY(ARRAY[
                             'draft','in_progress','submitted',
                             'approved','rejected','archived'
                           ])),
  opened_at    timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz NULL,
  inspector_id uuid        NULL,
  created_by   uuid        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppi_instances_project_code_unique UNIQUE (project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ppi_instances_project_id   ON public.ppi_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_ppi_instances_work_item_id ON public.ppi_instances(work_item_id);
CREATE INDEX IF NOT EXISTS idx_ppi_instances_status       ON public.ppi_instances(status);
CREATE INDEX IF NOT EXISTS idx_ppi_instances_template_id  ON public.ppi_instances(template_id);

-- ─── 4. ppi_instance_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppi_instance_items (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id      uuid        NOT NULL REFERENCES public.ppi_instances(id) ON DELETE CASCADE,
  item_no          integer     NOT NULL CHECK (item_no >= 1),
  check_code       text        NOT NULL,
  label            text        NOT NULL,
  result           text        NOT NULL DEFAULT 'na' CHECK (result = ANY(ARRAY['na','pass','fail'])),
  notes            text        NULL,
  evidence_file_id uuid        NULL REFERENCES public.document_files(id) ON DELETE SET NULL,
  checked_by       uuid        NULL,
  checked_at       timestamptz NULL,
  CONSTRAINT ppi_instance_items_instance_item_unique UNIQUE (instance_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_ppi_instance_items_instance_id ON public.ppi_instance_items(instance_id);

-- ─── 5. updated_at triggers ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.ppi_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ppi_templates_updated_at
  BEFORE UPDATE ON public.ppi_templates
  FOR EACH ROW EXECUTE FUNCTION public.ppi_set_updated_at();

CREATE TRIGGER trg_ppi_instances_updated_at
  BEFORE UPDATE ON public.ppi_instances
  FOR EACH ROW EXECUTE FUNCTION public.ppi_set_updated_at();

-- ─── 6. Enable RLS ────────────────────────────────────────────
ALTER TABLE public.ppi_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppi_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppi_instances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppi_instance_items ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS policies — ppi_templates ─────────────────────────
-- SELECT: project members
CREATE POLICY ppi_tmpl_select ON public.ppi_templates
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));

-- INSERT: project members
CREATE POLICY ppi_tmpl_insert ON public.ppi_templates
  FOR INSERT WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- UPDATE: project members
CREATE POLICY ppi_tmpl_update ON public.ppi_templates
  FOR UPDATE USING (public.is_project_member(auth.uid(), project_id));

-- DELETE: project admins only
CREATE POLICY ppi_tmpl_delete ON public.ppi_templates
  FOR DELETE USING (public.is_project_admin(auth.uid(), project_id));

-- ─── 8. RLS policies — ppi_template_items ────────────────────
-- Join via template → project
CREATE POLICY ppi_tmpl_items_select ON public.ppi_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ppi_templates t
      WHERE t.id = template_id
        AND public.is_project_member(auth.uid(), t.project_id)
    )
  );

CREATE POLICY ppi_tmpl_items_insert ON public.ppi_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ppi_templates t
      WHERE t.id = template_id
        AND public.is_project_member(auth.uid(), t.project_id)
    )
  );

CREATE POLICY ppi_tmpl_items_update ON public.ppi_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ppi_templates t
      WHERE t.id = template_id
        AND public.is_project_member(auth.uid(), t.project_id)
    )
  );

CREATE POLICY ppi_tmpl_items_delete ON public.ppi_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ppi_templates t
      WHERE t.id = template_id
        AND public.is_project_admin(auth.uid(), t.project_id)
    )
  );

-- ─── 9. RLS policies — ppi_instances ─────────────────────────
CREATE POLICY ppi_inst_select ON public.ppi_instances
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY ppi_inst_insert ON public.ppi_instances
  FOR INSERT WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY ppi_inst_update ON public.ppi_instances
  FOR UPDATE USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY ppi_inst_delete ON public.ppi_instances
  FOR DELETE USING (public.is_project_admin(auth.uid(), project_id));

-- ─── 10. RLS policies — ppi_instance_items ───────────────────
CREATE POLICY ppi_inst_items_select ON public.ppi_instance_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ppi_instances i
      WHERE i.id = instance_id
        AND public.is_project_member(auth.uid(), i.project_id)
    )
  );

CREATE POLICY ppi_inst_items_insert ON public.ppi_instance_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ppi_instances i
      WHERE i.id = instance_id
        AND public.is_project_member(auth.uid(), i.project_id)
    )
  );

CREATE POLICY ppi_inst_items_update ON public.ppi_instance_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ppi_instances i
      WHERE i.id = instance_id
        AND public.is_project_member(auth.uid(), i.project_id)
    )
  );

CREATE POLICY ppi_inst_items_delete ON public.ppi_instance_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ppi_instances i
      WHERE i.id = instance_id
        AND public.is_project_admin(auth.uid(), i.project_id)
    )
  );

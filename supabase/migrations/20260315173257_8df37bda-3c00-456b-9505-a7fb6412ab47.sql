
-- DFO: Dossier Final de Obra
CREATE TABLE public.dfo_volumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  volume_no    int NOT NULL,
  title        text NOT NULL,
  description  text,
  sort_order   int NOT NULL DEFAULT 0
);

CREATE TABLE public.dfo_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id       uuid NOT NULL REFERENCES public.dfo_volumes(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code            text NOT NULL,
  title           text NOT NULL,
  document_type   text,
  status          text NOT NULL DEFAULT 'pending',
  linked_doc_id   uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  notes           text,
  sort_order      int NOT NULL DEFAULT 0
);

ALTER TABLE public.dfo_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dfo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members access dfo_volumes" ON public.dfo_volumes FOR ALL
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true));
CREATE POLICY "project members access dfo_items" ON public.dfo_items FOR ALL
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true));

CREATE INDEX idx_dfo_volumes_project ON public.dfo_volumes(project_id);
CREATE INDEX idx_dfo_items_volume ON public.dfo_items(volume_id);
CREATE INDEX idx_dfo_items_project ON public.dfo_items(project_id);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.trg_validate_dfo_item_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'complete', 'not_applicable') THEN
    RAISE EXCEPTION 'Invalid dfo_item status: %', NEW.status USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dfo_item_status_check BEFORE INSERT OR UPDATE ON public.dfo_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_dfo_item_status();

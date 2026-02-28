
-- ═══════════════════════════════════════════════════════════════════
-- RFI Advanced Tables
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.rfis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  code text,
  subject text NOT NULL,
  description text,
  zone text,
  work_item_id uuid REFERENCES public.work_items(id),
  recipient uuid,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  deadline date,
  created_by uuid NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  nc_id uuid REFERENCES public.non_conformities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rfi_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id uuid NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rfis_project ON public.rfis(project_id);
CREATE INDEX idx_rfis_status ON public.rfis(status);
CREATE INDEX idx_rfi_messages_rfi ON public.rfi_messages(rfi_id);

-- RLS
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfis_select" ON public.rfis FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "rfis_insert" ON public.rfis FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "rfis_update" ON public.rfis FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "rfis_delete" ON public.rfis FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE POLICY "rfi_msg_select" ON public.rfi_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.rfis r WHERE r.id = rfi_messages.rfi_id AND is_project_member(auth.uid(), r.project_id)));
CREATE POLICY "rfi_msg_insert" ON public.rfi_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.rfis r WHERE r.id = rfi_messages.rfi_id AND is_project_member(auth.uid(), r.project_id)));
CREATE POLICY "rfi_msg_delete" ON public.rfi_messages FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.rfis r WHERE r.id = rfi_messages.rfi_id AND is_project_admin(auth.uid(), r.project_id)));

-- Auto-generate RFI code
CREATE OR REPLACE FUNCTION public.fn_generate_rfi_code()
RETURNS TRIGGER AS $$
DECLARE
  seq int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO seq
  FROM public.rfis
  WHERE project_id = NEW.project_id;
  
  NEW.code := 'RFI-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_rfi_code
BEFORE INSERT ON public.rfis
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION public.fn_generate_rfi_code();

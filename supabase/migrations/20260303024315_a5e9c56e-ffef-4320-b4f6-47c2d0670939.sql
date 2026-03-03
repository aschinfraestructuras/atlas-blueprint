
-- ============================================================
-- Technical Office PRO: enhance schema
-- ============================================================

-- 1) Add missing columns to technical_office_items
ALTER TABLE public.technical_office_items
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS nc_id uuid,
  ADD COLUMN IF NOT EXISTS work_item_id uuid;

-- FK constraints
ALTER TABLE public.technical_office_items
  ADD CONSTRAINT technical_office_items_nc_id_fkey FOREIGN KEY (nc_id) REFERENCES public.non_conformities(id),
  ADD CONSTRAINT technical_office_items_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.work_items(id);

-- 2) Validation trigger for type and priority
CREATE OR REPLACE FUNCTION public.trg_validate_tech_office_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('RFI', 'SUBMITTAL', 'TRANSMITTAL', 'CLARIFICATION', 'APPROVAL_REQUEST', 'CHANGE_NOTICE') THEN
    RAISE EXCEPTION 'Invalid technical_office_items type: %', NEW.type;
  END IF;
  IF NEW.priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF NEW.status NOT IN ('draft', 'open', 'in_review', 'in_progress', 'responded', 'closed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tech_office ON public.technical_office_items;
CREATE TRIGGER trg_validate_tech_office
  BEFORE INSERT OR UPDATE ON public.technical_office_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_tech_office_item();

-- 3) Code generation function
CREATE OR REPLACE FUNCTION public.fn_next_tech_office_code(p_project_id uuid, p_prefix text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_proj_code text;
  v_seq int;
  v_full_prefix text;
BEGIN
  SELECT code INTO v_proj_code FROM public.projects WHERE id = p_project_id;
  v_full_prefix := 'OT-' || p_prefix || '-';
  SELECT COALESCE(MAX(
    CASE WHEN t.code ~ ('^' || v_full_prefix || '[0-9]{4,}$')
    THEN substring(t.code FROM length(v_full_prefix) + 1)::int
    ELSE 0 END
  ), 0) + 1 INTO v_seq
  FROM public.technical_office_items t WHERE t.project_id = p_project_id;
  RETURN v_full_prefix || lpad(v_seq::text, 4, '0');
END;
$$;

-- 4) Auto-generate code trigger
CREATE OR REPLACE FUNCTION public.fn_generate_tech_office_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  v_prefix text;
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    v_prefix := CASE NEW.type
      WHEN 'RFI' THEN 'RFI'
      WHEN 'SUBMITTAL' THEN 'SUB'
      WHEN 'TRANSMITTAL' THEN 'TRM'
      WHEN 'CLARIFICATION' THEN 'CLR'
      WHEN 'APPROVAL_REQUEST' THEN 'APR'
      WHEN 'CHANGE_NOTICE' THEN 'CHG'
      ELSE 'GEN'
    END;
    NEW.code := public.fn_next_tech_office_code(NEW.project_id, v_prefix);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_tech_office_code ON public.technical_office_items;
CREATE TRIGGER trg_gen_tech_office_code
  BEFORE INSERT ON public.technical_office_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_tech_office_code();

-- 5) Messages table for technical_office_items
CREATE TABLE IF NOT EXISTS public.technical_office_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.technical_office_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_office_messages ENABLE ROW LEVEL SECURITY;

-- RLS: project members can read/write messages
CREATE POLICY "Members can view tech office messages"
  ON public.technical_office_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.technical_office_items t
    WHERE t.id = item_id AND public.is_project_member(auth.uid(), t.project_id)
  ));

CREATE POLICY "Members can insert tech office messages"
  ON public.technical_office_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.technical_office_items t
      WHERE t.id = item_id AND public.is_project_member(auth.uid(), t.project_id)
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_tech_office_items_project_status ON public.technical_office_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tech_office_items_project_type ON public.technical_office_items(project_id, type);
CREATE INDEX IF NOT EXISTS idx_tech_office_messages_item ON public.technical_office_messages(item_id, created_at);

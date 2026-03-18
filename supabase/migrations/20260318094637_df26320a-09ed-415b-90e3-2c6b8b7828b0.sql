-- Plan Controlled Copies tracking table
CREATE TABLE IF NOT EXISTS public.plan_controlled_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  copy_number int NOT NULL,
  recipient_name text NOT NULL,
  recipient_entity text,
  delivered_at date,
  delivered_by uuid,
  received_confirmed boolean DEFAULT false,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  UNIQUE(plan_id, copy_number)
);

ALTER TABLE public.plan_controlled_copies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view plan copies"
  ON public.plan_controlled_copies FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert plan copies"
  ON public.plan_controlled_copies FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update plan copies"
  ON public.plan_controlled_copies FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id))
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Admins can delete plan copies"
  ON public.plan_controlled_copies FOR DELETE TO authenticated
  USING (public.is_project_admin(auth.uid(), project_id));
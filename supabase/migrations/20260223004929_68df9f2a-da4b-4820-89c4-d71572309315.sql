
-- 1. Add is_active to project_members
ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Create has_project_role function
CREATE OR REPLACE FUNCTION public.has_project_role(_user_id uuid, _project_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND role = _role
      AND is_active = true
  );
$$;

-- 3. Update is_project_member to respect is_active
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id AND is_active = true
  );
$$;

-- 4. Update is_project_admin to respect is_active
CREATE OR REPLACE FUNCTION public.is_project_admin(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id AND role = 'admin' AND is_active = true
  );
$$;

-- 5. Update get_project_role to respect is_active
CREATE OR REPLACE FUNCTION public.get_project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.project_members
  WHERE user_id = _user_id AND project_id = _project_id AND is_active = true
  LIMIT 1;
$$;

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_members_active ON public.project_members(project_id, user_id, is_active);

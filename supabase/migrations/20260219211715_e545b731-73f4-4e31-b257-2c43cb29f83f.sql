
-- =============================================================================
-- Fix Function Search Path Mutable warnings for trigger functions
-- =============================================================================

-- Fix ppi_set_updated_at
CREATE OR REPLACE FUNCTION public.ppi_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix set_updated_at (generic trigger used by various tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

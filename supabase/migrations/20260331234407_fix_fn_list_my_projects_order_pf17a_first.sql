-- Corrigir a ordenação para PF17A (mais antigo = mais importante) aparecer primeiro
-- e garantir que o fallback do browser escolhe o projecto certo
CREATE OR REPLACE FUNCTION public.fn_list_my_projects()
RETURNS SETOF projects
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'tenant_admin') THEN
    RETURN QUERY
      SELECT * FROM public.projects
      WHERE status NOT IN ('inactive', 'archived')
      ORDER BY created_at ASC;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.projects p
  JOIN public.project_members pm ON pm.project_id = p.id
  WHERE pm.user_id = auth.uid()
    AND pm.is_active = true
    AND p.status NOT IN ('inactive', 'archived')
  ORDER BY p.created_at ASC;
END;
$function$;

-- Corrigir fn_list_my_projects para excluir projectos inactive e archived
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
      ORDER BY created_at DESC;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.projects p
  JOIN public.project_members pm ON pm.project_id = p.id
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.is_active = true
    AND p.status NOT IN ('inactive', 'archived')
  ORDER BY p.created_at DESC;
END;
$function$;

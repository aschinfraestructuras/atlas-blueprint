-- Os dois triggers chamam exactamente a mesma função
-- trg_add_creator_as_project_admin e trg_projects_add_creator_member
-- Remover o mais antigo, manter o com nome mais descritivo
DROP TRIGGER IF EXISTS trg_add_creator_as_project_admin ON public.projects;

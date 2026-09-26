-- Remover a policy duplicada que criámos — manter só a original workers_all
DROP POLICY IF EXISTS project_workers_project_member ON public.project_workers;

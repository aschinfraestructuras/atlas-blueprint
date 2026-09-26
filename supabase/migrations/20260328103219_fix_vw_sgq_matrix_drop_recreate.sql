DROP VIEW IF EXISTS public.vw_sgq_matrix_summary;

CREATE VIEW public.vw_sgq_matrix_summary
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  (SELECT COUNT(*) FROM public.documents WHERE project_id=p.id AND is_deleted=false) AS docs_total,
  (SELECT COUNT(*) FROM public.documents WHERE project_id=p.id AND status='approved' AND is_deleted=false) AS docs_approved,
  (SELECT COUNT(*) FROM public.documents WHERE project_id=p.id AND status='in_review' AND is_deleted=false) AS docs_in_review,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND is_deleted=false) AS nc_total,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND status NOT IN('closed','archived') AND is_deleted=false) AS nc_open,
  (SELECT COUNT(*) FROM public.non_conformities WHERE project_id=p.id AND status='closed' AND is_deleted=false) AS nc_closed,
  (SELECT COUNT(*) FROM public.ppi_instances WHERE project_id=p.id AND is_deleted=false) AS ppi_total,
  (SELECT COUNT(*) FROM public.ppi_instances WHERE project_id=p.id AND status='approved' AND is_deleted=false) AS ppi_completed,
  (SELECT COUNT(*) FROM public.ppi_instances WHERE project_id=p.id AND status IN('draft','in_progress') AND is_deleted=false) AS ppi_pending,
  (SELECT COUNT(*) FROM public.materials WHERE project_id=p.id AND is_deleted=false) AS materials_total,
  (SELECT COUNT(*) FROM public.materials WHERE project_id=p.id AND pame_status='approved' AND is_deleted=false) AS materials_approved,
  (SELECT COUNT(*) FROM public.materials WHERE project_id=p.id AND pame_status IN('pending','submitted') AND is_deleted=false) AS materials_pending,
  (SELECT COUNT(*) FROM public.equipment_calibrations WHERE project_id=p.id) AS calibrations_total,
  (SELECT COUNT(*) FROM public.equipment_calibrations WHERE project_id=p.id AND status='valid') AS calibrations_valid,
  (SELECT COALESCE(SUM(total),0) FROM public.view_physical_tests_monthly WHERE project_id=p.id AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date) AS tests_total,
  (SELECT COALESCE(SUM(conforme),0) FROM public.view_physical_tests_monthly WHERE project_id=p.id AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date) AS tests_pass,
  (SELECT COALESCE(SUM(nao_conforme),0) FROM public.view_physical_tests_monthly WHERE project_id=p.id AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::date) AS tests_fail,
  (SELECT COUNT(*) FROM public.quality_audits WHERE project_id=p.id) AS audits_total,
  (SELECT COUNT(*) FROM public.quality_audits WHERE project_id=p.id AND status='completed') AS audits_completed,
  (SELECT COUNT(*) FROM public.training_sessions WHERE project_id=p.id) AS training_total,
  (SELECT COALESCE(SUM(attendee_count),0) FROM public.training_sessions WHERE project_id=p.id) AS training_attendees,
  (SELECT COUNT(*) FROM public.subcontractors WHERE project_id=p.id AND is_deleted=false) AS subcontractors_total
FROM public.projects p
WHERE p.status != 'inactive';

-- Drop e recriar (única forma de mudar nomes de colunas em views)
DROP VIEW IF EXISTS public.vw_fleet_current_month_status;

CREATE VIEW public.vw_fleet_current_month_status
WITH (security_invoker = true) AS
SELECT
  fp.id                                         AS user_id,
  fp.full_name,
  fp.email,
  fp.department,
  fv.plate                                      AS vehicle_plate,
  fv.brand || ' ' || fv.model                  AS vehicle_name,
  date_trunc('month', now())::date              AS reference_month,
  fs.id                                         AS submission_id,
  CASE WHEN fs.id IS NOT NULL THEN true
       ELSE false END                           AS submitted,
  fs.km_total,
  fs.liters,
  fs.cost_eur,
  fs.co2_kg,
  fs.status,
  fs.created_at                                 AS submitted_at
FROM public.fleet_profiles fp
LEFT JOIN public.fleet_vehicles fv
  ON fv.assigned_to = fp.id AND fv.is_active = true
LEFT JOIN public.fleet_submissions fs
  ON fs.user_id = fp.id
  AND fs.vehicle_id = fv.id
  AND fs.reference_month = date_trunc('month', now())::date
WHERE fp.is_active = true AND fp.role = 'worker';

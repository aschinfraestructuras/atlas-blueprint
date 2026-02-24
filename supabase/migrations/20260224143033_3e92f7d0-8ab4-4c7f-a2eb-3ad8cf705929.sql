
-- Fix security definer views - set security_invoker for new views
ALTER VIEW public.view_materials_kpi SET (security_invoker = on);
ALTER VIEW public.view_material_detail_metrics SET (security_invoker = on);

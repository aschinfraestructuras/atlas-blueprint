
-- Fix security definer views → use security invoker so RLS is respected
ALTER VIEW public.view_dashboard_summary SET (security_invoker = on);
ALTER VIEW public.view_nc_monthly SET (security_invoker = on);
ALTER VIEW public.view_tests_monthly SET (security_invoker = on);
ALTER VIEW public.view_document_metrics SET (security_invoker = on);
ALTER VIEW public.view_advanced_quality_metrics SET (security_invoker = on);

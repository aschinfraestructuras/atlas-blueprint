
-- Fix security definer view: change to security_invoker = true
CREATE OR REPLACE VIEW public.view_pe_annexb_pf17a
WITH (security_invoker = true)
AS SELECT * FROM public.view_pe_annexb_pf17a;

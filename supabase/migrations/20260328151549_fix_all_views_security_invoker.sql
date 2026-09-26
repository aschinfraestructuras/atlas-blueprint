-- Corrigir todas as views antigas sem security_invoker
-- Sem security_invoker as views correm com privilégios do owner
-- e podem contornar as políticas RLS

ALTER VIEW public.view_advanced_quality_metrics SET (security_invoker = true);
ALTER VIEW public.view_concrete_lot_conformity SET (security_invoker = true);
ALTER VIEW public.view_concrete_summary SET (security_invoker = true);
ALTER VIEW public.view_dashboard_summary SET (security_invoker = true);
ALTER VIEW public.view_document_metrics SET (security_invoker = true);
ALTER VIEW public.view_due_tests_by_discipline SET (security_invoker = true);
ALTER VIEW public.view_material_detail_metrics SET (security_invoker = true);
ALTER VIEW public.view_materials_kpi SET (security_invoker = true);
ALTER VIEW public.view_nc_monthly SET (security_invoker = true);
ALTER VIEW public.view_pe_annexb_pf17a SET (security_invoker = true);
ALTER VIEW public.view_physical_tests_monthly SET (security_invoker = true);
ALTER VIEW public.view_physical_tests_monthly_total SET (security_invoker = true);
ALTER VIEW public.view_quality_dashboard SET (security_invoker = true);
ALTER VIEW public.view_supplier_detail_metrics SET (security_invoker = true);
ALTER VIEW public.view_suppliers_kpi SET (security_invoker = true);
ALTER VIEW public.view_tests_monthly SET (security_invoker = true);
ALTER VIEW public.vw_audit_log SET (security_invoker = true);
ALTER VIEW public.vw_concrete_conformity_ce SET (security_invoker = true);
ALTER VIEW public.vw_daily_report_context SET (security_invoker = true);
ALTER VIEW public.vw_deadlines SET (security_invoker = true);
ALTER VIEW public.vw_dfo_completeness SET (security_invoker = true);
ALTER VIEW public.vw_dfo_volume_progress SET (security_invoker = true);
ALTER VIEW public.vw_hp_calendar SET (security_invoker = true);
ALTER VIEW public.vw_monthly_quality_summary SET (security_invoker = true);
ALTER VIEW public.vw_nc_aging SET (security_invoker = true);
ALTER VIEW public.vw_ppi_kpis SET (security_invoker = true);
ALTER VIEW public.vw_ppi_template_stats SET (security_invoker = true);
ALTER VIEW public.vw_project_health SET (security_invoker = true);
ALTER VIEW public.vw_sgq_matrix_summary SET (security_invoker = true);
ALTER VIEW public.vw_supplier_scorecard SET (security_invoker = true);
ALTER VIEW public.vw_topography_cycle SET (security_invoker = true);
ALTER VIEW public.vw_traceability_matrix SET (security_invoker = true);
ALTER VIEW public.vw_work_item_quality_summary SET (security_invoker = true);
ALTER VIEW public.vw_work_item_readiness_detail SET (security_invoker = true);
ALTER VIEW public.vw_work_items_summary SET (security_invoker = true);
ALTER VIEW public.vw_workers_training_status SET (security_invoker = true);
-- vw_worker_training_gap se existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='vw_worker_training_gap') THEN
    EXECUTE 'ALTER VIEW public.vw_worker_training_gap SET (security_invoker = true)';
  END IF;
END $$;

-- Corrigir a única chave i18n em falta
-- materials.export.reportTitle só existe em ES, não em PT
-- (não é possível corrigir aqui — é ficheiro frontend, para o Lovable);

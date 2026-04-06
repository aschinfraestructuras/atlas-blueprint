import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

export interface DashboardSummary {
  wi_total: number;
  wi_in_progress: number;
  ppi_total: number;
  ppi_submitted: number;
  ppi_approved: number;
  ppi_conform_pct: number;
  tests_total: number;
  tests_non_conform: number;
  tests_completed: number;
  tests_conform_pct: number;
  nc_open: number;
  nc_closed: number;
  nc_avg_lead_time: number;
  nc_avg_aging: number;
  docs_in_review: number;
  docs_total: number;
}

export interface MonthlyData {
  month: string;
  label: string;
  opened: number;
  closed: number;
}

export interface TestsMonthlyData {
  month: string;
  label: string;
  conform: number;
  non_conform: number;
}

export interface DocMetric {
  doc_type: string;
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  avg_approval_days: number;
}

export interface QualityMetric {
  test_catalog_id: string;
  test_name: string;
  test_code: string;
  disciplina: string;
  material: string | null;
  standard: string | null;
  total: number;
  conform: number;
  non_conform: number;
  failure_rate_pct: number;
}

const EMPTY_SUMMARY: DashboardSummary = {
  wi_total: 0, wi_in_progress: 0,
  ppi_total: 0, ppi_submitted: 0, ppi_approved: 0, ppi_conform_pct: 0,
  tests_total: 0, tests_non_conform: 0, tests_completed: 0, tests_conform_pct: 0,
  nc_open: 0, nc_closed: 0, nc_avg_lead_time: 0, nc_avg_aging: 0,
  docs_in_review: 0, docs_total: 0,
};

function formatMonthLabel(dateStr: string, locale = "pt"): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "es" ? "es" : "pt-PT", { month: "short" });
}

export function useDashboardViews() {
  const { activeProject } = useProject();
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [ncMonthly, setNcMonthly] = useState<MonthlyData[]>([]);
  const [testsMonthly, setTestsMonthly] = useState<TestsMonthlyData[]>([]);
  const [docMetrics, setDocMetrics] = useState<DocMetric[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) {
      setSummary(EMPTY_SUMMARY);
      setNcMonthly([]);
      setTestsMonthly([]);
      setDocMetrics([]);
      setQualityMetrics([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pid = activeProject.id;

      const [summaryRes, ncRes, testsRes, docRes, qualRes] = await Promise.all([
        supabase.from("view_dashboard_summary" as any).select("*").eq("project_id", pid).single(),
        supabase.from("view_nc_monthly" as any).select("*").eq("project_id", pid).order("month"),
        supabase.from("view_physical_tests_monthly_total" as any).select("*").eq("project_id", pid).order("month"),
        supabase.from("view_document_metrics" as any).select("*").eq("project_id", pid),
        supabase.from("view_advanced_quality_metrics" as any).select("*").eq("project_id", pid),
      ]);

      if (summaryRes.data) {
        const d = summaryRes.data as any;
        setSummary({
          wi_total: Number(d.wi_total) || 0,
          wi_in_progress: Number(d.wi_in_progress) || 0,
          ppi_total: Number(d.ppi_total) || 0,
          ppi_submitted: Number(d.ppi_submitted) || 0,
          ppi_approved: Number(d.ppi_approved) || 0,
          ppi_conform_pct: Number(d.ppi_conform_pct) || 0,
          tests_total: Number(d.tests_total) || 0,
          tests_non_conform: Number(d.tests_non_conform) || 0,
          tests_completed: Number(d.tests_completed) || 0,
          tests_conform_pct: Number(d.tests_conform_pct) || 0,
          nc_open: Number(d.nc_open) || 0,
          nc_closed: Number(d.nc_closed) || 0,
          nc_avg_lead_time: Number(d.nc_avg_lead_time) || 0,
          nc_avg_aging: Number(d.nc_avg_aging) || 0,
          docs_in_review: Number(d.docs_in_review) || 0,
          docs_total: Number(d.docs_total) || 0,
        });
      }

      if (ncRes.data) {
        setNcMonthly((ncRes.data as any[]).map((r) => ({
          month: r.month,
          label: formatMonthLabel(r.month),
          opened: Number(r.opened) || 0,
          closed: Number(r.closed) || 0,
        })));
      }

      if (testsRes.data) {
        setTestsMonthly((testsRes.data as any[]).map((r) => ({
          month: r.month,
          label: formatMonthLabel(r.month),
          conform: Number(r.conforme) || 0,
          non_conform: Number(r.nao_conforme) || 0,
        })));
      }

      if (docRes.data) {
        setDocMetrics((docRes.data as any[]).map((r) => ({
          doc_type: r.doc_type,
          total: Number(r.total) || 0,
          draft: Number(r.draft) || 0,
          in_review: Number(r.in_review) || 0,
          approved: Number(r.approved) || 0,
          avg_approval_days: Number(r.avg_approval_days) || 0,
        })));
      }

      if (qualRes.data) {
        setQualityMetrics((qualRes.data as any[]).map((r) => ({
          test_catalog_id: r.test_catalog_id,
          test_name: r.test_name,
          test_code: r.test_code,
          disciplina: r.disciplina,
          material: r.material,
          standard: r.standard,
          total: Number(r.total) || 0,
          conform: Number(r.conform) || 0,
          non_conform: Number(r.non_conform) || 0,
          failure_rate_pct: Number(r.failure_rate_pct) || 0,
        })));
      }
    } catch (err) {
      console.error("[useDashboardViews]", err);
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { summary, ncMonthly, testsMonthly, docMetrics, qualityMetrics, loading, error, refetch: fetch };
}

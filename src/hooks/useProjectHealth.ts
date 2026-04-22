import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectHealth {
  project_id: string;
  total_nc_open: number;
  total_nc_overdue: number;
  total_tests_pending: number;
  total_tests_fail_30d: number;
  total_ppi_pending: number;
  total_documents_expired: number;
  total_calibrations_expired: number;
  activities_blocked: number;
  readiness_ratio: number;
  health_score: number;
  health_status: "healthy" | "attention" | "critical";
}

const EMPTY: ProjectHealth = {
  project_id: "",
  total_nc_open: 0, total_nc_overdue: 0,
  total_tests_pending: 0, total_tests_fail_30d: 0,
  total_ppi_pending: 0, total_documents_expired: 0,
  total_calibrations_expired: 0, activities_blocked: 0,
  readiness_ratio: 100, health_score: 100, health_status: "healthy",
};

export function useProjectHealth(projectId?: string) {
  const [data, setData] = useState<ProjectHealth>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);
    try {
      // 1) Carrega a vista agregada (KPIs gerais)
      const { data: row } = await (supabase as any)
        .from("vw_project_health")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      // 2) Recalcula contagens críticas a partir das tabelas reais
      // (a vista pode incluir registos draft/scheduled fantasmas; aqui usamos
      // apenas o estado real dos test_results não eliminados)
      const [{ count: testsPending }, { count: ppiPending }] = await Promise.all([
        (supabase as any).from("test_results")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .in("status", ["draft", "in_progress", "submitted", "pending"]),
        (supabase as any).from("ppi_instances")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("is_deleted", false)
          .in("status", ["draft", "in_progress", "pending_approval", "open"]),
      ]);

      if (row) {
        setData({
          project_id: row.project_id,
          total_nc_open: Number(row.total_nc_open) || 0,
          total_nc_overdue: Number(row.total_nc_overdue) || 0,
          total_tests_pending: Number(testsPending ?? 0),
          total_tests_fail_30d: Number(row.total_tests_fail_30d) || 0,
          total_ppi_pending: Number(ppiPending ?? row.total_ppi_pending ?? 0),
          total_documents_expired: Number(row.total_documents_expired) || 0,
          total_calibrations_expired: Number(row.total_calibrations_expired) || 0,
          activities_blocked: Number(row.activities_blocked) || 0,
          readiness_ratio: Number(row.readiness_ratio) || 0,
          health_score: Number(row.health_score) || 0,
          health_status: row.health_status ?? "healthy",
        });
      } else {
        setData({
          ...EMPTY,
          project_id: projectId,
          total_tests_pending: Number(testsPending ?? 0),
          total_ppi_pending: Number(ppiPending ?? 0),
        });
      }
    } catch (err) {
      console.error("[useProjectHealth]", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { health: data, loading, refetch: fetch };
}

export function useAllProjectsHealth() {
  const [data, setData] = useState<ProjectHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await (supabase as any)
        .from("vw_project_health")
        .select("*");
      if (rows) {
        setData(rows.map((r: any) => ({
          project_id: r.project_id,
          total_nc_open: Number(r.total_nc_open) || 0,
          total_nc_overdue: Number(r.total_nc_overdue) || 0,
          total_tests_pending: Number(r.total_tests_pending) || 0,
          total_tests_fail_30d: Number(r.total_tests_fail_30d) || 0,
          total_ppi_pending: Number(r.total_ppi_pending) || 0,
          total_documents_expired: Number(r.total_documents_expired) || 0,
          total_calibrations_expired: Number(r.total_calibrations_expired) || 0,
          activities_blocked: Number(r.activities_blocked) || 0,
          readiness_ratio: Number(r.readiness_ratio) || 0,
          health_score: Number(r.health_score) || 0,
          health_status: r.health_status ?? "healthy",
        })));
      }
    } catch (err) {
      console.error("[useAllProjectsHealth]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { healthMap: data, loading, refetch: fetch };
}

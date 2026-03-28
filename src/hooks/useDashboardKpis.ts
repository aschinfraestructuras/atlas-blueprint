import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

export interface RecentItem {
  type: "nc" | "lot" | "ppi" | "test";
  code: string;
  label: string;
  created_at: string;
  id: string;
}

export interface DashboardKpis {
  ncOpen: number;
  pamePending: number;
  emesExpiring30d: number;
  nextAudit: { description: string; planned_start: string } | null;
  ppiInProgress: number;
  testsOverdue: number;
  ppiApproved: number;
  ppiTotal: number;
  testsCompleted: number;
  testsTotal: number;
  matApproved: number;
  matTotal: number;
  weldsPendingUt: number;
  recentActivity: RecentItem[];
}

const EMPTY: DashboardKpis = {
  ncOpen: 0, pamePending: 0, emesExpiring30d: 0, nextAudit: null,
  ppiInProgress: 0, testsOverdue: 0,
  ppiApproved: 0, ppiTotal: 0, testsCompleted: 0, testsTotal: 0,
  matApproved: 0, matTotal: 0, weldsPendingUt: 0, recentActivity: [],
};

export function useDashboardKpis() {
  const { activeProject } = useProject();
  const [data, setData] = useState<DashboardKpis>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);
    const pid = activeProject.id;
    const today = new Date().toISOString().split("T")[0];
    const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    try {
      const [
        ncRes, pameRes, emeRes, auditRes,
        ppiApprovedRes, ppiTotalRes,
        testsCompletedRes, testsTotalRes,
        matApprovedRes, matTotalRes,
        recentNcRes, recentLotRes, recentPpiRes, recentTestRes,
        ppiInProgressRes, testsOverdueRes, weldsPendingUtRes,
      ] = await Promise.all([
        // NCs abertas (not closed, not archived)
        (supabase as any).from("non_conformities")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).neq("status", "closed").neq("status", "archived").eq("is_deleted", false),
        // PAME pendentes
        (supabase as any).from("materials")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).not("pame_code", "is", null).eq("pame_status", "pending"),
        // EMEs com calibração a expirar ≤30d (ainda não expirados)
        (supabase as any).from("topography_equipment")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("status", "active").gte("calibration_valid_until", today).lte("calibration_valid_until", in30d),
        // Próxima auditoria (AI-PF17A-*)
        (supabase as any).from("planning_activities")
          .select("description, planned_start")
          .eq("project_id", pid).eq("status", "planned").like("description", "AI-PF17A-%")
          .order("planned_start", { ascending: true }).limit(1),
        // PPIs aprovados
        (supabase as any).from("ppi_instances")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("status", "approved").eq("is_deleted", false),
        // PPIs total (instances)
        (supabase as any).from("ppi_instances")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("is_deleted", false),
        // Ensaios realizados (pass)
        (supabase as any).from("test_results")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("status", "pass"),
        // Ensaios total (catálogo activo)
        (supabase as any).from("tests_catalog")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("active", true),
        // Materiais aprovados PAME
        (supabase as any).from("materials")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).not("pame_code", "is", null).eq("pame_status", "approved"),
        // Materiais total PAME
        (supabase as any).from("materials")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).not("pame_code", "is", null),
        // Últimas NCs
        (supabase as any).from("non_conformities")
          .select("id, code, classification, created_at")
          .eq("project_id", pid).eq("is_deleted", false)
          .order("created_at", { ascending: false }).limit(4),
        // Últimos lotes
        (supabase as any).from("material_lots")
          .select("id, lot_code, created_at")
          .eq("project_id", pid).eq("is_deleted", false)
          .order("created_at", { ascending: false }).limit(4),
        // Últimos PPIs
        (supabase as any).from("ppi_instances")
          .select("id, code, created_at")
          .eq("project_id", pid).eq("is_deleted", false)
          .order("created_at", { ascending: false }).limit(4),
        // Últimos ensaios
        (supabase as any).from("test_results")
          .select("id, test_id, status, created_at, tests_catalog(code)")
          .eq("project_id", pid)
          .order("created_at", { ascending: false }).limit(4),
        // PPIs em curso (draft + in_progress)
        (supabase as any).from("ppi_instances")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).in("status", ["draft", "in_progress"]).eq("is_deleted", false),
        // Ensaios em atraso
        (supabase as any).from("test_due_items")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).in("status", ["due", "overdue"]).lt("due_at_date", today),
        // Soldaduras sem US
        (supabase as any).from("weld_records")
          .select("id", { count: "exact", head: true })
          .eq("project_id", pid).eq("has_ut", false),
      ]);

      const recent: RecentItem[] = [];
      (recentNcRes.data ?? []).forEach((r: any) =>
        recent.push({ type: "nc", code: r.code ?? "NC", label: r.classification ?? "", created_at: r.created_at, id: r.id }));
      (recentLotRes.data ?? []).forEach((r: any) =>
        recent.push({ type: "lot", code: r.lot_code, label: "", created_at: r.created_at, id: r.id }));
      (recentPpiRes.data ?? []).forEach((r: any) =>
        recent.push({ type: "ppi", code: r.code, label: "", created_at: r.created_at, id: r.id }));
      (recentTestRes.data ?? []).forEach((r: any) =>
        recent.push({ type: "test", code: r.tests_catalog?.code ?? "Ensaio", label: r.status === "pass" ? "Conforme" : r.status === "fail" ? "Não conforme" : "", created_at: r.created_at, id: r.id }));
      recent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setData({
        ncOpen: ncRes.count ?? 0,
        pamePending: pameRes.count ?? 0,
        emesExpiring30d: emeRes.count ?? 0,
        nextAudit: auditRes.data?.[0] ?? null,
        ppiInProgress: ppiInProgressRes.count ?? 0,
        testsOverdue: testsOverdueRes.count ?? 0,
        ppiApproved: ppiApprovedRes.count ?? 0,
        ppiTotal: ppiTotalRes.count ?? 0,
        testsCompleted: testsCompletedRes.count ?? 0,
        testsTotal: testsTotalRes.count ?? 0,
        matApproved: matApprovedRes.count ?? 0,
        matTotal: matTotalRes.count ?? 0,
        weldsPendingUt: weldsPendingUtRes.count ?? 0,
        recentActivity: recent.slice(0, 8),
      });
    } catch (err) {
      console.error("[useDashboardKpis]", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

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
  ncOverdue15d: number;
  pamePending: number;
  emesExpiring30d: number;
  nextAudit: { code: string; scope: string; planned_date: string; audit_type: string } | null;
  ppiInProgress: number;
  ppiPendingApproval: number;
  testsOverdue: number;
  ppiApproved: number;
  ppiTotal: number;
  testsCompleted: number;
  testsTotal: number;
  matApproved: number;
  matTotal: number;
  weldsPendingUt: number;
  recentActivity: RecentItem[];
  dailyReportsTotal: number;
  dailyReportsValidated: number;
  topoControlsTotal: number;
  topoControlsConforme: number;
  ncMonthly: { month: string; open: number; closed: number }[];
  testsMonthly: { month: string; pass: number; fail: number; total: number }[];
}

const EMPTY: DashboardKpis = {
  ncOpen: 0, ncOverdue15d: 0, pamePending: 0, emesExpiring30d: 0, nextAudit: null,
  ppiInProgress: 0, ppiPendingApproval: 0, testsOverdue: 0,
  ppiApproved: 0, ppiTotal: 0, testsCompleted: 0, testsTotal: 0,
  matApproved: 0, matTotal: 0, weldsPendingUt: 0, recentActivity: [],
  dailyReportsTotal: 0, dailyReportsValidated: 0,
  topoControlsTotal: 0, topoControlsConforme: 0,
  ncMonthly: [], testsMonthly: [],
};

export function useDashboardKpis() {
  const { activeProject } = useProject();
  const [data, setData] = useState<DashboardKpis>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);

    try {
      // 1 RPC substitui as 21 queries paralelas anteriores
      const { data: raw, error } = await (supabase as any)
        .rpc("fn_dashboard_summary", {
          p_project_id: activeProject.id,
          p_months: 6,
        });

      if (error) throw error;

      const d = raw ?? {};

      const recentActivity: RecentItem[] = (d.recent_activity ?? []).map((r: any) => {
        const obj = r?.jsonb_build_object ?? r;
        return {
          type:       obj.type       ?? "nc",
          code:       obj.code       ?? "—",
          label:      obj.label      ?? "",
          created_at: obj.created_at ?? new Date().toISOString(),
          id:         obj.id         ?? "",
        };
      });

      setData({
        ncOpen:                Number(d.nc_open                ?? 0),
        ncOverdue15d:          Number(d.nc_overdue_15d         ?? 0),
        pamePending:           Number(d.pame_pending           ?? 0),
        emesExpiring30d:       Number(d.emes_expiring_30d      ?? 0),
        nextAudit:             d.next_audit ?? null,
        ppiInProgress:         Number(d.ppi_in_progress        ?? 0),
        ppiPendingApproval:    Number(d.ppi_pending_approval   ?? 0),
        testsOverdue:          Number(d.tests_overdue          ?? 0),
        ppiApproved:           Number(d.ppi_approved           ?? 0),
        ppiTotal:              Number(d.ppi_total              ?? 0),
        testsCompleted:        Number(d.tests_completed        ?? 0),
        testsTotal:            Number(d.tests_total            ?? 0),
        matApproved:           Number(d.mat_approved           ?? 0),
        matTotal:              Number(d.mat_total              ?? 0),
        weldsPendingUt:        Number(d.welds_pending_ut       ?? 0),
        dailyReportsTotal:     Number(d.daily_reports_total    ?? 0),
        dailyReportsValidated: Number(d.daily_reports_validated ?? 0),
        topoControlsTotal:     Number(d.topo_controls_total    ?? 0),
        topoControlsConforme:  Number(d.topo_controls_conforme ?? 0),
        recentActivity,
        ncMonthly:    d.nc_monthly    ?? [],
        testsMonthly: d.tests_monthly ?? [],
      });
    } catch (err) {
      console.error("[useDashboardKpis]", err);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetch().catch(() => {});
  }, [fetch]);

  return { data, loading, refetch: fetch };
}

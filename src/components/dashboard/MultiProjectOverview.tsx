import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Building2, AlertTriangle, ClipboardCheck, FlaskConical, Package, Heart, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectKpi {
  project_id: string;
  ncOpen: number;
  ppiPct: number;
  testsPct: number;
  matPending: number;
  health: number | null;
}

const EMPTY_KPI: Omit<ProjectKpi, "project_id"> = {
  ncOpen: 0, ppiPct: 0, testsPct: 0, matPending: 0, health: null,
};

function statusColor(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function MiniMetric({ label, value, icon: Icon, danger }: { label: string; value: string | number; icon: React.ElementType; danger?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={cn("h-3 w-3 flex-shrink-0", danger ? "text-destructive" : "text-muted-foreground")} />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</span>
      <span className={cn("text-xs font-bold tabular-nums", danger && "text-destructive")}>{value}</span>
    </div>
  );
}

/**
 * Visão executiva multi-projeto. Lê `vw_project_health` e agrega KPIs
 * para cada projeto a que o utilizador pertence.
 */
export function MultiProjectOverview() {
  const { t } = useTranslation();
  const { data: projects, loading: loadingProjects } = useProjects();
  const [kpis, setKpis] = useState<Record<string, ProjectKpi>>({});
  const [loading, setLoading] = useState(false);

  // Filtrar projetos apagados (soft-deleted: status='inactive'). Mostrar apenas activos e arquivados.
  const visibleProjects = useMemo(
    () => (projects ?? []).filter(p => p.status === "active" || p.status === "archived"),
    [projects],
  );

  useEffect(() => {
    if (visibleProjects.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = visibleProjects.map(p => p.id);

      const { data: healthRows } = await supabase
        .from("vw_project_health" as any)
        .select("project_id, health_score, nc_open, ppi_total, ppi_approved, tests_total, tests_done, materials_pending")
        .in("project_id", ids);

      if (cancelled) return;
      const map: Record<string, ProjectKpi> = {};
      for (const id of ids) map[id] = { project_id: id, ...EMPTY_KPI };
      for (const row of (healthRows ?? []) as any[]) {
        const ppiTotal = Number(row.ppi_total) || 0;
        const ppiApproved = Number(row.ppi_approved) || 0;
        const testsTotal = Number(row.tests_total) || 0;
        const testsDone = Number(row.tests_done) || 0;
        map[row.project_id] = {
          project_id: row.project_id,
          ncOpen: Number(row.nc_open) || 0,
          ppiPct: ppiTotal > 0 ? Math.round((ppiApproved / ppiTotal) * 100) : 0,
          testsPct: testsTotal > 0 ? Math.round((testsDone / testsTotal) * 100) : 0,
          matPending: Number(row.materials_pending) || 0,
          health: row.health_score == null ? null : Number(row.health_score),
        };
      }
      setKpis(map);
      setLoading(false);
    })().catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [visibleProjects]);

  const sorted = useMemo(() => {
    return [...visibleProjects].sort((a, b) => {
      const ha = kpis[a.id]?.health ?? -1;
      const hb = kpis[b.id]?.health ?? -1;
      return ha - hb; // piores primeiro (mais críticos)
    });
  }, [visibleProjects, kpis]);

  const aggregate = useMemo(() => {
    const list = Object.values(kpis);
    if (list.length === 0) return null;
    const withHealth = list.filter(k => k.health != null);
    const avgHealth = withHealth.length > 0
      ? Math.round(withHealth.reduce((s, k) => s + (k.health ?? 0), 0) / withHealth.length)
      : null;
    return {
      totalProjects: list.length,
      totalNc: list.reduce((s, k) => s + k.ncOpen, 0),
      totalMat: list.reduce((s, k) => s + k.matPending, 0),
      avgHealth,
      critical: list.filter(k => (k.health ?? 100) < 60).length,
    };
  }, [kpis]);

  if (loadingProjects || loading) {
    return (
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {t("portal.multiProjectTitle", { defaultValue: "Visão Multi-Projeto" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  if (visibleProjects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {t("portal.multiProjectTitle", { defaultValue: "Visão Multi-Projeto" })}
          </CardTitle>
          {aggregate && (
            <div className="flex flex-wrap items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground uppercase tracking-wider">{t("portal.totalProjects", { defaultValue: "Total" })}:</span>
                <span className="font-bold tabular-nums">{aggregate.totalProjects}</span>
              </div>
              {aggregate.avgHealth != null && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-primary" />
                  <span className="font-bold tabular-nums">{aggregate.avgHealth}</span>
                  <span className="text-muted-foreground">{t("portal.avgHealth", { defaultValue: "saúde média" })}</span>
                </div>
              )}
              {aggregate.critical > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {aggregate.critical} {t("portal.critical", { defaultValue: "críticos" })}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-2">
        {sorted.slice(0, 6).map((p) => {
          const k = kpis[p.id] ?? { project_id: p.id, ...EMPTY_KPI };
          return (
            <Link
              key={p.id}
              to="/"
              onClick={() => { try { localStorage.setItem("atlas_active_project_id", p.id); } catch {} }}
              className="block group"
            >
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-all">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border", statusColor(k.health))}>
                    {k.health ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{p.code}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <MiniMetric icon={AlertTriangle} label="NC" value={k.ncOpen} danger={k.ncOpen > 0} />
                      <MiniMetric icon={ClipboardCheck} label="PPI" value={`${k.ppiPct}%`} />
                      <MiniMetric icon={FlaskConical} label={t("nav.tests", { defaultValue: "Ensaios" })} value={`${k.testsPct}%`} />
                      <MiniMetric icon={Package} label="PAME" value={k.matPending} danger={k.matPending > 0} />
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          );
        })}
        {sorted.length > 6 && (
          <Link to="/projects">
            <Button variant="outline" size="sm" className="w-full mt-2">
              {t("portal.seeAllProjects", { defaultValue: "Ver todos os projectos" })} ({sorted.length})
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

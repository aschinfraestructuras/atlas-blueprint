import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useDashboardViews } from "@/hooks/useDashboardViews";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import { useCountUp } from "@/hooks/useCountUp";
import {
  AlertTriangle, Package, Clock, ArrowRight, Leaf,
  ClipboardCheck, FlaskConical, Calendar,
  ShieldCheck, LayoutDashboard, BarChart3, Layers, Info, MapPin,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { HealthGauge } from "@/components/dashboard/HealthGauge";
import { HealthScoreSheet } from "@/components/dashboard/HealthScoreSheet";

import { CriticalAlertsBanner } from "@/components/dashboard/CriticalAlertsBanner";
import { NCTrendChart } from "@/components/dashboard/NCTrendChart";
import { WorkProgressChart } from "@/components/dashboard/WorkProgressChart";
import { PPIProgressChart } from "@/components/dashboard/PPIProgressChart";
import { ModuleShortcuts } from "@/components/dashboard/ModuleShortcuts";
import { ConformityByFrenteChart } from "@/components/dashboard/ConformityByFrenteChart";
import { TestStatusCard } from "@/components/dashboard/TestStatusCard";
import { ConcreteByClassCard } from "@/components/dashboard/ConcreteByClassCard";
import { SgqKpiCards } from "@/components/dashboard/SgqKpiCards";
import { QualityOverviewChart } from "@/components/dashboard/QualityOverviewChart";
import { StatusTimeline, type TimelineItem } from "@/components/dashboard/StatusTimeline";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PredictiveInsightsCard } from "@/components/dashboard/PredictiveInsightsCard";
import { TopCriticalFrentes } from "@/components/dashboard/TopCriticalFrentes";
import { KeyboardShortcutsOverlay } from "@/components/dashboard/KeyboardShortcutsOverlay";
import { QualityChecklistCard } from "@/components/dashboard/QualityChecklistCard";
import { cn } from "@/lib/utils";

// Hook utilitário: contagem de HPs pendentes (antes mostrado como banner separado, agora integrado no Hero)
function useHpPendingCount(projectId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!projectId) { setCount(0); return; }
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase.from("hp_notifications")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId).eq("status", "pending");
      if (!cancelled) setCount(c ?? 0);
    })();
    return () => { cancelled = true; };
  }, [projectId]);
  return count;
}

function MonthlyReportAlert({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [show, setShow] = useState<{ overdue: boolean; days: number } | null>(null);
  useEffect(() => {
    (async () => {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const { data } = await (supabase as any).from("monthly_quality_reports").select("id")
        .eq("project_id", projectId).neq("status", "draft")
        .gte("reference_month", prevMonth.toISOString().slice(0, 10))
        .lt("reference_month", new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      if (data && data.length > 0) { setShow(null); return; }
      const deadline = new Date(now.getFullYear(), now.getMonth(), 5);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      if (daysUntil < -30) { setShow(null); return; }
      setShow({ overdue: daysUntil < 0, days: Math.abs(daysUntil) });
    })();
  }, [projectId]);
  if (!show) return null;
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors animate-fade-in",
        show.overdue ? "bg-destructive/5 border-destructive/25 text-destructive hover:bg-destructive/8"
          : "bg-amber-500/5 border-amber-500/25 text-amber-700 hover:bg-amber-500/10")}
      onClick={() => navigate("/monthly-reports")}>
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0 animate-pulse", show.overdue ? "bg-destructive" : "bg-amber-500")} />
      <span className="text-sm flex-1">
        {show.overdue
          ? t("dashboard.rmsgqOverdue", { days: show.days, defaultValue: `RMSGQ em atraso ${show.days}d` })
          : t("dashboard.rmsgqDue", { days: show.days, defaultValue: `RMSGQ prazo em ${show.days}d` })}
      </span>
      <ArrowRight className="h-3 w-3 opacity-50" />
    </div>
  );
}

function ProgressCircle({ icon: Icon, label, approved, total, route, colorVar, loading }:
  { icon: React.ElementType; label: string; approved: number; total: number; route: string; colorVar: string; loading: boolean }) {
  const navigate = useNavigate();
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const animPct = useCountUp(loading ? 0 : pct, { duration: 1000, delay: 200 });
  const isEmpty = total === 0;
  const strokeColor = isEmpty ? "hsl(var(--muted))" : pct >= 70 ? "hsl(145 55% 42%)" : pct >= 40 ? "hsl(38 85% 50%)" : "hsl(var(--destructive))";
  const SIZE = 80;
  const R = 30;
  const C = 2 * Math.PI * R;
  const VB = SIZE + 4;
  const center = VB / 2;
  return (
    <Card className="border border-border/60 bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all active:scale-[0.97]"
      onClick={() => navigate(route)}>
      <CardContent className="p-4 sm:p-5 flex flex-col items-center gap-2.5 sm:gap-3">
        <div className="relative">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${VB} ${VB}`}>
            <circle cx={center} cy={center} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
            {!isEmpty && <circle cx={center} cy={center} r={R} fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - animPct / 100)} transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />}
          </svg>
          <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums",
            isEmpty ? "text-muted-foreground/40" : "text-foreground")}>
            {loading ? "—" : isEmpty ? "—" : `${Math.round(animPct)}%`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md"
            style={{ backgroundColor: `hsl(var(${colorVar}) / 0.10)` }}>
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: `hsl(var(${colorVar}))` }} />
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground truncate">{label}</p>
        </div>
        <p className="text-sm sm:text-base font-black tabular-nums">{loading ? "—" : `${approved} / ${total}`}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { role } = useProjectRole();
  const { data: kpis, loading: kpiLoading, refetch } = useDashboardKpis();
  const { ncMonthly, testsMonthly, loading: viewsLoading } = useDashboardViews();
  const { health, loading: healthLoading } = useProjectHealth(activeProject?.id);
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);
  const [period, setPeriod] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  // Live indicator state — must stay above any early return (Rules of Hooks)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [, forceTick] = useState(0);
  useEffect(() => { if (!kpiLoading) setLastUpdated(Date.now()); }, [kpiLoading, kpis]);
  useEffect(() => { const id = setInterval(() => forceTick((v) => v + 1), 30_000); return () => clearInterval(id); }, []);

  // Buscar NCs e PPIs recentes para a Timeline (sem alterar hooks de negócio)
  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;
    (async () => {
      const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6).toISOString();
      const [ncRes, ppiRes] = await Promise.all([
        supabase.from("non_conformities")
          .select("id, code, title, description, status, severity, detected_at, closure_date")
          .eq("project_id", activeProject.id)
          .eq("is_deleted", false)
          .gte("detected_at", sinceIso)
          .order("detected_at", { ascending: false })
          .limit(15),
        supabase.from("ppi_instances")
          .select("id, code, status, opened_at, updated_at, closed_at, is_deleted")
          .eq("project_id", activeProject.id)
          .eq("is_deleted", false)
          .gte("opened_at", sinceIso)
          .order("opened_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;
      const items: TimelineItem[] = [];
      for (const nc of (ncRes.data ?? []) as any[]) {
        const label = nc.title ?? nc.description ?? "NC";
        items.push({
          id: `nc-${nc.id}`,
          label: `${nc.code ?? "NC"} — ${label}`.slice(0, 40),
          startDate: nc.detected_at,
          endDate: nc.closure_date ?? null,
          variant: nc.closure_date ? "closed" : nc.severity === "critical" ? "critical" : "warning",
          meta: `NC · ${nc.status ?? "—"}`,
          href: `/non-conformities/${nc.id}`,
        });
      }
      for (const ppi of (ppiRes.data ?? []) as any[]) {
        const closed = ["approved", "closed", "completed"].includes((ppi.status ?? "").toLowerCase());
        items.push({
          id: `ppi-${ppi.id}`,
          label: `${ppi.code ?? "PPI"}`.slice(0, 40),
          startDate: ppi.opened_at,
          endDate: closed ? (ppi.closed_at ?? ppi.updated_at) : null,
          variant: closed ? "closed" : "in_progress",
          meta: `PPI · ${ppi.status ?? "—"}`,
          href: `/ppi/${ppi.id}`,
        });
      }
      setTimelineItems(items);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [activeProject]);

  // Viewers são redirecionados automaticamente para o Portal Direcção de Obra
  useEffect(() => {
    if (role === "viewer") {
      navigate("/direction-portal", { replace: true });
    }
  }, [role, navigate]);

  const refetchAll = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeProject("non_conformities", refetchAll);
  useRealtimeProject("materials", refetchAll);
  useRealtimeProject("ppi_instances", refetchAll);
  useRealtimeProject("hp_notifications", refetchAll);
  useRealtimeProject("test_results", refetchAll);
  useRealtimeProject("weld_records", refetchAll);

  const filterByPeriod = useCallback(<T extends { month: string }>(data: T[]): T[] => {
    if (period === "all") return data;
    const now = new Date(); let cutoff: Date;
    switch (period) {
      case "3m":  cutoff = new Date(now.getFullYear(), now.getMonth() - 3,  1); break;
      case "6m":  cutoff = new Date(now.getFullYear(), now.getMonth() - 6,  1); break;
      case "12m": cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1); break;
      case "ytd": cutoff = new Date(now.getFullYear(), 0, 1); break;
      default: return data;
    }
    return data.filter(d => new Date(d.month) >= cutoff);
  }, [period]);

  const filteredNcMonthly    = useMemo(() => filterByPeriod(ncMonthly),    [ncMonthly,    filterByPeriod]);
  const filteredTestsMonthly = useMemo(() => filterByPeriod(testsMonthly), [testsMonthly, filterByPeriod]);

  const displayName = user?.email?.split("@")[0] ?? "—";
  if (!activeProject) return <NoProjectBanner />;

  const ppiPct  = kpis.ppiTotal   > 0 ? Math.round((kpis.ppiApproved    / kpis.ppiTotal)   * 100) : 0;
  const testsPct = kpis.testsTotal > 0 ? Math.round((kpis.testsCompleted / kpis.testsTotal) * 100) : 0;
  const ncStatus    = kpis.ncOpen === 0      ? "green" as const : kpis.ncOpen <= 3       ? "amber" as const : "red" as const;
  const ppiStatus   = kpis.ppiTotal === 0    ? "green" as const : ppiPct >= 80           ? "green" as const : ppiPct >= 50 ? "amber" as const : "red" as const;
  const testsStatus = kpis.testsOverdue > 0  ? "red"   as const : testsPct >= 70         ? "green" as const : "amber" as const;
  const matStatus   = kpis.pamePending === 0 ? "green" as const : kpis.pamePending <= 5  ? "amber" as const : "red" as const;
  const hasAlerts   = kpis.ncOpen > 0 || kpis.pamePending > 0 || kpis.emesExpiring30d > 0;

  const colorMap = { green: "hsl(145 55% 42%)", amber: "hsl(38 85% 50%)", red: "hsl(0 65% 50%)" };

  const modules = [
    { icon: AlertTriangle,  label: t("dashboard.module.nc",        { defaultValue: "Não Conformidades" }), value: kpis.ncOpen,        total: undefined,         status: ncStatus,    sub: kpis.ncOpen > 0 ? `${kpis.ncOpen} ${t("dashboard.moduleSub.ncOpen", { defaultValue: "em aberto" })}` : t("dashboard.moduleSub.noAlerts", { defaultValue: "Sem alertas" }),         route: "/non-conformities" },
    { icon: ClipboardCheck, label: t("dashboard.module.ppi",       { defaultValue: "Inspecções PPI" }),    value: kpis.ppiApproved,   total: kpis.ppiTotal,     status: ppiStatus,   sub: `${ppiPct}% ${t("dashboard.moduleSub.approved", { defaultValue: "aprovados" })}`,                                                route: "/ppi" },
    { icon: FlaskConical,   label: t("dashboard.module.tests",     { defaultValue: "Ensaios" }),           value: kpis.testsCompleted,total: kpis.testsTotal,   status: testsStatus, sub: `${testsPct}% ${t("dashboard.moduleSub.completed", { defaultValue: "realizados" })}`,                                             route: "/tests" },
    { icon: Package,        label: t("dashboard.module.materials", { defaultValue: "Materiais PAME" }),    value: kpis.pamePending,   total: undefined,         status: matStatus,   sub: kpis.pamePending === 0 ? t("dashboard.moduleSub.allApproved", { defaultValue: "Tudo aprovado" }) : `${kpis.pamePending} ${t("dashboard.moduleSub.pending", { defaultValue: "pend." })}`, route: "/materials" },
  ];

  const isHealthy = !healthLoading && health.health_score >= 80;

  // Accent dinâmico do hero conforme estado global
  const heroAccent: "green" | "amber" | "red" =
    kpis.ncOpen > 5 || kpis.testsOverdue > 3 ? "red"
    : kpis.ncOpen > 0 || kpis.pamePending > 0 ? "amber"
    : "green";

  // Live indicator — texto humanizado
  const liveAgo = (() => {
    const sec = Math.floor((Date.now() - lastUpdated) / 1000);
    if (sec < 60) return t("dashboard.justNow", { defaultValue: "agora" });
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h`;
  })();

  return (
    <div className="space-y-5 max-w-[1180px] mx-auto overflow-x-hidden">

      {/* Keyboard shortcuts overlay (global '?') */}
      <KeyboardShortcutsOverlay />

      {/* HERO HEADER — Executive Cockpit (pills PAME/HP integradas) */}
      <DashboardHero
        displayName={displayName}
        projectName={activeProject.name}
        projectCode={(activeProject as any).code ?? null}
        client={(activeProject as any).client ?? null}
        contractor={(activeProject as any).contractor ?? null}
        startDate={(activeProject as any).start_date ?? null}
        period={period}
        onPeriodChange={setPeriod}
        accentTone={heroAccent}
        liveUpdatedAgo={liveAgo}
        pamePending={kpis.pamePending}
        ncOpen={kpis.ncOpen}
        hpPending={hpCountForHero}
      />

      {/* ALERTAS — só críticos (NC vencidas, EMEs a expirar) e RMSGQ */}
      {hasAlerts && (
        <div className="space-y-2 animate-fade-in">
          <CriticalAlertsBanner ncOpen={kpis.ncOpen} ncOverdue={health.total_nc_overdue}
            emesExpiring={kpis.emesExpiring30d} pamePending={0} />
          <MonthlyReportAlert projectId={activeProject.id} />
        </div>
      )}

      {/* ── HEALTH SCORE — proeminente ── */}
      <style>{`@keyframes healthPulse { 0%,100%{box-shadow:0 0 0 0 hsl(145 55% 42%/0.15)} 50%{box-shadow:0 0 0 12px hsl(145 55% 42%/0)} }`}</style>
      <Card
        className={cn(
          "border border-border/60 bg-card shadow-card cursor-pointer hover:shadow-card-hover transition-all active:scale-[0.98] relative overflow-hidden",
          isHealthy && "border-emerald-400/30",
        )}
        style={isHealthy ? { animation: "healthPulse 3s ease-in-out infinite" } : undefined}
        onClick={() => setHealthSheetOpen(true)}
      >
        <CardContent className="py-5 sm:py-6 px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          {/* Decorative rings when healthy */}
          {isHealthy && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <style>{`@keyframes dashRing { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.07);opacity:.12} }`}</style>
              <div className="absolute rounded-full border border-emerald-400/20" style={{ width: 180, height: 180, animation: "dashRing 4s ease-in-out infinite" }} />
              <div className="absolute rounded-full border border-emerald-400/10" style={{ width: 220, height: 220, animation: "dashRing 4s ease-in-out infinite 1s" }} />
            </div>
          )}
          <div className="relative z-10">
            <HealthGauge score={health.health_score} status={health.health_status} loading={healthLoading} />
          </div>
          <div className="relative z-10 flex flex-col items-center sm:items-start gap-2 text-center sm:text-left flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("health.score", { defaultValue: "Health Score" })}
            </p>
            <p className="text-[11px] text-muted-foreground/60 max-w-[280px] leading-relaxed">
              {t("health.explanation", { defaultValue: "Score calculado com base em NCs, PPIs, ensaios e materiais" })}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
              onClick={(e) => { e.stopPropagation(); setHealthSheetOpen(true); }}
            >
              <Info className="h-3 w-3" />
              {t("health.seeDetails", { defaultValue: "Ver detalhes" })}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <HealthScoreSheet open={healthSheetOpen} onOpenChange={setHealthSheetOpen} health={health} loading={healthLoading} />

      {/* ── MODULE CARDS — 2x2 mobile, 4 cols desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 animate-fade-in" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {modules.map((mod) => {
          const color = colorMap[mod.status];
          const Icon = mod.icon;
          return (
            <Card
              key={mod.route}
              className="border border-border/60 bg-card shadow-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.97] group relative overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: color }}
              onClick={() => navigate(mod.route)}
            >
              <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
                    style={{ background: `color-mix(in srgb, ${color} 9%, transparent)` }}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />
                  </div>
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground truncate">{mod.label}</p>
                  {kpiLoading ? <Skeleton className="h-6 w-12 mt-0.5" /> :
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground leading-none">{mod.value}</span>
                      {mod.total !== undefined && <span className="text-[10px] sm:text-xs text-muted-foreground">/ {mod.total}</span>}
                    </div>}
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 truncate mt-0.5">{mod.sub}</p>
                </div>
                <ArrowRight className="absolute bottom-2.5 right-2.5 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── MAP QUICK ACCESS — card horizontal premium, integrado entre módulos e tabs ── */}
      <Card
        className="relative overflow-hidden border border-border/60 bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.99] group animate-fade-in"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
        onClick={() => navigate("/map")}
        role="link"
        aria-label={t("dashboard.mapCta.aria", { defaultValue: "Abrir Mapa da Obra" })}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-card to-emerald-500/[0.05]" />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <CardContent className="relative z-10 p-4 sm:p-5 flex items-center gap-4">
          <div className="flex-shrink-0 relative">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" strokeWidth={2.2} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-emerald-500 border-2 border-card" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/70">
                {t("dashboard.mapCta.eyebrow", { defaultValue: "Georreferenciação" })}
              </p>
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                {t("dashboard.mapCta.live", { defaultValue: "Live" })}
              </Badge>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground leading-tight">
              {t("dashboard.mapCta.title", { defaultValue: "Mapa da Obra" })}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground/80 truncate mt-0.5">
              {t("dashboard.mapCta.subtitle", { defaultValue: "Visualize work items, NCs, PPIs e ensaios geolocalizados" })}
            </p>
          </div>

          <div className="hidden sm:flex flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary bg-card/80 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 group-hover:translate-x-0.5 transition-all"
              onClick={(e) => { e.stopPropagation(); navigate("/map"); }}
            >
              {t("dashboard.mapCta.button", { defaultValue: "Abrir mapa" })}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <ArrowRight className="sm:hidden h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <TabsList className="h-auto p-1.5 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-2xl border border-border/50 shadow-inner w-full sm:w-auto gap-1">
          <TabsTrigger
            value="overview"
            className="gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            {t("dashboard.tab.overview", { defaultValue: "Visão Geral" })}
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            {t("dashboard.tab.trends", { defaultValue: "Tendências" })}
          </TabsTrigger>
          <TabsTrigger
            value="access"
            className="gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
            {t("dashboard.tab.access", { defaultValue: "Módulos" })}
          </TabsTrigger>
        </TabsList>

        {/* TAB: VISÃO GERAL — focada em inteligência (sem duplicar Module Cards do topo) */}
        <TabsContent value="overview" className="space-y-5 mt-4">

          {/* Linha 1 — Inteligência Operacional: Insights + Top Frentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
            <PredictiveInsightsCard
              ncMonthly={filteredNcMonthly as any}
              testsMonthly={filteredTestsMonthly as any}
              ppiApproved={kpis.ppiApproved}
              ppiTotal={kpis.ppiTotal}
              loading={kpiLoading || viewsLoading}
            />
            <TopCriticalFrentes projectId={activeProject.id} />
          </div>

          {/* Linha 2 — Visão Integrada de Qualidade (radar + breakdown) */}
          <QualityOverviewChart
            ncOpen={kpis.ncOpen}
            ncTotal={kpis.ncOpen + (kpis.testsCompleted > 0 ? kpis.testsCompleted : 1)}
            ppiApproved={kpis.ppiApproved}
            ppiTotal={kpis.ppiTotal}
            testsCompleted={kpis.testsCompleted}
            testsTotal={kpis.testsTotal}
            matApproved={kpis.matApproved}
            matTotal={kpis.matTotal}
            healthScore={health.health_score}
            loading={kpiLoading || healthLoading}
          />

          {/* Linha 3 — KPIs SGQ + Quality Checklist (visual, inspirado no Apple-tier mockup) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/50 mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />{t("dashboard.sgqKpi.title", { defaultValue: "KPIs do SGQ — Anx. D" })}
              </p>
              <SgqKpiCards projectId={activeProject.id} />
            </div>

            <QualityChecklistCard
              loading={kpiLoading || healthLoading}
              globalPct={health.health_score}
              items={[
                {
                  key: "nc",
                  label: t("dashboard.checklist.items.nc", { defaultValue: "NCs em aberto" }),
                  pct: kpis.ncOpen === 0 ? 100 : Math.max(0, 100 - kpis.ncOpen * 12),
                  status: kpis.ncOpen === 0 ? "ok" : kpis.ncOpen <= 3 ? "warn" : "nc",
                  hint: kpis.ncOpen === 0 ? "0" : `${kpis.ncOpen}`,
                  route: "/non-conformities",
                },
                {
                  key: "ppi",
                  label: t("dashboard.checklist.items.ppi", { defaultValue: "PPIs aprovados" }),
                  pct: ppiPct,
                  status: kpis.ppiTotal === 0 ? "empty" : ppiPct >= 80 ? "ok" : ppiPct >= 50 ? "warn" : "nc",
                  hint: kpis.ppiTotal > 0 ? `${kpis.ppiApproved}/${kpis.ppiTotal}` : undefined,
                  route: "/ppi",
                },
                {
                  key: "tests",
                  label: t("dashboard.checklist.items.tests", { defaultValue: "Ensaios realizados" }),
                  pct: testsPct,
                  status: kpis.testsTotal === 0 ? "empty" : kpis.testsOverdue > 0 ? "nc" : testsPct >= 70 ? "ok" : "warn",
                  hint: kpis.testsTotal > 0 ? `${kpis.testsCompleted}/${kpis.testsTotal}` : undefined,
                  route: "/tests",
                },
                {
                  key: "materials",
                  label: t("dashboard.checklist.items.materials", { defaultValue: "PAME aprovados" }),
                  pct: kpis.matTotal > 0 ? Math.round((kpis.matApproved / kpis.matTotal) * 100) : 0,
                  status: kpis.matTotal === 0 ? "empty" : kpis.pamePending === 0 ? "ok" : kpis.pamePending <= 5 ? "warn" : "nc",
                  hint: kpis.matTotal > 0 ? `${kpis.matApproved}/${kpis.matTotal}` : undefined,
                  route: "/materials",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* TAB: TENDÊNCIAS */}
        <TabsContent value="trends" className="space-y-5 mt-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/50 mb-3 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" />{t("dashboard.trends.monthly", { defaultValue: "Tendência Mensal" })}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <NCTrendChart data={filteredNcMonthly} loading={viewsLoading} />
              <WorkProgressChart />
              <PPIProgressChart />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <ProgressCircle icon={ClipboardCheck} label={t("dashboard.progress.ppi",       { defaultValue: "PPIs Aprovados" })}      approved={kpis.ppiApproved}    total={kpis.ppiTotal}   route="/ppi"       colorVar="--module-plans"    loading={kpiLoading} />
            <ProgressCircle icon={FlaskConical}   label={t("dashboard.progress.tests",     { defaultValue: "Ensaios Realizados" })}   approved={kpis.testsCompleted} total={kpis.testsTotal} route="/tests"     colorVar="--module-tests"    loading={kpiLoading} />
            <ProgressCircle icon={Package}        label={t("dashboard.progress.materials", { defaultValue: "Materiais Aprovados" })}  approved={kpis.matApproved}    total={kpis.matTotal}   route="/materials" colorVar="--module-suppliers" loading={kpiLoading} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <TestStatusCard />
            <ConcreteByClassCard />
          </div>
          <ConformityByFrenteChart />
          <StatusTimeline
            title={t("dashboard.timeline.title", { defaultValue: "Linha do Tempo — NCs e PPIs (6 meses)" })}
            items={timelineItems}
            monthsBack={6}
          />
        </TabsContent>

        {/* TAB: MÓDULOS — grid 3x2 com ícones grandes */}
        <TabsContent value="access" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { icon: AlertTriangle, label: t("nav.expirations", { defaultValue: "Expirações" }), sub: t("dashboard.expirations.subtitle", { defaultValue: "Docs e calibrações a expirar em 30d" }), badge: kpiLoading ? "—" : String(kpis.emesExpiring30d), danger: kpis.emesExpiring30d > 0, route: "/expirations", color: "hsl(0 65% 50%)" },
              { icon: Leaf,          label: t("recycled.dashboard.widget", { defaultValue: "PPGRCD — Reciclados" }), sub: `${t("recycled.kpi.target", { defaultValue: "Meta PPGRCD" })}: 5%`, badge: null, danger: false, route: "/recycled-materials", color: "hsl(145 55% 42%)" },
            ].map(({ icon: Icon, label, sub, badge, danger, route, color }) => (
              <Card key={route} className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/60 active:scale-[0.97] group" onClick={() => navigate(route)}>
                <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
                  </div>
                  {badge && <Badge variant={danger ? "destructive" : "secondary"} className="text-[10px] sm:text-[11px] font-black px-2">{badge}</Badge>}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/50 mb-3">{t("dashboard.modules", { defaultValue: "Acesso a Módulos" })}</p>
            <ModuleShortcuts />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

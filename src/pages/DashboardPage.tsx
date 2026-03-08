import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useDashboardViews } from "@/hooks/useDashboardViews";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import {
  AlertTriangle, Package, Crosshair, CalendarClock,
  ClipboardCheck, FlaskConical, Clock, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { HealthGauge } from "@/components/dashboard/HealthGauge";
import { SparklineKPI } from "@/components/dashboard/SparklineKPI";
import { NCBarChart } from "@/components/dashboard/NCBarChart";
import { TestsDonutChart } from "@/components/dashboard/TestsDonutChart";
import { ModuleShortcuts } from "@/components/dashboard/ModuleShortcuts";
import { cn } from "@/lib/utils";

// ── Semaphore logic ───────────────────────────────────────────────
function ncSemaphore(v: number) { return v === 0 ? "145 55% 42%" : v <= 3 ? "38 85% 50%" : "0 65% 50%"; }
function pameSemaphore(v: number) { return v === 0 ? "145 55% 42%" : v <= 15 ? "38 85% 50%" : "0 65% 50%"; }
function emeSemaphore(v: number) { return v === 0 ? "145 55% 42%" : v <= 2 ? "38 85% 50%" : "0 65% 50%"; }

function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ── Activity icon/color ───────────────────────────────────────────
const ACTIVITY_CFG: Record<string, { icon: React.ElementType; cls: string }> = {
  nc:   { icon: AlertTriangle,  cls: "text-destructive" },
  lot:  { icon: Package,        cls: "text-primary" },
  ppi:  { icon: ClipboardCheck, cls: "text-emerald-600" },
  test: { icon: FlaskConical,   cls: "text-amber-500" },
};

// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { data: kpis, loading: kpiLoading, refetch } = useDashboardKpis();
  const { ncMonthly, testsMonthly, loading: viewsLoading } = useDashboardViews();
  const { health, loading: healthLoading } = useProjectHealth(activeProject?.id);

  // Realtime subscriptions
  const refetchAll = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeProject("non_conformities", refetchAll);
  useRealtimeProject("materials", refetchAll);
  useRealtimeProject("ppi_instances", refetchAll);

  // Sparkline data from monthly views
  const ncSpark = useMemo(() => ncMonthly.slice(-6).map(m => ({ v: m.opened })), [ncMonthly]);
  const testsSpark = useMemo(() => testsMonthly.slice(-6).map(m => ({ v: m.conform + m.non_conform })), [testsMonthly]);

  const displayName = user?.email?.split("@")[0] ?? "—";
  const auditDays = daysUntilDate(kpis.nextAudit?.planned_start ?? null);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-5 max-w-[1120px] mx-auto animate-fade-in">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-muted-foreground/60">
            {t("dashboard.welcome")}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h1>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.subtitleProject", { project: activeProject.name })}
          </p>
        </div>
      </div>

      {/* ══ ZONA A — Health Gauge + Breakdown ═══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <Card className="border-0 bg-card shadow-card flex flex-col items-center justify-center py-5">
          <HealthGauge
            score={health.health_score}
            status={health.health_status}
            loading={healthLoading}
          />
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-2">
            {t("health.score", { defaultValue: "Health Score" })}
          </p>
        </Card>

        <Card className="border-0 bg-card shadow-card">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t("dashboard.healthBreakdown", { defaultValue: "Indicadores de Saúde" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              {[
                { label: t("health.ncOverdue", { defaultValue: "NC Atrasadas" }), val: health.total_nc_overdue, bad: health.total_nc_overdue > 0 },
                { label: t("health.testsFail30d", { defaultValue: "Ensaios Fail 30d" }), val: health.total_tests_fail_30d, bad: health.total_tests_fail_30d > 0 },
                { label: t("health.docsExpired", { defaultValue: "Docs Expirados" }), val: health.total_documents_expired, bad: health.total_documents_expired > 0 },
                { label: t("health.calibExpired", { defaultValue: "Calib. Expiradas" }), val: health.total_calibrations_expired, bad: health.total_calibrations_expired > 0 },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center py-2 rounded-lg bg-muted/30">
                  {healthLoading ? <Skeleton className="h-7 w-10" /> : (
                    <p className={cn(
                      "text-xl font-black tabular-nums leading-none",
                      item.bad ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                    )}>
                      {item.val}
                    </p>
                  )}
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground mt-1 text-center leading-tight">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            {/* Readiness bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("health.globalReadiness", { defaultValue: "Preparação Global" })}
                </span>
                <span className="text-sm font-black tabular-nums text-foreground">
                  {healthLoading ? "—" : `${Math.round(health.readiness_ratio)}%`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${health.readiness_ratio}%`,
                    backgroundColor: health.readiness_ratio >= 70
                      ? "hsl(145, 55%, 42%)"
                      : health.readiness_ratio >= 40
                        ? "hsl(38, 85%, 50%)"
                        : "hsl(var(--destructive))",
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══ ZONA B — KPI Strip ══════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SparklineKPI
          label={t("dashboard.kpi.ncOpen", { defaultValue: "NCs Abertas" })}
          value={kpis.ncOpen}
          icon={AlertTriangle}
          sparkData={ncSpark}
          color={ncSemaphore(kpis.ncOpen)}
          onClick={() => navigate("/non-conformities")}
          loading={kpiLoading}
        />
        <SparklineKPI
          label={t("dashboard.kpi.pamePending", { defaultValue: "PAME Pendentes" })}
          value={kpis.pamePending}
          icon={Package}
          color={pameSemaphore(kpis.pamePending)}
          onClick={() => navigate("/materials")}
          loading={kpiLoading}
        />
        <SparklineKPI
          label={t("dashboard.kpi.emesExpiring", { defaultValue: "EMEs ≤30d" })}
          value={kpis.emesExpiring30d}
          icon={Crosshair}
          color={emeSemaphore(kpis.emesExpiring30d)}
          onClick={() => navigate("/topography")}
          loading={kpiLoading}
        />
        <SparklineKPI
          label={t("dashboard.kpi.nextAudit", { defaultValue: "Próxima Auditoria" })}
          value={auditDays !== null ? `${auditDays}d` : "—"}
          subtitle={kpis.nextAudit?.description?.substring(0, 30) || undefined}
          icon={CalendarClock}
          onClick={() => navigate("/planning")}
          loading={kpiLoading}
        />
      </div>

      {/* ══ ZONA C — Charts Grid ════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NCBarChart data={ncMonthly} loading={viewsLoading} />
        <TestsDonutChart data={testsMonthly} loading={viewsLoading} />
      </div>

      {/* ══ ZONA D — Module Progress ════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            icon: ClipboardCheck,
            label: t("dashboard.progress.ppi", { defaultValue: "PPIs Aprovados" }),
            approved: kpis.ppiApproved,
            total: kpis.ppiTotal,
            route: "/ppi",
            colorVar: "--module-plans",
          },
          {
            icon: FlaskConical,
            label: t("dashboard.progress.tests", { defaultValue: "Ensaios Realizados" }),
            approved: kpis.testsCompleted,
            total: kpis.testsTotal,
            route: "/tests",
            colorVar: "--module-tests",
          },
          {
            icon: Package,
            label: t("dashboard.progress.materials", { defaultValue: "Materiais PAME" }),
            approved: kpis.matApproved,
            total: kpis.matTotal,
            route: "/materials",
            colorVar: "--module-suppliers",
          },
        ].map((mod) => {
          const pct = mod.total > 0 ? Math.round((mod.approved / mod.total) * 100) : 0;
          const strokeColor = pct >= 70
            ? "hsl(145, 55%, 42%)"
            : pct >= 40
              ? "hsl(38, 85%, 50%)"
              : "hsl(var(--muted-foreground))";
          return (
            <Card
              key={mod.label}
              className="border border-transparent bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-border/50 transition-all group"
              onClick={() => navigate(mod.route)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Circular progress */}
                <div className="relative flex-shrink-0">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle
                      cx="26" cy="26" r="22"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="4"
                    />
                    <circle
                      cx="26" cy="26" r="22"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${pct * 1.382} 138.2`}
                      transform="rotate(-90 26 26)"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-foreground">
                    {kpiLoading ? "—" : `${pct}%`}
                  </span>
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className="flex items-center justify-center w-5 h-5 rounded"
                      style={{ backgroundColor: `hsl(var(${mod.colorVar}) / 0.1)` }}
                    >
                      <mod.icon className="h-3 w-3" style={{ color: `hsl(var(${mod.colorVar}))` }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground truncate">
                      {mod.label}
                    </p>
                  </div>
                  <p className="text-base font-black tabular-nums text-foreground">
                    {kpiLoading ? "—" : `${mod.approved} / ${mod.total}`}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-all flex-shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ══ ZONA E — Module Shortcuts ═══════════════════════ */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
          {t("dashboard.modules", { defaultValue: "Módulos" })}
        </p>
        <ModuleShortcuts />
      </div>

      {/* ══ ZONA F — Recent Activity ════════════════════════ */}
      <Card className="border-0 bg-card shadow-card">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("dashboard.recent.title", { defaultValue: "Actividade Recente" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {kpiLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : kpis.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("dashboard.recent.empty", { defaultValue: "Sem actividade recente" })}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {kpis.recentActivity.map((item, idx) => {
                const cfg = ACTIVITY_CFG[item.type] ?? ACTIVITY_CFG.nc;
                const Icon = cfg.icon;
                const route = item.type === "nc" ? `/non-conformities/${item.id}`
                  : item.type === "ppi" ? `/ppi/${item.id}`
                  : item.type === "lot" ? "/materials"
                  : "/tests";
                return (
                  <li
                    key={`${item.type}-${item.id}-${idx}`}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors group/item"
                    onClick={() => navigate(route)}
                  >
                    <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", cfg.cls)} />
                    <span className="font-mono text-[11px] text-muted-foreground w-28 flex-shrink-0 truncate">{item.code}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{item.label || "—"}</span>
                    <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 border-border/60">
                      {item.type.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover/item:text-muted-foreground/40 transition-all flex-shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

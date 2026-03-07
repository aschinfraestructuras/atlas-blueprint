import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useDashboardViews } from "@/hooks/useDashboardViews";
import { useNonConformities } from "@/hooks/useNonConformities";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import {
  FolderKanban, FileText, FlaskConical, AlertTriangle,
  Clock, Building2, Timer, CheckCircle2, TrendingUp,
  ShieldCheck, Construction, ClipboardCheck, Hourglass,
  BarChart3, PieChart as PieChartIcon, Target, Activity, Truck, Package,
  Ban, Gauge, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Semantic module colors from CSS tokens ────────────────────────
const MOD = {
  documents:      "hsl(var(--module-documents))",
  tests:          "hsl(var(--module-tests))",
  nc:             "hsl(var(--module-nc))",
  suppliers:      "hsl(var(--module-suppliers))",
  subcontractors: "hsl(var(--module-subcontractors))",
  plans:          "hsl(var(--module-plans))",
  projects:       "hsl(var(--module-projects))",
  muted:          "hsl(var(--muted-foreground))",
} as const;

// ── Animated counter ──────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

// ── KPI Indicator Card ────────────────────────────────────────────
function KPICard({
  label, value, icon: Icon, loading, color, sub, suffix, severity,
}: {
  label: string; value: number; icon: React.ElementType;
  loading: boolean; color: string; sub?: string; suffix?: string;
  severity?: "negative" | "attention" | "positive";
}) {
  const animated = useCountUp(loading ? 0 : value);
  const borderColor = severity === "negative" && value > 0
    ? "#ef4444"
    : severity === "attention" && value > 0
      ? "#f59e0b"
      : "#22c55e";
  if (loading) return (
    <Card className="border-0 bg-card shadow-card overflow-hidden">
      <CardContent className="p-5"><Skeleton className="h-3 w-24 mb-5" /><Skeleton className="h-10 w-16 mb-3" /><Skeleton className="h-2.5 w-20" /></CardContent>
    </Card>
  );
  return (
    <Card className="border-0 bg-card shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in overflow-hidden relative group" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground leading-none">{label}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}20` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-[38px] font-black tabular-nums text-foreground leading-none tracking-tight">{animated}</p>
          {suffix && <span className="text-sm font-semibold text-muted-foreground">{suffix}</span>}
        </div>
        {sub && <p className="mt-2 text-xs text-muted-foreground leading-none">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Percent Ring ─────────────────────────────────────────────────
function PercentCard({
  label, value, loading, color, sub, icon: Icon,
}: {
  label: string; value: number; loading: boolean; color: string; sub?: string; icon: React.ElementType;
}) {
  const animated = useCountUp(loading ? 0 : value);
  const data = [{ value: animated }, { value: Math.max(0, 100 - animated) }];
  if (loading) return (
    <Card className="border-0 bg-card shadow-card"><CardContent className="p-5"><Skeleton className="h-3 w-24 mb-3" /><Skeleton className="h-20 w-20 rounded-full mx-auto" /></CardContent></Card>
  );
  return (
    <Card className="border-0 bg-card shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in">
      <CardContent className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground leading-none mb-4 flex items-center gap-1.5">
          <Icon className="h-3 w-3" />{label}
        </p>
        <div className="relative mx-auto w-[90px] h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={42} startAngle={90} endAngle={-270}
                dataKey="value" strokeWidth={0} isAnimationActive animationDuration={700}>
                <Cell fill={color} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black tabular-nums text-foreground">{animated}%</span>
          </div>
        </div>
        {sub && <p className="mt-3 text-xs text-muted-foreground text-center">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-md text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill ?? p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Trend Bar Chart ───────────────────────────────────────────────
function TrendChart({
  title, data, loading, icon: Icon, bars, emptyMsg,
}: {
  title: string; data: any[]; loading: boolean; icon: React.ElementType;
  bars: { key: string; color: string; label: string }[];
  emptyMsg: string;
}) {
  return (
    <Card className="border-0 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? (
          <Skeleton className="h-[140px] w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="flex h-[140px] items-center justify-center"><p className="text-sm text-muted-foreground">{emptyMsg}</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} barCategoryGap="25%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
              {bars.map((b) => (
                <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Donut Card ────────────────────────────────────────────────────
function DonutCard({
  title, data, loading, icon: Icon, total, emptyMsg,
}: {
  title: string; data: { name: string; value: number; color: string }[];
  loading: boolean; icon: React.ElementType; total: number; emptyMsg: string;
}) {
  return (
    <Card className="border-0 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-[130px] w-full mt-3 rounded-xl" />
        ) : total === 0 ? (
          <div className="flex h-[130px] items-center justify-center"><p className="text-sm text-muted-foreground">{emptyMsg}</p></div>
        ) : (
          <div className="flex items-center gap-4 mt-3">
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={2} dataKey="value" strokeWidth={0} isAnimationActive animationDuration={600}>
                    {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold tabular-nums text-foreground leading-none">{total}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 min-w-0">
              {data.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Horizontal bar list (for advanced analysis) ───────────────────
function HBarList({
  title, data, loading, icon: Icon, emptyMsg,
}: {
  title: string; data: { label: string; value: number; color: string }[];
  loading: boolean; icon: React.ElementType; emptyMsg: string;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <Card className="border-0 bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? <Skeleton className="h-24 w-full rounded-xl" /> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMsg}</p>
        ) : (
          <ul className="space-y-2.5 mt-2">
            {data.slice(0, 8).map((d) => (
              <li key={d.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-foreground truncate max-w-[60%]">{d.label}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">{d.value}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { summary, ncMonthly, testsMonthly, docMetrics, qualityMetrics, loading } = useDashboardViews();
  const { health: projectHealth, loading: healthLoading } = useProjectHealth(activeProject?.id);
  const { data: ncs, loading: ncLoading } = useNonConformities();
  const { data: suppliers, kpis, loading: supLoading } = useSuppliers();
  const { data: workItems, loading: wiLoading } = useWorkItems();
  const { kpis: matKpis, loading: matLoading } = useMaterials();

  // Realtime subscriptions for live updates
  const refetchAll = useCallback(() => {
    // trigger refetches by the hooks (they auto-refetch on project change)
  }, []);
  useRealtimeProject("documents", refetchAll);
  useRealtimeProject("non_conformities", refetchAll);
  useRealtimeProject("planning_activities", refetchAll);

  const displayName = user?.email?.split("@")[0] ?? "—";
  const emptyMsg = t("dashboard.noData");

  // ── Advanced analysis data ──────────────────────────────────────
  const ncByDiscipline = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach(n => {
      const wi = workItems.find(w => w.id === (n as any).work_item_id);
      const disc = wi?.disciplina ?? "geral";
      map[disc] = (map[disc] ?? 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({
      label: t(`workItems.disciplines.${k}`, { defaultValue: k }),
      value: v,
      color: MOD.nc,
    })).sort((a, b) => b.value - a.value);
  }, [ncs, workItems, t]);

  const ncBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach(n => {
      const sid = (n as any).supplier_id;
      if (sid) {
        const sup = suppliers.find(s => s.id === sid);
        const name = sup?.name ?? sid;
        map[name] = (map[name] ?? 0) + 1;
      }
    });
    return Object.entries(map).map(([k, v]) => ({ label: k, value: v, color: MOD.subcontractors })).sort((a, b) => b.value - a.value);
  }, [ncs, suppliers]);

  const ncBySeverity = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach(n => {
      const sev = (n as any).severity ?? "medium";
      map[sev] = (map[sev] ?? 0) + 1;
    });
    const colors: Record<string, string> = { critical: MOD.nc, major: MOD.subcontractors, high: MOD.subcontractors, medium: MOD.plans, minor: MOD.muted, low: MOD.muted };
    return Object.entries(map).map(([k, v]) => ({
      label: t(`nc.severity.${k}`, { defaultValue: k }),
      value: v,
      color: colors[k] ?? MOD.muted,
    })).sort((a, b) => b.value - a.value);
  }, [ncs, t]);

  const docByType = useMemo(() => {
    const colors = [MOD.documents, MOD.tests, MOD.subcontractors, MOD.plans, MOD.nc, MOD.suppliers, MOD.projects];
    return docMetrics.map((d, i) => ({
      name: t(`documents.docTypes.${d.doc_type}`, { defaultValue: d.doc_type }),
      value: d.total,
      color: colors[i % colors.length],
    })).sort((a, b) => b.value - a.value);
  }, [docMetrics, t]);

  const wiByDiscipline = useMemo(() => {
    const map: Record<string, number> = {};
    workItems.forEach(w => {
      const disc = w.disciplina ?? "geral";
      map[disc] = (map[disc] ?? 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({
      label: t(`workItems.disciplines.${k}`, { defaultValue: k }),
      value: v,
      color: MOD.projects,
    })).sort((a, b) => b.value - a.value);
  }, [workItems, t]);

  const testsByType = useMemo(() => {
    return qualityMetrics.map(q => ({
      label: q.test_name,
      value: q.total,
      color: MOD.tests,
    })).sort((a, b) => b.value - a.value);
  }, [qualityMetrics]);

  const failureByMaterial = useMemo(() => {
    const map: Record<string, { fail: number; total: number }> = {};
    qualityMetrics.forEach(q => {
      const mat = q.disciplina ?? t("common.noData");
      if (!map[mat]) map[mat] = { fail: 0, total: 0 };
      map[mat].fail += q.non_conform;
      map[mat].total += q.total;
    });
    return Object.entries(map).filter(([, v]) => v.total > 0).map(([k, v]) => ({
      label: k,
      value: Math.round((v.fail / v.total) * 100),
      color: MOD.nc,
    })).sort((a, b) => b.value - a.value);
  }, [qualityMetrics, t]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-muted-foreground/60">{t("dashboard.welcome")}</p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {activeProject ? t("dashboard.subtitleProject", { project: activeProject.name }) : t("dashboard.subtitle")}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card shadow-card px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Atlas QMS</span>
        </div>
      </div>

      {!activeProject && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card shadow-card px-5 py-3.5">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t("dashboard.noProjectSelected")}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
         TABS: Executivo | Análise Avançada
      ══════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="executive" className="text-xs font-semibold uppercase tracking-wider">{t("dashboard.tabs.executive")}</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs font-semibold uppercase tracking-wider">{t("dashboard.tabs.advanced")}</TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════
           EXECUTIVE DASHBOARD
        ═════════════════════════════════════════════════════════ */}
        <TabsContent value="executive" className="space-y-6 mt-0">

          {/* ── Row 0: Global Health Indicators ─────────────── */}
          {activeProject && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KPICard label={t("health.ncOverdue")} value={projectHealth.total_nc_overdue} icon={AlertTriangle} loading={healthLoading} color={projectHealth.total_nc_overdue > 0 ? "#ef4444" : MOD.muted} sub={`${projectHealth.total_nc_open} ${t("health.ncOpen").toLowerCase()}`} severity="negative" />
              <KPICard label={t("health.testsFail30d")} value={projectHealth.total_tests_fail_30d} icon={FlaskConical} loading={healthLoading} color={projectHealth.total_tests_fail_30d > 0 ? "#ef4444" : MOD.muted} sub={`${projectHealth.total_tests_pending} ${t("health.testsPending").toLowerCase()}`} severity="negative" />
              <KPICard label={t("health.docsExpired")} value={projectHealth.total_documents_expired} icon={FileText} loading={healthLoading} color={projectHealth.total_documents_expired > 0 ? "#f59e0b" : MOD.muted} sub={`${projectHealth.total_calibrations_expired} ${t("health.calibExpired").toLowerCase()}`} severity="attention" />
              <KPICard label={t("health.activitiesBlocked")} value={projectHealth.activities_blocked} icon={Ban} loading={healthLoading} color={projectHealth.activities_blocked > 0 ? "#ef4444" : MOD.muted} sub={`${projectHealth.total_ppi_pending} ${t("health.ppiPending").toLowerCase()}`} severity="negative" />
              {/* Health Score Gauge */}
              <Card className="border-0 bg-card shadow-card hover:shadow-card-hover transition-all duration-200 animate-fade-in overflow-hidden relative" style={{ borderLeft: `4px solid ${projectHealth.health_score >= 70 ? "#22c55e" : projectHealth.health_score >= 40 ? "#f59e0b" : "#ef4444"}` }}>
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: projectHealth.health_score >= 70 ? "#22c55e" : projectHealth.health_score >= 40 ? "#f59e0b" : "#ef4444" }} />
                <CardContent className="p-5 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground leading-none mb-3">{t("health.score")}</p>
                  <div className="relative w-[100px] h-[55px]">
                    <ResponsiveContainer width="100%" height={55}>
                      <PieChart>
                        <Pie
                          data={[
                            { value: projectHealth.health_score },
                            { value: 100 - projectHealth.health_score },
                          ]}
                          cx="50%"
                          cy="100%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={30}
                          outerRadius={48}
                          dataKey="value"
                          strokeWidth={0}
                          isAnimationActive
                          animationDuration={700}
                        >
                          <Cell fill={projectHealth.health_score >= 70 ? "#22c55e" : projectHealth.health_score >= 40 ? "#f59e0b" : "#ef4444"} />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-end justify-center pb-0 pointer-events-none">
                      <span className="text-xl font-black tabular-nums text-foreground">{healthLoading ? "—" : `${projectHealth.health_score}%`}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Row 1: Critical Indicators ──────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard label={t("dashboard.exec.wiOpen")} value={summary.wi_in_progress} icon={Construction} loading={loading} color={MOD.projects} sub={`${summary.wi_total} total`} severity="positive" />
            <KPICard label={t("dashboard.exec.ppiPending")} value={summary.ppi_submitted} icon={ClipboardCheck} loading={loading} color={MOD.subcontractors} sub={`${summary.ppi_approved} ${t("dashboard.kpi.approved").toLowerCase()}`} severity="attention" />
            <KPICard label={t("dashboard.exec.testsNC")} value={summary.tests_non_conform} icon={FlaskConical} loading={loading} color={MOD.nc} sub={`${summary.tests_total} total`} severity="negative" />
            <KPICard label={t("dashboard.exec.ncOpen")} value={summary.nc_open} icon={AlertTriangle} loading={loading} color={MOD.nc} sub={`${summary.nc_closed} ${t("dashboard.kpi.ncClosed").toLowerCase()}`} severity="negative" />
          </div>

          {/* ── Row 1b: Supplier Indicators ──────────────────────── */}
          {kpis && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <KPICard label={t("dashboard.exec.suppliersPendingQual")} value={kpis.suppliers_pending_qualification} icon={Truck} loading={supLoading} color={MOD.suppliers} sub={`${kpis.suppliers_active} ${t("suppliers.status.active").toLowerCase()}`} severity="attention" />
              <KPICard label={t("dashboard.exec.supplierDocsExpiring")} value={kpis.supplier_docs_expiring_30d} icon={FileText} loading={supLoading} color={kpis.supplier_docs_expiring_30d > 0 ? MOD.subcontractors : MOD.suppliers} sub={`${kpis.supplier_docs_expired} ${t("suppliers.detail.docsExpired").toLowerCase()}`} severity="attention" />
              <KPICard label={t("dashboard.exec.suppliersWithNC")} value={kpis.suppliers_with_open_nc} icon={AlertTriangle} loading={supLoading} color={kpis.suppliers_with_open_nc > 0 ? MOD.nc : MOD.suppliers} sub={`${kpis.suppliers_total} total`} severity="negative" />
            </div>
          )}

          {/* ── Row 1c: Material Indicators ──────────────────────── */}
          {matKpis && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <KPICard label={t("dashboard.exec.materialsDocsExpired")} value={matKpis.materials_with_expired_docs} icon={Package} loading={matLoading} color={matKpis.materials_with_expired_docs > 0 ? MOD.subcontractors : MOD.suppliers} sub={`${matKpis.materials_active} ${t("materials.status.active").toLowerCase()}`} severity="negative" />
              <KPICard label={t("dashboard.exec.materialsWithNC")} value={matKpis.materials_with_open_nc} icon={Package} loading={matLoading} color={matKpis.materials_with_open_nc > 0 ? MOD.nc : MOD.suppliers} sub={`${matKpis.materials_total} total`} severity="negative" />
              <KPICard label={t("dashboard.exec.materialsNonconformTests")} value={matKpis.materials_with_nonconform_tests_30d} icon={Package} loading={matLoading} color={matKpis.materials_with_nonconform_tests_30d > 0 ? MOD.nc : MOD.suppliers} sub={`${matKpis.materials_total} total`} severity="negative" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <PercentCard label={t("dashboard.exec.ppiConform")} value={summary.ppi_conform_pct} loading={loading} color={MOD.suppliers} icon={ClipboardCheck} sub={`${summary.ppi_approved}/${summary.ppi_total}`} />
            <PercentCard label={t("dashboard.exec.testsConform")} value={summary.tests_conform_pct} loading={loading} color={MOD.tests} icon={FlaskConical} sub={`${summary.tests_completed} ${t("dashboard.stats.completed")}`} />
            <KPICard label={t("dashboard.exec.ncAging")} value={summary.nc_avg_aging} icon={Timer} loading={loading} color={summary.nc_avg_aging > 30 ? MOD.nc : summary.nc_avg_aging > 14 ? MOD.subcontractors : MOD.suppliers} suffix={t("dashboard.kpi.days")} sub={t("dashboard.kpi.openNcCount", { count: summary.nc_open })} severity="negative" />
            <KPICard label={t("dashboard.exec.docsReview")} value={summary.docs_in_review} icon={FileText} loading={loading} color={MOD.documents} sub={`${summary.docs_total} total`} severity="attention" />
          </div>

          {/* ── Row 3: 6-Month Trends ──────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TrendChart
              title={t("dashboard.charts.ncTrend")}
              data={ncMonthly}
              loading={loading}
              icon={TrendingUp}
              emptyMsg={emptyMsg}
              bars={[
                { key: "opened", color: MOD.nc, label: t("dashboard.kpi.ncOpened") },
                { key: "closed", color: MOD.suppliers, label: t("dashboard.kpi.ncClosed") },
              ]}
            />
            <TrendChart
              title={t("dashboard.charts.testsTrend")}
              data={testsMonthly}
              loading={loading}
              icon={FlaskConical}
              emptyMsg={emptyMsg}
              bars={[
                { key: "conform", color: "#22c55e", label: t("dashboard.exec.conform") },
                { key: "non_conform", color: "#ef4444", label: t("dashboard.exec.nonConform") },
              ]}
            />
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════
           ADVANCED ANALYSIS
        ═════════════════════════════════════════════════════════ */}
        <TabsContent value="advanced" className="space-y-6 mt-0">
          <Tabs defaultValue="quality" className="space-y-5">
            <TabsList className="bg-muted/50 border border-border">
              <TabsTrigger value="quality" className="text-xs">{t("dashboard.adv.quality")}</TabsTrigger>
              <TabsTrigger value="documental" className="text-xs">{t("dashboard.adv.documental")}</TabsTrigger>
              <TabsTrigger value="ncRisk" className="text-xs">{t("dashboard.adv.ncRisk")}</TabsTrigger>
              <TabsTrigger value="operational" className="text-xs">{t("dashboard.adv.operational")}</TabsTrigger>
            </TabsList>

            {/* ── A. Quality ─────────────────────────────────────── */}
            <TabsContent value="quality" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <HBarList title={t("dashboard.adv.testsByType")} data={testsByType} loading={loading} icon={FlaskConical} emptyMsg={emptyMsg} />
                <HBarList title={t("dashboard.adv.failureByMaterial")} data={failureByMaterial} loading={loading} icon={Target} emptyMsg={emptyMsg} />
              </div>
              <TrendChart
                title={t("dashboard.charts.testsTrend")}
                data={testsMonthly}
                loading={loading}
                icon={BarChart3}
                emptyMsg={emptyMsg}
              bars={[
                { key: "conform", color: "#22c55e", label: t("dashboard.exec.conform") },
                { key: "non_conform", color: "#ef4444", label: t("dashboard.exec.nonConform") },
              ]}
              />
            </TabsContent>

            {/* ── B. Documental ───────────────────────────────────── */}
            <TabsContent value="documental" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <DonutCard
                  title={t("dashboard.adv.docsByType")}
                  data={docByType}
                  loading={loading}
                  icon={FileText}
                  total={docMetrics.reduce((s, d) => s + d.total, 0)}
                  emptyMsg={emptyMsg}
                />
                <HBarList
                  title={t("dashboard.adv.avgApproval")}
                  data={docMetrics.map((d) => ({
                    label: t(`documents.docTypes.${d.doc_type}`, { defaultValue: d.doc_type }),
                    value: d.avg_approval_days,
                    color: MOD.documents,
                  })).sort((a, b) => b.value - a.value)}
                  loading={loading}
                  icon={Clock}
                  emptyMsg={emptyMsg}
                />
              </div>
            </TabsContent>

            {/* ── C. NC & Risco ───────────────────────────────────── */}
            <TabsContent value="ncRisk" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <HBarList title={t("dashboard.adv.ncByDiscipline")} data={ncByDiscipline} loading={ncLoading || wiLoading} icon={AlertTriangle} emptyMsg={emptyMsg} />
                <HBarList title={t("dashboard.adv.ncBySupplier")} data={ncBySupplier} loading={ncLoading || supLoading} icon={Building2} emptyMsg={emptyMsg} />
                <HBarList title={t("dashboard.adv.ncBySeverity")} data={ncBySeverity} loading={ncLoading} icon={Activity} emptyMsg={emptyMsg} />
                <DonutCard
                  title={t("dashboard.adv.ncBySeverity")}
                  data={(() => {
                    const sevColors: Record<string, string> = { critical: "#ef4444", major: "#f97316", minor: "#f59e0b", low: "#22c55e" };
                    const map: Record<string, number> = {};
                    ncs.filter(n => ["open", "in_progress"].includes((n as any).status)).forEach(n => {
                      const sev = (n as any).severity ?? "medium";
                      map[sev] = (map[sev] ?? 0) + 1;
                    });
                    return Object.entries(map).map(([k, v]) => ({
                      name: t(`nc.severity.${k}`, { defaultValue: k }),
                      value: v,
                      color: sevColors[k] ?? "#94a3b8",
                    }));
                  })()}
                  loading={ncLoading}
                  icon={PieChartIcon}
                  total={ncs.filter(n => ["open", "in_progress"].includes((n as any).status)).length}
                  emptyMsg={emptyMsg}
                />
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="md:col-span-2">
                  <TrendChart
                    title={t("dashboard.charts.ncTrend")}
                    data={ncMonthly}
                    loading={loading}
                    icon={TrendingUp}
                    emptyMsg={emptyMsg}
                    bars={[
                      { key: "opened", color: MOD.nc, label: t("dashboard.kpi.ncOpened") },
                      { key: "closed", color: MOD.suppliers, label: t("dashboard.kpi.ncClosed") },
                    ]}
                  />
                </div>
                <KPICard label={t("dashboard.kpi.ncLeadTimeTitle")} value={summary.nc_avg_lead_time} icon={Hourglass} loading={loading} color={summary.nc_avg_lead_time > 30 ? MOD.nc : MOD.suppliers} suffix={t("dashboard.kpi.daysToClose")} sub={t("dashboard.kpi.closedNcCount", { count: summary.nc_closed })} severity="negative" />
              </div>
            </TabsContent>

            {/* ── D. Operacional ──────────────────────────────────── */}
            <TabsContent value="operational" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <HBarList title={t("dashboard.adv.wiByDiscipline")} data={wiByDiscipline} loading={wiLoading} icon={Construction} emptyMsg={emptyMsg} />
                <div className="grid gap-4">
                  <PercentCard label={t("dashboard.exec.ppiConform")} value={summary.ppi_conform_pct} loading={loading} color={MOD.suppliers} icon={ClipboardCheck} sub={`${summary.ppi_approved} / ${summary.ppi_total}`} />
                  <KPICard label={t("dashboard.exec.ppiPending")} value={summary.ppi_submitted} icon={ClipboardCheck} loading={loading} color={MOD.subcontractors} severity="attention" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

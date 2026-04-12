import { useCallback, useEffect, useMemo, useState } from "react";
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
  ClipboardCheck, FlaskConical, Clock, ArrowRight, Leaf, FileBarChart2, Bell,
  ClipboardList, Zap, Calendar, ShieldCheck, TrendingUp,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { HealthGauge } from "@/components/dashboard/HealthGauge";
import { HealthScoreSheet } from "@/components/dashboard/HealthScoreSheet";
import { SparklineKPI } from "@/components/dashboard/SparklineKPI";
import { CriticalAlertsBanner } from "@/components/dashboard/CriticalAlertsBanner";
import { NCTrendChart } from "@/components/dashboard/NCTrendChart";
import { WorkProgressChart } from "@/components/dashboard/WorkProgressChart";
import { PPIProgressChart } from "@/components/dashboard/PPIProgressChart";
import { ModuleShortcuts } from "@/components/dashboard/ModuleShortcuts";
import { ConformityByFrenteChart } from "@/components/dashboard/ConformityByFrenteChart";
import { TestStatusCard } from "@/components/dashboard/TestStatusCard";
import { ConcreteByClassCard } from "@/components/dashboard/ConcreteByClassCard";
import { SgqKpiCards } from "@/components/dashboard/SgqKpiCards";
import { cn } from "@/lib/utils";

// ── Semaphore logic ───────────────────────────────────────────────
function ncSemaphore(v: number) { return v === 0 ? "145 55% 42%" : v <= 3 ? "38 85% 50%" : "0 65% 50%"; }
function pameSemaphore(v: number) { return v === 0 ? "145 55% 42%" : v <= 15 ? "38 85% 50%" : "0 65% 50%"; }
function ppiInProgressSemaphore(v: number) { return v === 0 ? "145 55% 42%" : "210 65% 50%"; }
function testsOverdueSemaphore(v: number) { return v === 0 ? "145 55% 42%" : "0 65% 50%"; }

// ── Activity icon/color ───────────────────────────────────────────
const ACTIVITY_CFG: Record<string, { icon: React.ElementType; cls: string }> = {
  nc:   { icon: AlertTriangle,  cls: "text-destructive" },
  lot:  { icon: Package,        cls: "text-primary" },
  ppi:  { icon: ClipboardCheck, cls: "text-emerald-600" },
  test: { icon: FlaskConical,   cls: "text-amber-500" },
};

// ── HP Pending Alert ──────────────────────────────────────────
function HPPendingAlert({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("hp_notifications")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "pending");
      setCount(c ?? 0);
    })();
  }, [projectId]);

  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border animate-fade-in bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400 cursor-pointer"
      onClick={() => navigate("/deadlines")}
    >
      <Bell className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm flex-1">
        {t("dashboard.hpPending", { defaultValue: "HPs Sem Confirmação" })}: <strong>{count}</strong>
      </span>
      <ArrowRight className="h-3 w-3" />
    </div>
  );
}

// ── Monthly Report Deadline Alert ─────────────────────────────────
function MonthlyReportAlert({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [show, setShow] = useState<{ overdue: boolean; days: number; deadline: Date } | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const { data } = await (supabase as any)
        .from("monthly_quality_reports")
        .select("id")
        .eq("project_id", projectId)
        .neq("status", "draft")
        .gte("reference_month", prevMonth.toISOString().slice(0, 10))
        .lt("reference_month", new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
        .limit(1);

      if (data && data.length > 0) { setShow(null); return; }

      let wd = 0;
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      while (wd < 5) { const dow = d.getDay(); if (dow !== 0 && dow !== 6) wd++; if (wd < 5) d.setDate(d.getDate() + 1); }
      const daysUntil = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      if (daysUntil < -30) { setShow(null); return; }
      setShow({ overdue: daysUntil < 0, days: daysUntil, deadline: d });
    })();
  }, [projectId]);

  if (!show) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border animate-fade-in ${
        show.overdue
          ? "bg-destructive/5 border-destructive/30 text-destructive"
          : "bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400"
      }`}
    >
      <FileBarChart2 className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm flex-1">
        {show.overdue
          ? `🔴 ${t("dashboard.monthlyReport.overdue", { days: Math.abs(show.days), defaultValue: `Relatório Mensal SGQ em atraso — ${Math.abs(show.days)} dias` })}`
          : `⚠️ ${t("dashboard.monthlyReport.upcoming", { date: show.deadline.toLocaleDateString(), defaultValue: `Relatório Mensal SGQ — entregar até ${show.deadline.toLocaleDateString()}` })}`}
      </span>
      <button
        onClick={() => navigate("/reports/monthly")}
        className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
      >
        {t("dashboard.monthlyReport.create", { defaultValue: "Criar Relatório" })}
      </button>
    </div>
  );
}

// ── Semaphore Module Card (mobile-first, app-like) ────────────────
interface ModuleStatusCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total?: number;
  status: "green" | "amber" | "red";
  subtitle?: string;
  route: string;
  loading?: boolean;
}

function ModuleStatusCard({ icon: Icon, label, value, total, status, subtitle, route, loading }: ModuleStatusCardProps) {
  const navigate = useNavigate();
  const statusColors = {
    green: { bg: "hsl(145 55% 42% / 0.08)", border: "hsl(145 55% 42% / 0.25)", dot: "hsl(145 55% 42%)" },
    amber: { bg: "hsl(38 85% 50% / 0.08)", border: "hsl(38 85% 50% / 0.25)", dot: "hsl(38 85% 50%)" },
    red:   { bg: "hsl(0 65% 50% / 0.08)", border: "hsl(0 65% 50% / 0.25)", dot: "hsl(0 65% 50%)" },
  };
  const c = statusColors[status];

  return (
    <Card
      className="cursor-pointer hover:shadow-card-hover transition-all border-border group active:scale-[0.98]"
      onClick={() => navigate(route)}
    >
      <CardContent className="p-4 flex items-center gap-3.5">
        {/* Status dot + icon */}
        <div className="relative flex-shrink-0">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform group-hover:scale-105"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
          >
            <Icon className="h-5 w-5" style={{ color: c.dot }} />
          </div>
          {/* Semaphore dot */}
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
            style={{ backgroundColor: c.dot }}
          />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-0.5" />
          ) : (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black tabular-nums text-foreground leading-none">{value}</span>
              {total !== undefined && (
                <span className="text-xs text-muted-foreground font-medium">/ {total}</span>
              )}
            </div>
          )}
          {subtitle && <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{subtitle}</p>}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-all flex-shrink-0" />
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { data: kpis, loading: kpiLoading, refetch } = useDashboardKpis();
  const { summary, ncMonthly, testsMonthly, loading: viewsLoading } = useDashboardViews();
  const { health, loading: healthLoading } = useProjectHealth(activeProject?.id);
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);

  // Period filter state
  const [period, setPeriod] = useState<string>("all");

  // Realtime subscriptions
  const refetchAll = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeProject("non_conformities", refetchAll);
  useRealtimeProject("materials", refetchAll);
  useRealtimeProject("ppi_instances", refetchAll);
  useRealtimeProject("hp_notifications", refetchAll);
  useRealtimeProject("test_results", refetchAll);
  useRealtimeProject("weld_records", refetchAll);

  // Filter monthly data by period
  const filterByPeriod = useCallback(<T extends { month: string }>(data: T[]): T[] => {
    if (period === "all") return data;
    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case "3m": cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
      case "6m": cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1); break;
      case "12m": cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1); break;
      case "ytd": cutoff = new Date(now.getFullYear(), 0, 1); break;
      default: return data;
    }
    return data.filter(d => new Date(d.month) >= cutoff);
  }, [period]);

  const filteredNcMonthly = useMemo(() => filterByPeriod(ncMonthly), [ncMonthly, filterByPeriod]);
  const filteredTestsMonthly = useMemo(() => filterByPeriod(testsMonthly), [testsMonthly, filterByPeriod]);

  // Sparkline data from monthly views
  const ncSpark = useMemo(() => filteredNcMonthly.slice(-6).map(m => ({ v: m.opened })), [filteredNcMonthly]);
  const testsSpark = useMemo(() => filteredTestsMonthly.slice(-6).map(m => ({ v: m.conform + m.non_conform })), [filteredTestsMonthly]);

  const displayName = user?.email?.split("@")[0] ?? "—";

  if (!activeProject) return <NoProjectBanner />;

  // Derive semaphore statuses for module cards
  const ncStatus = kpis.ncOpen === 0 ? "green" as const : kpis.ncOpen <= 3 ? "amber" as const : "red" as const;
  const ppiPct = kpis.ppiTotal > 0 ? Math.round((kpis.ppiApproved / kpis.ppiTotal) * 100) : 0;
  const ppiStatus = kpis.ppiTotal === 0 ? "green" as const : ppiPct >= 80 ? "green" as const : ppiPct >= 50 ? "amber" as const : "red" as const;
  const testsPct = kpis.testsTotal > 0 ? Math.round((kpis.testsCompleted / kpis.testsTotal) * 100) : 0;
  const testsStatus = kpis.testsOverdue > 0 ? "red" as const : testsPct >= 70 ? "green" as const : "amber" as const;
  const matPct = kpis.matTotal > 0 ? Math.round((kpis.matApproved / kpis.matTotal) * 100) : 0;
  const matStatus = kpis.pamePending === 0 ? "green" as const : kpis.pamePending <= 5 ? "amber" as const : "red" as const;

  return (
    <div className="space-y-5 max-w-[1180px] mx-auto">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
        <div className="space-y-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-muted-foreground/60">
            {t("dashboard.welcome")}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h1>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.subtitleProject", { project: activeProject.name })}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.period.all", { defaultValue: "Todo o período" })}</SelectItem>
              <SelectItem value="3m">{t("dashboard.period.3m", { defaultValue: "Últimos 3 meses" })}</SelectItem>
              <SelectItem value="6m">{t("dashboard.period.6m", { defaultValue: "Últimos 6 meses" })}</SelectItem>
              <SelectItem value="12m">{t("dashboard.period.12m", { defaultValue: "Últimos 12 meses" })}</SelectItem>
              <SelectItem value="ytd">{t("dashboard.period.ytd", { defaultValue: "Ano corrente" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TIER 1 — CRÍTICO (alertas que exigem acção imediata) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-destructive/60 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          {t("dashboard.tier.critical", { defaultValue: "Alertas Críticos" })}
        </p>

        <CriticalAlertsBanner
          ncOpen={kpis.ncOpen}
          ncOverdue={health.total_nc_overdue}
          emesExpiring={kpis.emesExpiring30d}
          pamePending={kpis.pamePending}
        />
        <MonthlyReportAlert projectId={activeProject.id} />
        <HPPendingAlert projectId={activeProject.id} />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TIER 2 — OPERACIONAL (estado actual dos módulos)     */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" />
          {t("dashboard.tier.operational", { defaultValue: "Estado Operacional" })}
        </p>

        {/* Health + Module Status Cards (app-like grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Health Score card */}
          <Card
            className="border border-border bg-card shadow-card flex flex-col items-center justify-center py-4 cursor-pointer hover:shadow-card-hover transition-all active:scale-[0.98] sm:col-span-2 lg:col-span-1"
            onClick={() => setHealthSheetOpen(true)}
          >
            <div className="scale-[0.8] origin-center">
              <HealthGauge
                score={health.health_score}
                status={health.health_status}
                loading={healthLoading}
              />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-1">
              {t("health.score", { defaultValue: "Health Score" })}
            </p>
          </Card>
          <HealthScoreSheet open={healthSheetOpen} onOpenChange={setHealthSheetOpen} health={health} loading={healthLoading} />

          {/* 4 Module status cards with semaphore */}
          <ModuleStatusCard
            icon={AlertTriangle}
            label={t("dashboard.module.nc", { defaultValue: "Não Conformidades" })}
            value={kpis.ncOpen}
            status={ncStatus}
            subtitle={kpis.ncOpen === 0 ? t("dashboard.module.ncOk", { defaultValue: "Nenhuma NC aberta" }) : t("dashboard.module.ncSub", { defaultValue: "abertas" })}
            route="/non-conformities"
            loading={kpiLoading}
          />
          <ModuleStatusCard
            icon={ClipboardCheck}
            label={t("dashboard.module.ppi", { defaultValue: "Inspecções PPI" })}
            value={kpis.ppiApproved}
            total={kpis.ppiTotal}
            status={ppiStatus}
            subtitle={`${ppiPct}% ${t("dashboard.module.approved", { defaultValue: "aprovados" })}`}
            route="/ppi"
            loading={kpiLoading}
          />
          <ModuleStatusCard
            icon={FlaskConical}
            label={t("dashboard.module.tests", { defaultValue: "Ensaios" })}
            value={kpis.testsCompleted}
            total={kpis.testsTotal}
            status={testsStatus}
            subtitle={kpis.testsOverdue > 0 ? `${kpis.testsOverdue} ${t("dashboard.module.overdue", { defaultValue: "em atraso" })}` : `${testsPct}% ${t("dashboard.module.complete", { defaultValue: "realizados" })}`}
            route="/tests"
            loading={kpiLoading}
          />
          <ModuleStatusCard
            icon={Package}
            label={t("dashboard.module.materials", { defaultValue: "Materiais (PAME)" })}
            value={kpis.matApproved}
            total={kpis.matTotal}
            status={matStatus}
            subtitle={kpis.pamePending > 0 ? `${kpis.pamePending} ${t("dashboard.module.pending", { defaultValue: "pendentes" })}` : t("dashboard.module.matOk", { defaultValue: "Todos aprovados" })}
            route="/materials"
            loading={kpiLoading}
          />
        </div>

        {/* KPI sparklines row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
            label={t("dashboard.kpi.ppiInProgress", { defaultValue: "PPIs em Curso" })}
            value={kpis.ppiInProgress}
            icon={ClipboardCheck}
            color={ppiInProgressSemaphore(kpis.ppiInProgress)}
            onClick={() => navigate("/ppi")}
            loading={kpiLoading}
          />
          <SparklineKPI
            label={t("dashboard.kpi.testsOverdue", { defaultValue: "Ensaios em Atraso" })}
            value={kpis.testsOverdue}
            icon={FlaskConical}
            color={testsOverdueSemaphore(kpis.testsOverdue)}
            onClick={() => navigate("/deadlines")}
            loading={kpiLoading}
          />
          <SparklineKPI
            label={t("dashboard.kpi.weldsPendingUt", { defaultValue: "Soldaduras sem US" })}
            value={kpis.weldsPendingUt}
            icon={Zap}
            color={kpis.weldsPendingUt > 0 ? "38 85% 50%" : "145 55% 42%"}
            onClick={() => navigate("/tests")}
            loading={kpiLoading}
          />
        </div>

        {/* SGQ KPI Cards */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("dashboard.sgqKpi.title", { defaultValue: "KPIs do SGQ — Anx. D" })}
          </p>
          <SgqKpiCards projectId={activeProject.id} />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TIER 3 — TENDÊNCIAS (gráficos e análise temporal)    */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />
          {t("dashboard.tier.trends", { defaultValue: "Tendências & Análise" })}
        </p>

        {/* 3 Main Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NCTrendChart data={filteredNcMonthly} loading={viewsLoading} />
          <WorkProgressChart />
          <PPIProgressChart />
        </div>

        {/* Progress Circles + Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
          {/* Left: 3 circular progress cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                label: t("dashboard.progress.materials", { defaultValue: "Materiais Aprovados (PAME)" }),
                approved: kpis.matApproved,
                total: kpis.matTotal,
                route: "/materials",
                colorVar: "--module-suppliers",
              },
            ].map((mod) => {
              const pct = mod.total > 0 ? Math.round((mod.approved / mod.total) * 100) : 0;
              const isEmpty = mod.total === 0;
              const strokeColor = isEmpty
                ? "hsl(var(--muted))"
                : pct >= 70
                  ? "hsl(145, 55%, 42%)"
                  : pct >= 40
                    ? "hsl(38, 85%, 50%)"
                    : "hsl(var(--muted-foreground))";
              return (
                <Card
                  key={mod.label}
                  className="border border-border bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all group active:scale-[0.98]"
                  onClick={() => navigate(mod.route)}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <svg width="52" height="52" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r="22" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                        {!isEmpty && (
                          <circle
                            cx="26" cy="26" r="22" fill="none"
                            stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${pct * 1.382} 138.2`}
                            transform="rotate(-90 26 26)"
                            className="transition-all duration-700 ease-out"
                          />
                        )}
                      </svg>
                      <span className={cn(
                        "absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums",
                        isEmpty ? "text-muted-foreground/40" : "text-foreground"
                      )}>
                        {kpiLoading ? "—" : isEmpty ? "—" : `${pct}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right: Recent Activity */}
          <Card className="border border-border bg-card shadow-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
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
                  {kpis.recentActivity.slice(0, 5).map((item, idx) => {
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

        {/* Test Status + Concrete by Class */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TestStatusCard />
          <ConcreteByClassCard />
        </div>

        {/* Conformity by Frente */}
        <ConformityByFrenteChart />
      </div>

      {/* ── Quick Access Widgets ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
        <Card className="cursor-pointer hover:shadow-sm transition-shadow active:scale-[0.99]" onClick={() => navigate("/expirations")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("nav.expirations", { defaultValue: "Expirações" })}
              </span>
              <Badge variant={kpis.emesExpiring30d > 0 ? "destructive" : "secondary"} className="ml-auto text-[10px]">
                {kpiLoading ? "—" : kpis.emesExpiring30d}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.expirations.subtitle", { defaultValue: "Documentos e calibrações a expirar nos próximos 30 dias" })}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-sm transition-shadow active:scale-[0.99]" onClick={() => navigate("/recycled-materials")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("recycled.dashboard.widget", { defaultValue: "PPGRCD — Reciclados" })}</span>
              <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("recycled.kpi.target", { defaultValue: "Meta PPGRCD" })}: 5%</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "220ms", animationFillMode: "both" }}>
        {[
          {
            icon: ClipboardList,
            label: t("dashboard.kpi.dailyReports", { defaultValue: "Partes Diárias" }),
            value: kpis.dailyReportsTotal,
            sub: t("dashboard.kpi.dailyReportsValidated", { defaultValue: `${kpis.dailyReportsValidated} validadas` }),
            color: "hsl(210, 65%, 50%)",
            route: "/daily-reports",
          },
          {
            icon: Crosshair,
            label: t("dashboard.kpi.topoControls", { defaultValue: "Controlos Topográficos" }),
            value: kpis.topoControlsTotal,
            sub: kpis.topoControlsTotal > 0
              ? `${Math.round((kpis.topoControlsConforme / kpis.topoControlsTotal) * 100)}% conformes`
              : t("common.noData", { defaultValue: "Sem dados" }),
            color: kpis.topoControlsTotal > 0 && kpis.topoControlsConforme === kpis.topoControlsTotal
              ? "hsl(145, 55%, 42%)"
              : "hsl(38, 85%, 50%)",
            route: "/topography",
          },
          {
            icon: ClipboardCheck,
            label: t("dashboard.kpi.ppiTotal", { defaultValue: "PPIs Registados" }),
            value: kpis.ppiTotal,
            sub: t("dashboard.kpi.ppiApproved", { defaultValue: `${kpis.ppiApproved} aprovados` }),
            color: kpis.ppiApproved === kpis.ppiTotal && kpis.ppiTotal > 0
              ? "hsl(145, 55%, 42%)"
              : "hsl(210, 65%, 50%)",
            route: "/ppi",
          },
          {
            icon: Zap,
            label: t("dashboard.kpi.weldsPendingUtShort", { defaultValue: "Soldaduras s/ US" }),
            value: kpis.weldsPendingUt,
            sub: kpis.weldsPendingUt === 0
              ? t("common.ok", { defaultValue: "Tudo inspeccionado" })
              : t("dashboard.kpi.pendingInspection", { defaultValue: "Pendentes de inspecção" }),
            color: kpis.weldsPendingUt > 0 ? "hsl(0, 65%, 50%)" : "hsl(145, 55%, 42%)",
            route: "/tests",
          },
        ].map(({ icon: Icon, label, value, sub, color, route }) => (
          <Card key={label} className="cursor-pointer hover:shadow-md transition-all border-border bg-card active:scale-[0.98]"
            onClick={() => navigate(route)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black tabular-nums text-foreground leading-none">
                  {kpiLoading ? "—" : value}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground truncate mt-0.5">{label}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate">{kpiLoading ? "" : sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Module Shortcuts ───────────────────────────────── */}
      <div className="animate-fade-in" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
          {t("dashboard.modules", { defaultValue: "Módulos" })}
        </p>
        <ModuleShortcuts />
      </div>
    </div>
  );
}

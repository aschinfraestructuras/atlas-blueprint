import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS, CHART_STYLE, ChartTooltipContent } from "@/lib/chartTheme";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import {
  AlertTriangle, ClipboardCheck, FlaskConical, Activity,
  TrendingUp, Target, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────── */

interface NCAnalytics {
  byDiscipline: Array<{ name: string; value: number }>;
  byRootCause: Array<{ name: string; value: number }>;
  monthly: Array<{ label: string; opened: number; closed: number }>;
  bySeverity: Array<{ name: string; value: number; color: string }>;
  avgClosureDays: number;
  efficacyRate: number;
  mttrBySeverity: Array<{ severity: string; days: number; color: string }>;
}

interface PPIAnalytics {
  conformityRate: number;
  byPointType: Array<{ type: string; rate: number; total: number; ok: number }>;
  byStatus: Array<{ name: string; value: number }>;
  topNok: Array<{ label: string; count: number }>;
}

interface TestsAnalytics {
  monthly: Array<{ label: string; pass: number; fail: number }>;
  conformityRate: number;
  totalTests: number;
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

function lastSixMonths(): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
    out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

function monthKey(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function topN<T extends { name: string; value: number }>(arr: T[], n: number): T[] {
  return [...arr].sort((a, b) => b.value - a.value).slice(0, n);
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  major: "Maior",
  minor: "Menor",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em Curso",
  approved: "Aprovado",
  rejected: "Rejeitado",
  closed: "Fechado",
  completed: "Concluído",
};

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function QualityAnalyticsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { role, loading: roleLoading } = useProjectRole();

  const [loading, setLoading] = useState(true);
  const [nc, setNc] = useState<NCAnalytics | null>(null);
  const [ppi, setPpi] = useState<PPIAnalytics | null>(null);
  const [tests, setTests] = useState<TestsAnalytics | null>(null);

  const allowedRoles = ["admin", "project_manager", "quality_manager"];
  const isAllowed = !roleLoading && role && allowedRoles.includes(role);

  useEffect(() => {
    if (!activeProject || !isAllowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const pid = activeProject.id;
      const months = lastSixMonths();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sinceIso = sixMonthsAgo.toISOString();

      // 1) Get PPI instance IDs for this project first
      const { data: ppiInstancesData } = await supabase
        .from("ppi_instances")
        .select("id, status")
        .eq("project_id", pid)
        .eq("is_deleted", false)
        .limit(2000);
      const ppiInstanceIds = (ppiInstancesData ?? []).map((i: any) => i.id);

      const results = await Promise.allSettled([
        // [0] NCs
        supabase
          .from("non_conformities")
          .select("id, severity, status, discipline, root_cause, detected_at, closure_date, ac_efficacy_indicator")
          .eq("project_id", pid)
          .eq("is_deleted", false)
          .limit(2000),
        // [1] PPI items (filtered by instance IDs from this project)
        ppiInstanceIds.length > 0
          ? supabase
              .from("ppi_instance_items")
              .select("id, result, label, inspection_point_type")
              .in("instance_id", ppiInstanceIds)
              .limit(5000)
          : Promise.resolve({ data: [], error: null } as any),
        // [2] Tests
        supabase
          .from("test_results")
          .select("id, date, result_status")
          .eq("project_id", pid)
          .gte("date", sinceIso.slice(0, 10))
          .limit(5000),
      ]);

      const ppiInstances = ppiInstancesData ?? [];

      if (cancelled) return;

      // ─── SECÇÃO A: NCs ────────────────────────────────────────────
      if (results[0].status === "fulfilled" && results[0].value.data) {
        const ncs = results[0].value.data as Array<{
          severity: string | null;
          status: string | null;
          discipline: string | null;
          root_cause: string | null;
          detected_at: string | null;
          closure_date: string | null;
          ac_efficacy_indicator: string | null;
        }>;

        // Por disciplina
        const discMap = new Map<string, number>();
        for (const n of ncs) {
          const k = (n.discipline || "—").trim();
          discMap.set(k, (discMap.get(k) || 0) + 1);
        }
        const byDiscipline = topN(
          [...discMap.entries()].map(([name, value]) => ({ name, value })),
          8,
        );

        // Por causa raiz
        const rcMap = new Map<string, number>();
        for (const n of ncs) {
          const k = (n.root_cause || "Não definida").trim();
          rcMap.set(k, (rcMap.get(k) || 0) + 1);
        }
        const byRootCause = topN(
          [...rcMap.entries()].map(([name, value]) => ({ name: name.length > 28 ? name.slice(0, 28) + "…" : name, value })),
          6,
        );

        // Mensal
        const monthlyMap = new Map<string, { opened: number; closed: number }>();
        for (const m of months) monthlyMap.set(m.key, { opened: 0, closed: 0 });
        for (const n of ncs) {
          const ko = monthKey(n.detected_at);
          if (ko && monthlyMap.has(ko)) monthlyMap.get(ko)!.opened++;
          const kc = monthKey(n.closure_date);
          if (kc && monthlyMap.has(kc)) monthlyMap.get(kc)!.closed++;
        }
        const monthly = months.map((m) => ({
          label: m.label,
          opened: monthlyMap.get(m.key)!.opened,
          closed: monthlyMap.get(m.key)!.closed,
        }));

        // Severidade
        const sevMap = new Map<string, number>();
        for (const n of ncs) {
          const k = (n.severity || "minor").toLowerCase();
          sevMap.set(k, (sevMap.get(k) || 0) + 1);
        }
        const sevColors: Record<string, string> = {
          critical: CHART_COLORS.danger,
          major: CHART_COLORS.warning,
          minor: CHART_COLORS.muted,
        };
        const bySeverity = ["critical", "major", "minor"]
          .filter((k) => sevMap.has(k))
          .map((k) => ({
            name: SEVERITY_LABELS[k] || k,
            value: sevMap.get(k)!,
            color: sevColors[k],
          }));

        // Tempo médio de encerramento
        const closureDays: number[] = [];
        const mttrBuckets: Record<string, number[]> = { critical: [], major: [], minor: [] };
        for (const n of ncs) {
          if (n.detected_at && n.closure_date) {
            const d1 = new Date(n.detected_at).getTime();
            const d2 = new Date(n.closure_date).getTime();
            const days = (d2 - d1) / 86400000;
            if (days >= 0) {
              closureDays.push(days);
              const sev = (n.severity || "minor").toLowerCase();
              if (mttrBuckets[sev]) mttrBuckets[sev].push(days);
            }
          }
        }
        const avgClosureDays = closureDays.length
          ? Math.round(closureDays.reduce((a, b) => a + b, 0) / closureDays.length)
          : 0;

        const mttrBySeverity = Object.entries(mttrBuckets)
          .filter(([, arr]) => arr.length > 0)
          .map(([sev, arr]) => ({
            severity: SEVERITY_LABELS[sev] || sev,
            days: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
            color: sevColors[sev],
          }));

        // Eficácia
        const closedWithEval = ncs.filter((n) => n.ac_efficacy_indicator);
        const effective = closedWithEval.filter((n) => n.ac_efficacy_indicator === "effective").length;
        const efficacyRate = closedWithEval.length
          ? Math.round((effective / closedWithEval.length) * 100)
          : 0;

        setNc({
          byDiscipline,
          byRootCause,
          monthly,
          bySeverity,
          avgClosureDays,
          efficacyRate,
          mttrBySeverity,
        });
      } else {
        setNc({
          byDiscipline: [], byRootCause: [], monthly: [], bySeverity: [],
          avgClosureDays: 0, efficacyRate: 0, mttrBySeverity: [],
        });
      }

      // ─── SECÇÃO B: PPI ────────────────────────────────────────────
      const ppiItems = results[1].status === "fulfilled" ? (results[1].value.data ?? []) as any[] : [];
      const ppiInstances = results[2].status === "fulfilled" ? (results[2].value.data ?? []) as any[] : [];
      const checkpoints = results[3].status === "fulfilled" ? (results[3].value.data ?? []) as any[] : [];

      // Mapa label -> point_type
      const cpTypeMap = new Map<string, string>();
      for (const cp of checkpoints) {
        if (cp.label && cp.point_type) cpTypeMap.set(cp.label, cp.point_type);
      }

      // Conformidade geral
      const verifiable = ppiItems.filter((it) => it.result === "ok" || it.result === "nok");
      const okCount = ppiItems.filter((it) => it.result === "ok").length;
      const conformityRate = verifiable.length
        ? Math.round((okCount / verifiable.length) * 100)
        : 0;

      // Por tipo de ponto — agora vem directamente em inspection_point_type
      const typeMap = new Map<string, { ok: number; total: number }>();
      for (const it of ppiItems) {
        if (it.result !== "ok" && it.result !== "nok") continue;
        const type = (it.inspection_point_type || "RP").toUpperCase();
        if (!typeMap.has(type)) typeMap.set(type, { ok: 0, total: 0 });
        const b = typeMap.get(type)!;
        b.total++;
        if (it.result === "ok") b.ok++;
      }
      const byPointType = ["HP", "RP", "WP"]
        .filter((tp) => typeMap.has(tp))
        .map((tp) => {
          const b = typeMap.get(tp)!;
          return {
            type: tp,
            ok: b.ok,
            total: b.total,
            rate: b.total ? Math.round((b.ok / b.total) * 100) : 0,
          };
        });

      // Por estado
      const statusMap = new Map<string, number>();
      for (const inst of ppiInstances) {
        const s = (inst.status || "draft").toLowerCase();
        statusMap.set(s, (statusMap.get(s) || 0) + 1);
      }
      const byStatus = [...statusMap.entries()].map(([k, v]) => ({
        name: STATUS_LABELS[k] || k,
        value: v,
      }));

      // Top NOK
      const nokMap = new Map<string, number>();
      for (const it of ppiItems) {
        if (it.result === "nok" && it.label) {
          const k = it.label.length > 50 ? it.label.slice(0, 50) + "…" : it.label;
          nokMap.set(k, (nokMap.get(k) || 0) + 1);
        }
      }
      const topNok = [...nokMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setPpi({ conformityRate, byPointType, byStatus, topNok });

      // ─── SECÇÃO C: Ensaios ────────────────────────────────────────
      if (results[2].status === "fulfilled" && (results[2].value as any).data) {
        const trs = (results[2].value as any).data as Array<{ date: string | null; result_status: string | null }>;

        const monthlyMap = new Map<string, { pass: number; fail: number }>();
        for (const m of months) monthlyMap.set(m.key, { pass: 0, fail: 0 });
        let pass = 0, fail = 0;
        for (const tr of trs) {
          const k = monthKey(tr.date);
          const status = (tr.result_status || "").toLowerCase();
          if (k && monthlyMap.has(k)) {
            if (status === "pass") { monthlyMap.get(k)!.pass++; pass++; }
            else if (status === "fail") { monthlyMap.get(k)!.fail++; fail++; }
          } else {
            if (status === "pass") pass++;
            else if (status === "fail") fail++;
          }
        }
        const monthly = months.map((m) => ({
          label: m.label,
          pass: monthlyMap.get(m.key)!.pass,
          fail: monthlyMap.get(m.key)!.fail,
        }));
        const totalTests = pass + fail;
        const conformityRate = totalTests ? Math.round((pass / totalTests) * 100) : 0;
        setTests({ monthly, conformityRate, totalTests });
      } else {
        setTests({ monthly: [], conformityRate: 0, totalTests: 0 });
      }

      setLoading(false);
    })().catch((e) => {
      console.error("[QualityAnalyticsPage]", e);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeProject, isAllowed]);

  if (!roleLoading && !isAllowed) {
    return <Navigate to="/" replace />;
  }

  if (!activeProject) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Activity}
          title={t("qualityAnalytics.noProject", { defaultValue: "Sem projecto activo" })}
          subtitle={t("qualityAnalytics.noProjectDesc", { defaultValue: "Seleccione uma obra para analisar." })}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1280px] mx-auto">
      <PageHeader
        icon={Activity}
        title={t("qualityAnalytics.title", { defaultValue: "Análise de Qualidade" })}
        subtitle={t("qualityAnalytics.subtitle", {
          defaultValue: "Indicadores analíticos consolidados de NCs, PPIs e Ensaios",
        })}
      />

      <Tabs defaultValue="nc" className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="nc" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("qualityAnalytics.tab.nc", { defaultValue: "Não Conformidades" })}</span>
            <span className="sm:hidden">NCs</span>
          </TabsTrigger>
          <TabsTrigger value="ppi" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("qualityAnalytics.tab.ppi", { defaultValue: "Inspecções" })}</span>
            <span className="sm:hidden">PPIs</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("qualityAnalytics.tab.tests", { defaultValue: "Ensaios" })}</span>
            <span className="sm:hidden">Ensaios</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB NCs ──────────────────────────────────────────────── */}
        <TabsContent value="nc" className="space-y-4 mt-6">
          {loading ? (
            <SectionSkeleton />
          ) : !nc || (nc.byDiscipline.length === 0 && nc.monthly.every((m) => m.opened === 0 && m.closed === 0)) ? (
            <EmptyState
              icon={AlertTriangle}
              title={t("qualityAnalytics.noNcData", { defaultValue: "Sem dados de não conformidades" })}
              subtitle={t("qualityAnalytics.noNcDataDesc", { defaultValue: "Não há registos suficientes para análise." })}
            />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  icon={Clock}
                  label={t("qualityAnalytics.kpi.avgClosure", { defaultValue: "Tempo médio de encerramento" })}
                  value={`${nc.avgClosureDays}d`}
                  color={CHART_COLORS.primary}
                />
                <KpiCard
                  icon={Target}
                  label={t("qualityAnalytics.kpi.efficacy", { defaultValue: "Eficácia de acções correctivas" })}
                  value={`${nc.efficacyRate}%`}
                  color={nc.efficacyRate >= 70 ? CHART_COLORS.success : CHART_COLORS.warning}
                />
                <KpiCard
                  icon={AlertTriangle}
                  label={t("qualityAnalytics.kpi.totalNc", { defaultValue: "Total de NCs (período)" })}
                  value={String(nc.monthly.reduce((a, b) => a + b.opened, 0))}
                  color={CHART_COLORS.danger}
                />
                <KpiCard
                  icon={CheckCircle2}
                  label={t("qualityAnalytics.kpi.totalClosed", { defaultValue: "NCs encerradas (período)" })}
                  value={String(nc.monthly.reduce((a, b) => a + b.closed, 0))}
                  color={CHART_COLORS.success}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title={t("qualityAnalytics.chart.byDiscipline", { defaultValue: "NCs por Disciplina (Top 8)" })}>
                  {nc.byDiscipline.length === 0 ? <MiniEmpty /> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={nc.byDiscipline} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid {...CHART_STYLE.grid} horizontal={false} />
                        <XAxis type="number" {...CHART_STYLE.axis} />
                        <YAxis type="category" dataKey="name" width={110} {...CHART_STYLE.axis} />
                        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title={t("qualityAnalytics.chart.byRootCause", { defaultValue: "Top Causas Raiz" })}>
                  {nc.byRootCause.length === 0 ? <MiniEmpty /> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={nc.byRootCause} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid {...CHART_STYLE.grid} horizontal={false} />
                        <XAxis type="number" {...CHART_STYLE.axis} />
                        <YAxis type="category" dataKey="name" width={140} {...CHART_STYLE.axis} />
                        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                        <Bar dataKey="value" fill={CHART_COLORS.warning} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title={t("qualityAnalytics.chart.monthly", { defaultValue: "Evolução Mensal (6 meses)" })}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={nc.monthly}>
                      <CartesianGrid {...CHART_STYLE.grid} />
                      <XAxis dataKey="label" {...CHART_STYLE.axis} />
                      <YAxis {...CHART_STYLE.axis} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={CHART_STYLE.tooltip.cursor} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Line type="monotone" dataKey="opened" name="Abertas" stroke={CHART_COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="closed" name="Encerradas" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t("qualityAnalytics.chart.bySeverity", { defaultValue: "Distribuição por Severidade" })}>
                  {nc.bySeverity.length === 0 ? <MiniEmpty /> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={nc.bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={85} paddingAngle={2}>
                          {nc.bySeverity.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              {nc.mttrBySeverity.length > 0 && (
                <ChartCard title={t("qualityAnalytics.chart.mttr", { defaultValue: "MTTR por Severidade (dias até encerrar)" })}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2">
                    {nc.mttrBySeverity.map((m) => (
                      <div key={m.severity} className="flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border/50 bg-muted/20">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{m.severity}</span>
                        <span className="text-3xl font-black tabular-nums" style={{ color: m.color }}>{m.days}</span>
                        <span className="text-[10px] text-muted-foreground">{t("qualityAnalytics.daysAvg", { defaultValue: "dias em média" })}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── TAB PPI ──────────────────────────────────────────────── */}
        <TabsContent value="ppi" className="space-y-4 mt-6">
          {loading ? (
            <SectionSkeleton />
          ) : !ppi || ppi.byStatus.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={t("qualityAnalytics.noPpiData", { defaultValue: "Sem dados de PPI" })}
              subtitle={t("qualityAnalytics.noPpiDataDesc", { defaultValue: "Não há inspecções suficientes para análise." })}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-1 border-border/60">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[260px]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                      {t("qualityAnalytics.kpi.conformityRate", { defaultValue: "Taxa de Conformidade Geral" })}
                    </span>
                    <span className="text-6xl font-black tabular-nums" style={{
                      color: ppi.conformityRate >= 90 ? CHART_COLORS.success
                        : ppi.conformityRate >= 70 ? CHART_COLORS.warning
                        : CHART_COLORS.danger,
                    }}>
                      {ppi.conformityRate}%
                    </span>
                    <span className="text-xs text-muted-foreground mt-2">
                      {t("qualityAnalytics.basedOnVerified", { defaultValue: "baseado em itens verificados" })}
                    </span>
                  </CardContent>
                </Card>

                <ChartCard className="lg:col-span-2" title={t("qualityAnalytics.chart.byPointType", { defaultValue: "Conformidade por Tipo de Ponto" })}>
                  {ppi.byPointType.length === 0 ? <MiniEmpty /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ppi.byPointType} layout="vertical" margin={{ left: 8, right: 32 }}>
                        <CartesianGrid {...CHART_STYLE.grid} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" {...CHART_STYLE.axis} />
                        <YAxis type="category" dataKey="type" width={50} {...CHART_STYLE.axis} />
                        <Tooltip content={<ChartTooltipContent unit="%" />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                        <Bar dataKey="rate" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title={t("qualityAnalytics.chart.ppiByStatus", { defaultValue: "PPIs por Estado" })}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ppi.byStatus}>
                      <CartesianGrid {...CHART_STYLE.grid} />
                      <XAxis dataKey="name" {...CHART_STYLE.axis} />
                      <YAxis {...CHART_STYLE.axis} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                      <Bar dataKey="value" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      {t("qualityAnalytics.chart.topNok", { defaultValue: "Top 10 itens com mais NOK" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {ppi.topNok.length === 0 ? <MiniEmpty /> : (
                      <ul className="space-y-1.5 max-h-[230px] overflow-y-auto">
                        {ppi.topNok.map((item, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/40">
                            <span className="text-muted-foreground tabular-nums w-5 text-right">{i + 1}.</span>
                            <span className="flex-1 truncate" title={item.label}>{item.label}</span>
                            <Badge variant="destructive" className="tabular-nums">{item.count}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── TAB Ensaios ─────────────────────────────────────────── */}
        <TabsContent value="tests" className="space-y-4 mt-6">
          {loading ? (
            <SectionSkeleton />
          ) : !tests || tests.totalTests === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={t("qualityAnalytics.noTestsData", { defaultValue: "Sem dados de ensaios" })}
              subtitle={t("qualityAnalytics.noTestsDataDesc", { defaultValue: "Não há resultados nos últimos 6 meses." })}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard
                  icon={TrendingUp}
                  label={t("qualityAnalytics.kpi.testsConformity", { defaultValue: "Taxa de conformidade" })}
                  value={`${tests.conformityRate}%`}
                  color={tests.conformityRate >= 90 ? CHART_COLORS.success
                    : tests.conformityRate >= 75 ? CHART_COLORS.warning
                    : CHART_COLORS.danger}
                />
                <KpiCard
                  icon={FlaskConical}
                  label={t("qualityAnalytics.kpi.totalTests", { defaultValue: "Total ensaios (6m)" })}
                  value={String(tests.totalTests)}
                  color={CHART_COLORS.primary}
                />
                <KpiCard
                  icon={CheckCircle2}
                  label={t("qualityAnalytics.kpi.testsPass", { defaultValue: "Ensaios conformes" })}
                  value={String(tests.monthly.reduce((a, b) => a + b.pass, 0))}
                  color={CHART_COLORS.success}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title={t("qualityAnalytics.chart.testsMonthly", { defaultValue: "Ensaios realizados por mês" })}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={tests.monthly}>
                      <CartesianGrid {...CHART_STYLE.grid} />
                      <XAxis dataKey="label" {...CHART_STYLE.axis} />
                      <YAxis {...CHART_STYLE.axis} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={CHART_STYLE.tooltip.cursor} />
                      <Line type="monotone" dataKey="pass" name="Total" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t("qualityAnalytics.chart.testsStacked", { defaultValue: "Conformes vs Não Conformes" })}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tests.monthly}>
                      <CartesianGrid {...CHART_STYLE.grid} />
                      <XAxis dataKey="label" {...CHART_STYLE.axis} />
                      <YAxis {...CHART_STYLE.axis} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="pass" stackId="a" name="Conformes" fill={CHART_COLORS.success} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="fail" stackId="a" name="Não conformes" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md" style={{ backgroundColor: `${color}1A` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground leading-tight">
            {label}
          </span>
        </div>
        <span className="text-2xl font-black tabular-nums text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title, children, className,
}: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function MiniEmpty() {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
      Sem dados
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

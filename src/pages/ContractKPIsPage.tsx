import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus,
  ShieldCheck, FlaskConical, ClipboardList, AlertTriangle,
  Wrench, Activity,
} from "lucide-react";

/* ── helpers ──────────────────────────────────────────────────────────── */
function statusColor(status: string) {
  switch (status) {
    case "ok":        return "bg-green-500/10 text-green-700 border-green-500/30";
    case "alerta":    return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "critico":   return "bg-destructive/10 text-destructive border-destructive/30";
    default:          return "bg-muted text-muted-foreground border-border";
  }
}
function statusLabel(status: string, t: (k: string, o?: any) => string) {
  const map: Record<string, string> = {
    ok: t("kpis.status.ok", { defaultValue: "Conforme" }),
    alerta: t("kpis.status.alert", { defaultValue: "Alerta" }),
    critico: t("kpis.status.critical", { defaultValue: "Crítico" }),
    sem_dados: t("kpis.status.noData", { defaultValue: "Sem dados" }),
  };
  return map[status] ?? status;
}

interface KPICardProps {
  label: string;
  value: string | number;
  target?: string;
  status: string;
  icon: React.ReactNode;
  detail?: string;
}

function KPICard({ label, value, target, status, icon, detail }: KPICardProps) {
  const { t } = useTranslation();
  return (
    <Card className={cn("border", statusColor(status))}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
          <Badge variant="outline" className={cn("text-[10px] px-1.5", statusColor(status))}>
            {statusLabel(status, t)}
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {target && <p className="text-[10px] text-muted-foreground mt-0.5">{t("kpis.target", { defaultValue: "Objetivo" })}: {target}</p>}
          <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
          {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── main component ───────────────────────────────────────────────────── */
export default function ContractKPIsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [rmKpis, setRmKpis] = useState<any>(null);
  const [ppiKpis, setPpiKpis] = useState<any>(null);
  const [ncMonthly, setNcMonthly] = useState<any[]>([]);
  const [testsMonthly, setTestsMonthly] = useState<any[]>([]);
  const [ncAging, setNcAging] = useState<any[]>([]);
  const [advancedMetrics, setAdvancedMetrics] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const pid = activeProject.id;
    try {
      const [rm, ppi, ncM, testsM, aging, adv] = await Promise.all([
        supabase.from("vw_rm_kpis" as any).select("*").eq("project_id", pid).single(),
        supabase.from("vw_ppi_kpis" as any).select("*").eq("project_id", pid).single(),
        supabase.from("view_nc_monthly" as any).select("*").eq("project_id", pid).order("month"),
        supabase.from("view_physical_tests_monthly_total" as any).select("*").eq("project_id", pid).order("month"),
        supabase.from("vw_nc_aging" as any).select("*").eq("project_id", pid),
        supabase.from("view_advanced_quality_metrics" as any).select("*").eq("project_id", pid),
      ]);
      setRmKpis(rm.data);
      setPpiKpis(ppi.data);
      setNcMonthly((ncM.data ?? []).slice(-12).map((r: any) => ({
        mes: r.month?.slice(0, 7) ?? "",
        abertas: r.opened ?? 0,
        fechadas: r.closed ?? 0,
      })));
      setTestsMonthly((testsM.data ?? []).slice(-12).map((r: any) => ({
        mes: r.month?.slice(0, 7) ?? "",
        conformes: r.conforme ?? 0,
        naoConformes: r.nao_conforme ?? 0,
        taxa: parseFloat(r.taxa_conformidade_pct ?? "0"),
      })));
      setNcAging(ncAging => (aging.data ?? []).map((r: any) => ({
        disciplina: r.discipline ?? "Geral",
        abertas: r.total_open ?? 0,
        mediasDias: parseFloat(r.avg_days_open ?? "0").toFixed(0),
      })));
      setAdvancedMetrics((adv.data ?? []).map((r: any) => ({
        ensaio: r.test_name ?? "",
        disciplina: r.disciplina ?? "",
        total: r.total ?? 0,
        conforme: r.conform ?? 0,
        naoConforme: r.non_conform ?? 0,
        taxa: r.total > 0 ? ((r.conform / r.total) * 100).toFixed(1) : "—",
      })));
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    load().catch(() => {});
    return () => { cancelled = true; };
  }, [load]);

  if (!activeProject) return <NoProjectBanner />;

  if (loading) return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  const hp_rate = rmKpis?.kpi_hp_rate_pct ? `${parseFloat(rmKpis.kpi_hp_rate_pct).toFixed(1)}%` : "—";
  const tests_rate = rmKpis?.kpi_tests_pass_pct ? `${parseFloat(rmKpis.kpi_tests_pass_pct).toFixed(1)}%` : "—";
  const ppi_rate = ppiKpis?.total > 0
    ? `${((ppiKpis.approved_count / ppiKpis.total) * 100).toFixed(1)}%`
    : "—";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        titleKey="kpis.title"
        subtitleKey="kpis.subtitle"
        defaultTitle="KPIs de Contrato"
        defaultSubtitle="Indicadores de qualidade exigidos pelo dono de obra"
      />

      {/* ── Semáforo principal ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label={t("kpis.testsConformity", { defaultValue: "Conformidade de Ensaios" })}
          value={tests_rate}
          target="≥ 95%"
          status={rmKpis?.kpi_tests_status ?? "sem_dados"}
          icon={<FlaskConical className="h-4 w-4" />}
          detail={`${rmKpis?.tests_pass ?? 0} / ${rmKpis?.tests_total ?? 0} ${t("kpis.conformes", { defaultValue: "conformes" })}`}
        />
        <KPICard
          label={t("kpis.hpApproved", { defaultValue: "HPs com Aprovação Escrita" })}
          value={hp_rate}
          target="100%"
          status={rmKpis?.kpi_hp_status ?? "sem_dados"}
          icon={<ShieldCheck className="h-4 w-4" />}
          detail={`${rmKpis?.hp_approved ?? 0} / ${rmKpis?.hp_total ?? 0} HPs`}
        />
        <KPICard
          label={t("kpis.ppiApproved", { defaultValue: "PPIs Aprovados" })}
          value={ppi_rate}
          target="≥ 90%"
          status={ppiKpis?.total > 0 && ppiKpis.approved_count / ppiKpis.total >= 0.9 ? "ok" : ppiKpis?.total > 0 ? "alerta" : "sem_dados"}
          icon={<ClipboardList className="h-4 w-4" />}
          detail={`${ppiKpis?.approved_count ?? 0} / ${ppiKpis?.total ?? 0} instâncias`}
        />
        <KPICard
          label={t("kpis.ncOverdue", { defaultValue: "NCs em Atraso (+15d)" })}
          value={rmKpis?.nc_overdue_15d ?? 0}
          target="0"
          status={rmKpis?.kpi_nc_overdue_status ?? "sem_dados"}
          icon={<AlertTriangle className="h-4 w-4" />}
          detail={`${rmKpis?.nc_open ?? 0} ${t("kpis.totalOpen", { defaultValue: "abertas no total" })}`}
        />
      </div>

      {/* ── Linha do tempo NCs ──────────────────────────────────────── */}
      {ncMonthly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("kpis.ncTrend", { defaultValue: "Evolução de Não Conformidades (12 meses)" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ncMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="abertas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name={t("kpis.ncOpened", { defaultValue: "Abertas" })} />
                <Line type="monotone" dataKey="fechadas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} name={t("kpis.ncClosed", { defaultValue: "Fechadas" })} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Taxa de conformidade de ensaios ─────────────────────────── */}
      {testsMonthly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              {t("kpis.testsEvolution", { defaultValue: "Evolução de Ensaios (12 meses)" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={testsMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conformes" fill="hsl(var(--chart-2))" name={t("kpis.conform", { defaultValue: "Conformes" })} radius={[3, 3, 0, 0]} />
                <Bar dataKey="naoConformes" fill="hsl(var(--destructive))" name={t("kpis.nonConform", { defaultValue: "Não Conformes" })} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Aging de NCs por disciplina ─────────────────────────────── */}
      {ncAging.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              {t("kpis.ncAging", { defaultValue: "NCs Abertas por Disciplina" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ncAging.map((row) => (
                <div key={row.disciplina} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate">{row.disciplina}</span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded-sm transition-all"
                      style={{ width: `${Math.min(100, (row.abertas / Math.max(...ncAging.map((r: any) => r.abertas), 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold w-8 text-right">{row.abertas}</span>
                  <span className="text-[10px] text-muted-foreground w-20">~{row.mediasDias}d média</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Conformidade por tipo de ensaio ─────────────────────────── */}
      {advancedMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("kpis.testsByType", { defaultValue: "Conformidade por Tipo de Ensaio" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("kpis.testName", { defaultValue: "Ensaio" })}</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("kpis.total", { defaultValue: "Total" })}</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("kpis.conform", { defaultValue: "Conf." })}</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("kpis.nonConform", { defaultValue: "N.Conf." })}</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("kpis.rate", { defaultValue: "Taxa" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {advancedMetrics.map((row, i) => {
                    const rate = parseFloat(row.taxa);
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-foreground">{row.ensaio}</div>
                          <div className="text-[10px] text-muted-foreground">{row.disciplina}</div>
                        </td>
                        <td className="text-center py-2 px-2 font-mono">{row.total}</td>
                        <td className="text-center py-2 px-2 text-green-700 font-mono">{row.conforme}</td>
                        <td className="text-center py-2 px-2 text-destructive font-mono">{row.naoConforme}</td>
                        <td className="text-right py-2">
                          <span className={cn(
                            "font-mono font-semibold",
                            !isNaN(rate) && rate >= 95 ? "text-green-700" :
                            !isNaN(rate) && rate >= 85 ? "text-amber-600" :
                            "text-destructive"
                          )}>
                            {row.taxa !== "—" ? `${row.taxa}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!loading && !rmKpis && ncMonthly.length === 0 && testsMonthly.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("kpis.empty", { defaultValue: "Ainda sem dados suficientes para gerar os KPIs de contrato." })}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("kpis.emptySub", { defaultValue: "Os indicadores aparecem automaticamente à medida que os dados são registados." })}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

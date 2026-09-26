import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { CHART_COLORS, ChartTooltipContent } from "@/lib/chartTheme";
import { Shield, AlertTriangle, ClipboardCheck, FlaskConical, Package } from "lucide-react";

/**
 * Índice de Conformidade — taxas de concretização por dimensão.
 *
 * Distinto do Índice de Alertas (health_score, vw_project_health), que só
 * desconta problemas. Aqui mede-se o avanço: PPIs aprovados, ensaios
 * realizados, materiais aprovados e NCs dentro do prazo.
 *
 * Dimensões com menos de MIN_SAMPLE registos não entram na média nem no radar:
 * "0/2" no arranque de uma frente não é "Crítico", é falta de dados.
 */
const MIN_SAMPLE = 5;

interface Props {
  ncOpen: number;
  /** NCs abertas há mais de 15 dias */
  ncOverdue: number;
  ppiApproved: number;
  ppiTotal: number;
  testsCompleted: number;
  testsTotal: number;
  matApproved: number;
  matTotal: number;
  loading?: boolean;
}

interface Dim {
  key: string;
  label: string;
  icon: React.ElementType;
  done: number;
  total: number;
  score: number;
  sufficient: boolean;
}

function scoreToCss(score: number) {
  if (score >= 80) return { color: CHART_COLORS.success, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" };
  if (score >= 50) return { color: CHART_COLORS.warning, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" };
  return { color: CHART_COLORS.danger, cls: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/25" };
}

const NEUTRAL = { color: "hsl(var(--muted-foreground))", cls: "text-muted-foreground", bg: "bg-muted/40", border: "border-border" };

function DimRow({ dim, loading }: { dim: Dim; loading?: boolean }) {
  const { t } = useTranslation();
  const s = dim.sufficient ? scoreToCss(dim.score) : NEUTRAL;
  const Icon = dim.icon;
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
        <Icon className={cn("h-4 w-4", s.cls)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{dim.label}</span>
          <span className={cn("text-xs font-bold tabular-nums whitespace-nowrap", s.cls)}>
            {loading ? "—" : dim.sufficient
              ? `${dim.score}%`
              : `${dim.done}/${dim.total}`}
          </span>
        </div>
        {dim.sufficient ? (
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            {!loading && <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${dim.score}%`, backgroundColor: s.color }}
            />}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t("dashboard.radar.insufficient", { count: MIN_SAMPLE, defaultValue: `Dados insuficientes (< ${MIN_SAMPLE} registos)` })}
          </p>
        )}
      </div>
    </div>
  );
}

export function QualityOverviewChart({
  ncOpen, ncOverdue, ppiApproved, ppiTotal,
  testsCompleted, testsTotal, matApproved, matTotal,
  loading,
}: Props) {
  const { t } = useTranslation();

  const dims = useMemo<Dim[]>(() => {
    const pct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);
    const ncOnTime = Math.max(0, ncOpen - ncOverdue);
    return [
      // Sem NCs abertas, a dimensão está conforme (não é falta de dados)
      { key: "nc",    label: t("dashboard.radar.nc",        { defaultValue: "NCs no prazo" }),        icon: AlertTriangle,
        done: ncOnTime, total: ncOpen, score: ncOpen > 0 ? pct(ncOnTime, ncOpen) : 100, sufficient: true },
      { key: "ppi",   label: t("dashboard.radar.ppi",       { defaultValue: "PPIs aprovados" }),      icon: ClipboardCheck,
        done: ppiApproved, total: ppiTotal, score: pct(ppiApproved, ppiTotal), sufficient: ppiTotal >= MIN_SAMPLE },
      { key: "tests", label: t("dashboard.radar.tests",     { defaultValue: "Ensaios realizados" }),  icon: FlaskConical,
        done: testsCompleted, total: testsTotal, score: pct(testsCompleted, testsTotal), sufficient: testsTotal >= MIN_SAMPLE },
      { key: "mats",  label: t("dashboard.radar.materials", { defaultValue: "Materiais aprovados" }), icon: Package,
        done: matApproved, total: matTotal, score: pct(matApproved, matTotal), sufficient: matTotal >= MIN_SAMPLE },
    ];
  }, [ncOpen, ncOverdue, ppiApproved, ppiTotal, testsCompleted, testsTotal, matApproved, matTotal, t]);

  const measured  = dims.filter(d => d.sufficient);
  const hasScore  = measured.length > 0;
  const showRadar = measured.length >= 3;
  const avgScore  = hasScore ? Math.round(measured.reduce((s, d) => s + d.score, 0) / measured.length) : 0;
  const avg       = hasScore ? scoreToCss(avgScore) : NEUTRAL;
  const radarData = measured.map(d => ({ axis: d.label, value: d.score, fullMark: 100 }));

  const statusLabel = !hasScore
    ? t("dashboard.radar.noData", { defaultValue: "Sem dados suficientes" })
    : avgScore >= 80
    ? t("dashboard.radar.healthy",   { defaultValue: "Bom" })
    : avgScore >= 50
    ? t("dashboard.radar.attention", { defaultValue: "Atenção" })
    : t("dashboard.radar.critical",  { defaultValue: "Crítico" });

  return (
    <Card className="border border-border/60 bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t("dashboard.radar.title", { defaultValue: "Índice de Conformidade" })}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("dashboard.radar.subtitle", { defaultValue: "Taxas de concretização por dimensão" })}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-5">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
            <Skeleton className="h-[260px] w-full rounded-xl" />
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 gap-4 items-center", showRadar && "md:grid-cols-[1fr_260px]")}>

            {showRadar && (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} gridType="polygon" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name={t("dashboard.radar.conformity", { defaultValue: "Conformidade" })}
                      dataKey="value"
                      stroke={avg.color}
                      strokeWidth={2}
                      fill={avg.color}
                      fillOpacity={0.12}
                      dot={{ r: 4, fill: avg.color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Tooltip content={<ChartTooltipContent unit="%" />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-3.5">
              <div className={cn("rounded-xl border p-3 flex items-center gap-3", avg.bg, avg.border)}>
                <div className={cn("text-3xl font-black tabular-nums leading-none", avg.cls)}>
                  {hasScore ? `${avgScore}%` : "—"}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.radar.globalScore", { defaultValue: "Conformidade global" })}
                  </p>
                  <p className={cn("text-xs font-semibold", avg.cls)}>{statusLabel}</p>
                </div>
              </div>
              <div className="space-y-3">
                {dims.map(d => <DimRow key={d.key} dim={d} loading={loading} />)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

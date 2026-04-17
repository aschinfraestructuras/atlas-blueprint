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
import { Shield, AlertTriangle, ClipboardCheck, FlaskConical, Package, Activity } from "lucide-react";

interface Props {
  ncOpen: number;
  ncTotal: number;
  ppiApproved: number;
  ppiTotal: number;
  testsCompleted: number;
  testsTotal: number;
  matApproved: number;
  matTotal: number;
  healthScore: number;
  loading?: boolean;
}

function scoreToCss(score: number) {
  if (score >= 80) return { color: CHART_COLORS.success, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" };
  if (score >= 50) return { color: CHART_COLORS.warning, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" };
  return { color: CHART_COLORS.danger, cls: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/25" };
}

function DimRow({ icon: Icon, label, score, loading }: {
  icon: React.ElementType; label: string; score: number; loading?: boolean;
}) {
  const s = scoreToCss(score);
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
        <Icon className={cn("h-3.5 w-3.5", s.cls)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          <span className={cn("text-[11px] font-black tabular-nums", s.cls)}>{loading ? "—" : `${score}%`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          {!loading && <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: s.color }}
          />}
        </div>
      </div>
    </div>
  );
}

export function QualityOverviewChart({
  ncOpen, ncTotal, ppiApproved, ppiTotal,
  testsCompleted, testsTotal, matApproved, matTotal,
  healthScore, loading,
}: Props) {
  const { t } = useTranslation();

  const dims = useMemo(() => {
    const ncScore  = ncTotal > 0  ? Math.round(((ncTotal - ncOpen) / ncTotal) * 100) : 100;
    const ppiScore = ppiTotal > 0 ? Math.round((ppiApproved / ppiTotal) * 100) : 0;
    const tstScore = testsTotal > 0 ? Math.round((testsCompleted / testsTotal) * 100) : 0;
    const matScore = matTotal > 0 ? Math.round((matApproved / matTotal) * 100) : 0;
    return [
      { key: "nc",       label: t("dashboard.radar.nc",        { defaultValue: "NCs" }),       score: ncScore,     icon: AlertTriangle  },
      { key: "ppi",      label: t("dashboard.radar.ppi",       { defaultValue: "PPIs" }),      score: ppiScore,    icon: ClipboardCheck },
      { key: "tests",    label: t("dashboard.radar.tests",     { defaultValue: "Ensaios" }),   score: tstScore,    icon: FlaskConical   },
      { key: "mats",     label: t("dashboard.radar.materials", { defaultValue: "Materiais" }), score: matScore,    icon: Package        },
      { key: "health",   label: t("dashboard.radar.health",    { defaultValue: "Saúde" }),     score: healthScore, icon: Activity       },
    ];
  }, [ncOpen, ncTotal, ppiApproved, ppiTotal, testsCompleted, testsTotal, matApproved, matTotal, healthScore, t]);

  const radarData = dims.map(d => ({ axis: d.label, value: d.score, fullMark: 100 }));
  const avgScore  = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  const avg       = scoreToCss(avgScore);

  return (
    <Card className="border border-border/60 bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t("dashboard.radar.title", { defaultValue: "Visão Integrada de Qualidade" })}
        </CardTitle>
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">
          {t("dashboard.radar.subtitle", { defaultValue: "Conformidade por dimensão (NCs · PPIs · Ensaios · Materiais · Health)" })}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-5">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
            <Skeleton className="h-[260px] w-full rounded-xl" />
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-center">

            {/* Radar */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.4}
                    gridType="polygon"
                  />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
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
              {/* Score central */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={cn(
                  "flex flex-col items-center gap-0.5 rounded-full w-14 h-14 justify-center",
                  "bg-card/90 backdrop-blur-sm border shadow-sm",
                  avg.border
                )}>
                  <span className={cn("text-base font-black tabular-nums leading-none", avg.cls)}>{avgScore}%</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("dashboard.radar.avg", { defaultValue: "Média" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown por dimensão */}
            <div className="space-y-3.5">
              {/* Score global destacado */}
              <div className={cn("rounded-xl border p-3 flex items-center gap-3", avg.bg, avg.border)}>
                <div className={cn("text-3xl font-black tabular-nums leading-none", avg.cls)}>{avgScore}%</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("dashboard.radar.globalScore", { defaultValue: "Score global" })}
                  </p>
                  <p className={cn("text-[11px] font-semibold", avg.cls)}>
                    {avgScore >= 80
                      ? t("dashboard.radar.healthy",   { defaultValue: "Saudável" })
                      : avgScore >= 50
                      ? t("dashboard.radar.attention", { defaultValue: "Atenção" })
                      : t("dashboard.radar.critical",  { defaultValue: "Crítico" })}
                  </p>
                </div>
              </div>
              {/* Linhas por dimensão */}
              <div className="space-y-2.5">
                {dims.map(d => <DimRow key={d.key} icon={d.icon} label={d.label} score={d.score} loading={loading} />)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

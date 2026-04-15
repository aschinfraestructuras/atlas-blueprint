import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { CHART_COLORS, ChartTooltipContent } from "@/lib/chartTheme";
import { Shield } from "lucide-react";

interface QualityOverviewChartProps {
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

export function QualityOverviewChart({
  ncOpen, ncTotal, ppiApproved, ppiTotal,
  testsCompleted, testsTotal, matApproved, matTotal,
  healthScore, loading,
}: QualityOverviewChartProps) {
  const { t } = useTranslation();

  const radarData = useMemo(() => {
    // NC: fewer open = better → invert
    const ncScore = ncTotal > 0 ? Math.round(((ncTotal - ncOpen) / ncTotal) * 100) : 100;
    const ppiScore = ppiTotal > 0 ? Math.round((ppiApproved / ppiTotal) * 100) : 0;
    const testsScore = testsTotal > 0 ? Math.round((testsCompleted / testsTotal) * 100) : 0;
    const matScore = matTotal > 0 ? Math.round((matApproved / matTotal) * 100) : 0;

    return [
      {
        axis: t("dashboard.radar.nc", { defaultValue: "NCs" }),
        value: ncScore,
        fullMark: 100,
      },
      {
        axis: t("dashboard.radar.ppi", { defaultValue: "PPIs" }),
        value: ppiScore,
        fullMark: 100,
      },
      {
        axis: t("dashboard.radar.tests", { defaultValue: "Ensaios" }),
        value: testsScore,
        fullMark: 100,
      },
      {
        axis: t("dashboard.radar.materials", { defaultValue: "Materiais" }),
        value: matScore,
        fullMark: 100,
      },
      {
        axis: t("dashboard.radar.health", { defaultValue: "Saúde" }),
        value: healthScore,
        fullMark: 100,
      },
    ];
  }, [ncOpen, ncTotal, ppiApproved, ppiTotal, testsCompleted, testsTotal, matApproved, matTotal, healthScore, t]);

  const avgScore = useMemo(() => {
    const sum = radarData.reduce((acc, d) => acc + d.value, 0);
    return Math.round(sum / radarData.length);
  }, [radarData]);

  const scoreColor = avgScore >= 80 ? CHART_COLORS.success : avgScore >= 50 ? CHART_COLORS.warning : CHART_COLORS.danger;

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
      <CardContent className="px-2 pb-4">
        {loading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                  gridType="polygon"
                />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{
                    fontSize: 10,
                    fontWeight: 600,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickCount={5}
                />
                <Radar
                  name={t("dashboard.radar.conformity", { defaultValue: "Conformidade" })}
                  dataKey="value"
                  stroke={scoreColor}
                  strokeWidth={2}
                  fill={scoreColor}
                  fillOpacity={0.15}
                  dot={{
                    r: 4,
                    fill: scoreColor,
                    stroke: "hsl(var(--card))",
                    strokeWidth: 2,
                  }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Tooltip content={<ChartTooltipContent unit="%" />} />
              </RadarChart>
            </ResponsiveContainer>
            {/* Central score overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn(
                "flex flex-col items-center gap-0.5 rounded-full w-16 h-16 justify-center",
                "bg-card/80 backdrop-blur-sm border border-border/30 shadow-sm",
              )}>
                <span className="text-lg font-black tabular-nums leading-none" style={{ color: scoreColor }}>
                  {avgScore}%
                </span>
                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.radar.avg", { defaultValue: "Média" })}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

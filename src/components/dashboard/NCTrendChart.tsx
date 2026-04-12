import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { MonthlyData } from "@/hooks/useDashboardViews";
import { CHART_COLORS, CHART_STYLE, ChartTooltipContent } from "@/lib/chartTheme";

interface NCTrendChartProps {
  data: MonthlyData[];
  loading?: boolean;
}

// Gradientes definidos fora do componente recharts — injectados via SVG nativo
function ChartGradients() {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="ncOpenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={CHART_COLORS.danger} stopOpacity={0.22} />
          <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0}    />
        </linearGradient>
        <linearGradient id="ncCloseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={CHART_COLORS.success} stopOpacity={0.18} />
          <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0}    />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function NCTrendChart({ data, loading }: NCTrendChartProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const chartData = useMemo(() => {
    return data.map((m, i) => ({
      label: m.label,
      opened: m.opened,
      closed: m.closed,
      balance: data.slice(0, i + 1).reduce((s, x) => s + (x.opened ?? 0) - (x.closed ?? 0), 0),
    }));
  }, [data]);

  return (
    <Card
      className="border border-border/60 bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all duration-200"
      onClick={() => navigate("/non-conformities")}
    >
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("dashboard.charts.ncTrendTitle", { defaultValue: "Tendência de NCs" })}
        </CardTitle>
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">
          {t("dashboard.charts.ncTrendSub", { defaultValue: "Abertas · Fechadas · Saldo acumulado" })}
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-3 relative">
        {/* SVG com gradientes injectado fora do recharts */}
        <ChartGradients />

        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-12 text-center">{t("common.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 4"
                stroke={CHART_STYLE.grid.stroke}
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={CHART_STYLE.axis.tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={CHART_STYLE.axis.tick}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                content={<ChartTooltipContent />}
                cursor={CHART_STYLE.tooltip.cursor}
              />
              <Area
                type="monotone"
                dataKey="opened"
                name={t("dashboard.kpi.ncOpened", { defaultValue: "Abertas" })}
                fill="url(#ncOpenGrad)"
                stroke={CHART_COLORS.danger}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--card))", strokeWidth: 2, fill: CHART_COLORS.danger }}
              />
              <Area
                type="monotone"
                dataKey="closed"
                name={t("dashboard.kpi.ncClosed", { defaultValue: "Fechadas" })}
                fill="url(#ncCloseGrad)"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--card))", strokeWidth: 2, fill: CHART_COLORS.success }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name={t("dashboard.charts.balance", { defaultValue: "Saldo" })}
                stroke={CHART_COLORS.warning}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 3.5, stroke: "hsl(var(--card))", strokeWidth: 2, fill: CHART_COLORS.warning }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

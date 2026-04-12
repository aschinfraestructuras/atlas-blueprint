import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, ChartTooltipContent } from "@/lib/chartTheme";
import type { TestsMonthlyData } from "@/hooks/useDashboardViews";
import { Skeleton } from "@/components/ui/skeleton";

interface TestsDonutChartProps {
  data: TestsMonthlyData[];
  loading?: boolean;
}

const COLORS = {
  conform:    CHART_COLORS.success,
  nonConform: CHART_COLORS.danger,
};

export function TestsDonutChart({ data, loading }: TestsDonutChartProps) {
  const { t } = useTranslation();

  const totalConform = data.reduce((s, d) => s + d.conform, 0);
  const totalNonConform = data.reduce((s, d) => s + d.non_conform, 0);
  const total = totalConform + totalNonConform;
  const pct = total > 0 ? Math.round((totalConform / total) * 100) : 0;

  const donutData = [
    { name: t("dashboard.exec.conform", { defaultValue: "Conformes" }), value: totalConform, fill: COLORS.conform },
    { name: t("dashboard.exec.nonConform", { defaultValue: "Não Conformes" }), value: totalNonConform, fill: COLORS.nonConform },
  ];

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.testsDistribution", { defaultValue: "Distribuição de Ensaios" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded-md" />
        ) : total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  animationDuration={900}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: 20 }}>
              <span className="text-2xl font-black tabular-nums text-foreground leading-none">{pct}%</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                {t("dashboard.exec.conform")}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 -mt-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] text-muted-foreground">{d.name}</span>
                  <span className="text-[10px] font-bold tabular-nums text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

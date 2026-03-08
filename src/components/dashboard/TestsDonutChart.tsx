import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TestsMonthlyData } from "@/hooks/useDashboardViews";
import { Skeleton } from "@/components/ui/skeleton";

interface TestsDonutChartProps {
  data: TestsMonthlyData[];
  loading?: boolean;
}

const COLORS = {
  conform: "hsl(var(--chart-2))",
  nonConform: "hsl(var(--chart-5))",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.payload?.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold tabular-nums text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

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
    <Card className="border-0 bg-card shadow-card">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("dashboard.charts.testsDistribution", { defaultValue: "Distribuição de Ensaios" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-2">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-md" />
        ) : total === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={3}
                  animationDuration={1000}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black tabular-nums text-foreground leading-none">{pct}%</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                {t("dashboard.exec.conform")}
              </span>
            </div>
            {/* Legend below */}
            <div className="flex items-center justify-center gap-5 -mt-1">
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

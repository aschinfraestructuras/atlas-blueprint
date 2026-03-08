import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
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

export function TestsDonutChart({ data, loading }: TestsDonutChartProps) {
  const { t } = useTranslation();

  // Aggregate totals
  const totalConform = data.reduce((s, d) => s + d.conform, 0);
  const totalNonConform = data.reduce((s, d) => s + d.non_conform, 0);
  const total = totalConform + totalNonConform;
  const pct = total > 0 ? Math.round((totalConform / total) * 100) : 0;

  const donutData = [
    { name: t("dashboard.exec.conform", { defaultValue: "Conformes" }), value: totalConform },
    { name: t("dashboard.exec.nonConform", { defaultValue: "Não Conformes" }), value: totalNonConform },
  ];

  return (
    <Card className="border-0 bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("dashboard.charts.testsDistribution", { defaultValue: "Distribuição de Ensaios" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded-md" />
        ) : total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1000}
                >
                  <Cell fill={COLORS.conform} />
                  <Cell fill={COLORS.nonConform} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -10 }}>
              <span className="text-2xl font-black tabular-nums text-foreground">{pct}%</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.exec.conform")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

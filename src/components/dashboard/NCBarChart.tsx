import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { MonthlyData } from "@/hooks/useDashboardViews";
import { Skeleton } from "@/components/ui/skeleton";

interface NCBarChartProps {
  data: MonthlyData[];
  loading?: boolean;
}

export function NCBarChart({ data, loading }: NCBarChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-0 bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("dashboard.charts.ncMonthly", { defaultValue: "NCs por Mês" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded-md" />
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
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
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              <Bar
                dataKey="opened"
                name={t("dashboard.kpi.ncOpened", { defaultValue: "Abertas" })}
                fill="hsl(var(--chart-5))"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="closed"
                name={t("dashboard.kpi.ncClosed", { defaultValue: "Fechadas" })}
                fill="hsl(var(--chart-2))"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ActionPlanDonutProps {
  onTime: number;
  pastDue: number;
  loading?: boolean;
}

export function ActionPlanDonut({ onTime, pastDue, loading }: ActionPlanDonutProps) {
  const { t } = useTranslation();
  const total = onTime + pastDue;

  const data = [
    { name: t("dashboard.charts.onTime", { defaultValue: "No prazo" }), value: onTime, fill: "hsl(var(--chart-2))" },
    { name: t("dashboard.charts.pastDue", { defaultValue: "Em atraso" }), value: pastDue, fill: "hsl(var(--chart-5))" },
  ];

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.actionPlan", { defaultValue: "Plano de Acção" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-md" />
        ) : total === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  animationDuration={800}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: -10 }}>
              <span className="text-xl font-black tabular-nums text-foreground leading-none">{total}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">NCs</span>
            </div>
            <div className="flex items-center justify-center gap-4 -mt-1">
              {data.map((d) => (
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

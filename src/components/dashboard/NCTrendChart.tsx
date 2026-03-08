import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { MonthlyData } from "@/hooks/useDashboardViews";

interface NCTrendChartProps {
  data: MonthlyData[];
  loading?: boolean;
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
      className="border border-border bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all"
      onClick={() => navigate("/non-conformities")}
    >
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.ncTrendTitle", { defaultValue: "Tendência de NCs" })}
        </CardTitle>
        <p className="text-[9px] text-muted-foreground/60">
          {t("dashboard.charts.ncTrendSub", { defaultValue: "Abertas · Fechadas · Saldo acumulado" })}
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-12 text-center">{t("common.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="opened"
                name={t("dashboard.kpi.ncOpened", { defaultValue: "Abertas" })}
                fill="hsl(0 65% 50% / 0.15)"
                stroke="hsl(0 65% 50%)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="closed"
                name={t("dashboard.kpi.ncClosed", { defaultValue: "Fechadas" })}
                fill="hsl(145 55% 42% / 0.15)"
                stroke="hsl(145 55% 42%)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name={t("dashboard.charts.balance", { defaultValue: "Saldo" })}
                stroke="hsl(38 85% 50%)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

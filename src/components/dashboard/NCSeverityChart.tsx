import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface NCSeverityChartProps {
  data: { label: string; value: number; color: string }[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[10px] font-bold text-muted-foreground mb-1">{label}</p>
      <span className="text-xs font-bold tabular-nums text-foreground">{payload[0].value}</span>
    </div>
  );
}

export function NCSeverityChart({ data, loading }: NCSeverityChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.ncClassification", { defaultValue: "Classificação NC" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-md" />
        ) : data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {data.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

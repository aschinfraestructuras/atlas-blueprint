import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocMetric } from "@/hooks/useDashboardViews";

interface DocumentMetricsChartProps {
  data: DocMetric[];
  loading?: boolean;
}

export function DocumentMetricsChart({ data, loading }: DocumentMetricsChartProps) {
  const { t } = useTranslation();

  const chartData = data.slice(0, 8).map(d => ({
    name: d.doc_type.length > 12 ? d.doc_type.substring(0, 12) + "…" : d.doc_type,
    [t("dashboard.charts.docDraft", { defaultValue: "Rascunho" })]: d.draft,
    [t("dashboard.charts.docReview", { defaultValue: "Revisão" })]: d.in_review,
    [t("dashboard.charts.docApproved", { defaultValue: "Aprovado" })]: d.approved,
  }));

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.documentMetrics", { defaultValue: "Métricas de Documentos" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-1">
        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-md" />
        ) : chartData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Bar dataKey={t("dashboard.charts.docDraft", { defaultValue: "Rascunho" })} stackId="a" fill="hsl(var(--chart-4))" radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey={t("dashboard.charts.docReview", { defaultValue: "Revisão" })} stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey={t("dashboard.charts.docApproved", { defaultValue: "Aprovado" })} stackId="a" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

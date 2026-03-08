import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QualityMetric } from "@/hooks/useDashboardViews";

interface QualityKPITableProps {
  data: QualityMetric[];
  loading?: boolean;
}

function RateBadge({ rate }: { rate: number }) {
  const color = rate === 0
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : rate <= 10
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-destructive/15 text-destructive";

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums", color)}>
      {rate.toFixed(1)}%
    </span>
  );
}

export function QualityKPITable({ data, loading }: QualityKPITableProps) {
  const { t } = useTranslation();

  const top = data
    .filter(d => d.total > 0)
    .sort((a, b) => b.failure_rate_pct - a.failure_rate_pct)
    .slice(0, 6);

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.qualityKpi", { defaultValue: "KPI de Qualidade" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : top.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                    {t("dashboard.charts.indicator", { defaultValue: "Indicador" })}
                  </th>
                  <th className="text-center py-1.5 px-1 font-semibold text-muted-foreground uppercase tracking-wider text-[9px] w-12">
                    {t("dashboard.charts.total", { defaultValue: "Total" })}
                  </th>
                  <th className="text-center py-1.5 px-1 font-semibold text-muted-foreground uppercase tracking-wider text-[9px] w-12">
                    {t("dashboard.charts.failRate", { defaultValue: "% Falha" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {top.map((row) => (
                  <tr key={row.test_catalog_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-1.5 px-2">
                      <div className="font-medium text-foreground truncate max-w-[180px]">{row.test_name}</div>
                      <div className="text-[9px] text-muted-foreground">{row.test_code} · {row.disciplina}</div>
                    </td>
                    <td className="text-center py-1.5 px-1 font-bold tabular-nums text-foreground">{row.total}</td>
                    <td className="text-center py-1.5 px-1"><RateBadge rate={row.failure_rate_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

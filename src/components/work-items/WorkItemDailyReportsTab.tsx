import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText, ExternalLink, Clock, CheckCircle2,
  Send, AlertTriangle, Calendar,
} from "lucide-react";

interface DailyReportRow {
  id: string;
  report_number: string;
  report_date: string;
  status: string;
  created_by: string | null;
  nc_open: number;
  hp_pending: number;
  tests_overdue: number;
  labour_rows: number;
  total_hours: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  validated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const STATUS_ICONS: Record<string, React.ComponentType<any>> = {
  draft:     Clock,
  submitted: Send,
  validated: CheckCircle2,
};

interface Props {
  workItemId: string;
  projectId: string;
}

export function WorkItemDailyReportsTab({ workItemId, projectId }: Props) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<DailyReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workItemId || !projectId) return;
    setLoading(true);
    try {
      // Buscar partes diárias + contexto de qualidade via view
      const { data } = await (supabase as any)
        .from("vw_daily_report_context")
        .select("report_id, report_number, report_date, status, labour_rows, total_hours, nc_open, hp_pending, tests_overdue")
        .eq("project_id", projectId)
        .eq("work_item_id", workItemId)
        .order("report_date", { ascending: false })
        .limit(50);

      setReports((data ?? []).map((r: any) => ({
        id: r.report_id,
        report_number: r.report_number,
        report_date: r.report_date,
        status: r.status ?? "draft",
        created_by: null,
        nc_open: r.nc_open ?? 0,
        hp_pending: r.hp_pending ?? 0,
        tests_overdue: r.tests_overdue ?? 0,
        labour_rows: r.labour_rows ?? 0,
        total_hours: r.total_hours ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }, [workItemId, projectId]);

  useEffect(() => {
    let cancelled = false;
    load().catch(() => {});
    return () => { cancelled = true; };
  }, [load]);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  if (reports.length === 0) return (
    <Card>
      <CardContent className="py-10 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("workItems.detail.dailyReports.empty", { defaultValue: "Ainda não há partes diárias associadas a este elemento de obra." })}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/daily-reports">
            {t("workItems.detail.dailyReports.goTo", { defaultValue: "Ir para Partes Diárias" })}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  // KPI rápido no topo
  const totalHours = reports.reduce((s, r) => s + (r.total_hours ?? 0), 0);
  const validated  = reports.filter(r => r.status === "validated").length;
  const withAlerts = reports.filter(r => r.nc_open > 0 || r.hp_pending > 0 || r.tests_overdue > 0).length;

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{reports.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {t("workItems.detail.dailyReports.total", { defaultValue: "Total" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(0)}h</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {t("workItems.detail.dailyReports.hours", { defaultValue: "Horas registadas" })}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(withAlerts > 0 ? "border-amber-500/40" : "")}>
          <CardContent className="py-3 text-center">
            <p className={cn("text-2xl font-bold", withAlerts > 0 ? "text-amber-600" : "text-foreground")}>
              {withAlerts}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {t("workItems.detail.dailyReports.withAlerts", { defaultValue: "Com alertas qualidade" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de partes diárias */}
      <div className="space-y-2">
        {reports.map((r) => {
          const StatusIcon = STATUS_ICONS[r.status] ?? Clock;
          const hasAlerts = r.nc_open > 0 || r.hp_pending > 0 || r.tests_overdue > 0;
          return (
            <Card key={r.id} className={cn("hover:bg-muted/20 transition-colors", hasAlerts && "border-amber-500/30")}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={cn("h-4 w-4 flex-shrink-0",
                      r.status === "validated" ? "text-green-600" :
                      r.status === "submitted" ? "text-blue-600" :
                      "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{r.report_number}</span>
                        <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[r.status] ?? "")}>
                          {t(`dailyReports.status.${r.status}`, { defaultValue: r.status })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {r.report_date}
                        </span>
                        {r.total_hours > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {r.total_hours.toFixed(1)}h trabalho
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Alertas de qualidade */}
                    {r.nc_open > 0 && (
                      <span className="text-[10px] font-medium text-destructive flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {r.nc_open} NC
                      </span>
                    )}
                    {r.hp_pending > 0 && (
                      <span className="text-[10px] font-medium text-amber-600 flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {r.hp_pending} HP
                      </span>
                    )}
                    {r.tests_overdue > 0 && (
                      <span className="text-[10px] font-medium text-orange-600 flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {r.tests_overdue} ens.
                      </span>
                    )}
                    <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Link to={`/daily-reports/${r.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

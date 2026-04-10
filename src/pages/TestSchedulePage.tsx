import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useTestDueItems } from "@/hooks/useTestDueItems";
import { useTestPlans } from "@/hooks/useTestPlans";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CalendarClock, Download, ChevronLeft, ChevronRight, FlaskConical, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, addDays, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { pt, es } from "date-fns/locale";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import { signatureBlockHtml } from "@/lib/services/pdfSignatureBlocks";
import jsPDF from "jspdf";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-chart-2/10 text-chart-2",
  approved: "bg-chart-2/15 text-chart-2",
  fail: "bg-destructive/10 text-destructive",
  pass: "bg-chart-2/10 text-chart-2",
};

export default function TestSchedulePage() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const { data: dueItems, loading } = useTestDueItems();
  const isEs = i18n.language?.startsWith("es");
  const locale = isEs ? es : pt;

  const [weekOffset, setWeekOffset] = useState(0);
  const baseDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset]);
  const weekStart = useMemo(() => startOfWeek(baseDate, { weekStartsOn: 1 }), [baseDate]);
  const weekEnd = useMemo(() => endOfWeek(baseDate, { weekStartsOn: 1 }), [baseDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Group tests by date within week
  const testsByDay = useMemo(() => {
    const map: Record<string, typeof dueItems> = {};
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      map[key] = [];
    }
    for (const item of dueItems) {
      const dateStr = item.scheduled_for ?? item.due_at_date;
      if (!dateStr) continue;
      try {
        const d = parseISO(dateStr);
        if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
          const key = format(d, "yyyy-MM-dd");
          if (map[key]) map[key]!.push(item);
        }
      } catch { /* skip */ }
    }
    return map;
  }, [dueItems, days, weekStart, weekEnd]);

  const totalThisWeek = useMemo(() => Object.values(testsByDay).reduce((s, v) => s + v.length, 0), [testsByDay]);
  const pendingThisWeek = useMemo(() =>
    Object.values(testsByDay).flat().filter(i => ["due", "overdue", "scheduled"].includes(i.status ?? "")).length,
    [testsByDay]
  );

  if (!activeProject) return <NoProjectBanner />;

  const weekLabel = `${format(weekStart, "d MMM", { locale })} — ${format(weekEnd, "d MMM yyyy", { locale })}`;

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const projectName = `${activeProject.code} — ${activeProject.name}`;
    const date = new Date().toLocaleDateString("pt-PT");

    let html = `<html><head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 9px; color: #374151; padding: 16px; line-height: 1.4; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #192F48; color: #fff; padding: 7px 5px; font-size: 8px; text-align: center; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
      td { border: 1px solid #d1d5db; padding: 5px 4px; vertical-align: top; font-size: 8px; min-height: 40px; color: #374151; }
      .test-item { background: #f1f5f9; border-radius: 4px; padding: 4px 6px; margin-bottom: 3px; border-left: 3px solid #192F48; font-size: 8px; color: #374151; }
      .status-pass { border-left-color: #16a34a; }
      .status-fail { border-left-color: #dc2626; }
      .status-pending { border-left-color: #d97706; }
      .kpi { display: inline-block; background: #e2e8f0; padding: 3px 10px; border-radius: 4px; margin-right: 8px; font-size: 9px; color: #1e293b; font-weight: 600; }
    </style></head><body>`;

    html += fullPdfHeader(logoBase64, projectName, "PROG-ENS-" + activeProject.code, "0", date);
    html += `<h2 style="text-align:center;font-size:13px;color:#192F48;margin:8px 0 4px;">PROGRAMAÇÃO SEMANAL DE ENSAIOS</h2>`;
    html += `<p style="text-align:center;font-size:10px;color:#6B7280;margin-bottom:8px;">${weekLabel}</p>`;
    html += `<div style="margin-bottom:10px;"><span class="kpi">Total: ${totalThisWeek}</span><span class="kpi">Pendentes: ${pendingThisWeek}</span></div>`;

    html += `<table><tr>`;
    for (const day of days) {
      const dayName = format(day, "EEE", { locale }).toUpperCase();
      const dayNum = format(day, "d/MM");
      html += `<th>${dayName}<br/>${dayNum}</th>`;
    }
    html += `</tr><tr>`;
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const dayTests = testsByDay[key] ?? [];
      html += `<td>`;
      if (dayTests.length === 0) {
        html += `<span style="color:#ccc;font-size:8px;">—</span>`;
      } else {
        for (const item of dayTests) {
          const testName = item.test_plan_rules?.tests_catalog?.name ?? "—";
          const statusCls = item.status === "done" ? "status-pass" :
                           item.status === "overdue" ? "status-fail" : "status-pending";
          html += `<div class="test-item ${statusCls}"><strong>${testName}</strong><br/><span style="color:#888">${t(`tests.due.status.${item.status}`, { defaultValue: item.status })}</span></div>`;
        }
      }
      html += `</td>`;
    }
    html += `</tr></table>`;
    html += signatureBlockHtml([
      { role: "Técnico de Qualidade" },
      { role: "Responsável de Qualidade" },
      { role: "Fiscalização" },
    ]);
    html += `</body></html>`;

    doc.html(html, {
      callback: (d) => d.save(`Prog_Ensaios_${activeProject.code}_${format(weekStart, "yyyyMMdd")}.pdf`),
      x: 8, y: 5, width: 275, windowWidth: 1000,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tests.schedule.title")}
        subtitle={t("tests.schedule.subtitle")}
        icon={CalendarClock}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1.5" />PDF
          </Button>
        }
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />{t("common.back")}
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{weekLabel}</p>
          <p className="text-xs text-muted-foreground">{t("tests.schedule.weekSummary", { total: totalThisWeek, pending: pendingThisWeek })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
            {t("common.today")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            {t("common.next")}<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalThisWeek}</p>
              <p className="text-xs text-muted-foreground">{t("tests.schedule.totalWeek")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingThisWeek}</p>
              <p className="text-xs text-muted-foreground">{t("tests.schedule.pending")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-chart-2" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalThisWeek - pendingThisWeek}</p>
              <p className="text-xs text-muted-foreground">{t("tests.schedule.done")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTests = testsByDay[key] ?? [];
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border bg-card p-3 min-h-[140px] transition-colors",
                  isToday && "ring-2 ring-primary/30 border-primary/40",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-xs font-bold uppercase",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}>
                    {format(day, "EEE", { locale })}
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-primary" : "text-foreground",
                  )}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayTests.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50 text-center mt-6">—</p>
                  ) : (
                    dayTests.map((item) => {
                      const testName = item.test_plan_rules?.tests_catalog?.name ?? "—";
                      const isDone = item.status === "done";
                      const isOverdue = item.status === "overdue";
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-lg px-2 py-1.5 text-[10px] border-l-[3px]",
                            isDone
                              ? "bg-chart-2/5 border-l-chart-2"
                              : isOverdue
                              ? "bg-destructive/5 border-l-destructive"
                              : "bg-amber-500/5 border-l-amber-500",
                          )}
                        >
                          <p className="font-bold truncate">{testName}</p>
                          <p className="text-muted-foreground truncate">
                            {t(`tests.due.status.${item.status}`, { defaultValue: item.status })}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

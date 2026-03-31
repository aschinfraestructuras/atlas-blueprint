import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { MonthlyReportTestCards } from "@/components/dashboard/MonthlyReportTestCards";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileBarChart2, Plus, ArrowLeft, FileText, Send, Trash2, AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  monthlyReportService,
  getDeadlineForMonth,
  isOnTime,
  type MonthlyReport,
} from "@/lib/services/monthlyReportService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/15 text-primary",
  accepted: "bg-emerald-500/10 text-emerald-600",
};

function getStatusLabel(status: string, t: (key: string, opts?: any) => string): string {
  return t(`monthlyReport.status.${status}`, { defaultValue: status });
}

function getMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pt-PT", { year: "numeric", month: "long" }),
    });
  }
  return opts;
}

export default function MonthlyReportPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate, canEdit, canDelete } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  const projectMeta = useMemo(() => activeProject ? {
    name: activeProject.name,
    code: activeProject.code,
    contractor: (activeProject as any)?.contractor ?? null,
    client: (activeProject as any)?.client ?? null,
    location: (activeProject as any)?.location ?? null,
    contract_number: (activeProject as any)?.contract_number ?? null,
  } : null, [activeProject]);

  const doPdf = useCallback((r: MonthlyReport) => {
    monthlyReportService.exportPdf(r, activeProject?.name ?? "", logoBase64, projectMeta);
  }, [activeProject, logoBase64, projectMeta]);

  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MonthlyReport | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[1]?.value ?? "");
  const [monthlySummary, setMonthlySummary] = useState<any>(null);

  // Detail editing
  const [observations, setObservations] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [nextMonthPlan, setNextMonthPlan] = useState("");
  const [productionExecuted, setProductionExecuted] = useState("");
  const [testsPerformed, setTestsPerformed] = useState("");
  const [trainingSessions, setTrainingSessions] = useState("");

  const fetchReports = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await monthlyReportService.listByProject(activeProject.id);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Fetch monthly quality summary
  useEffect(() => {
    if (!activeProject) return;
    supabase.from("vw_monthly_quality_summary").select("*").eq("project_id", activeProject.id).single()
      .then(({ data }) => setMonthlySummary(data));
  }, [activeProject]);

  // Deadline alert logic
  const deadlineAlert = useMemo(() => {
    if (!activeProject) return null;
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 10);
    const hasSubmitted = reports.some(
      r => r.reference_month.startsWith(prevMonthStr.slice(0, 7)) && r.status !== "draft"
    );
    if (hasSubmitted) return null;

    const deadline = getDeadlineForMonth(prevMonthStr);
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);

    if (daysUntil < -30) return null; // too old

    return {
      overdue: daysUntil < 0,
      daysUntil,
      deadline,
      refMonth: prevMonthStr,
    };
  }, [reports, activeProject]);

  const openDetail = (report: MonthlyReport) => {
    setSelectedReport(report);
    setObservations(report.observations ?? "");
    setCorrectiveActions(report.corrective_actions ?? "");
    setNextMonthPlan(report.next_month_plan ?? "");
    setProductionExecuted((report as any).production_executed ?? "");
    setTestsPerformed((report as any).tests_performed ?? "");
    setTrainingSessions((report as any).training_sessions ?? "");
  };

  const handleCreate = async () => {
    if (!activeProject || !selectedMonth) return;
    setCreating(true);
    try {
      const report = await monthlyReportService.createDraft(activeProject.id, selectedMonth);
      toast({ title: t("monthlyReport.toast.created", { defaultValue: `Relatório ${report.code} criado` }) });
      setCreateOpen(false);
      await fetchReports();
      openDetail(report);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      await monthlyReportService.update(selectedReport.id, {
        observations: observations || null,
        corrective_actions: correctiveActions || null,
        next_month_plan: nextMonthPlan || null,
      });
      toast({ title: t("common.saved", { defaultValue: "Guardado" }) });
      await fetchReports();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (report: MonthlyReport) => {
    setSaving(true);
    try {
      await monthlyReportService.submit(report.id);
      toast({ title: t("monthlyReport.submitted") });
      setSelectedReport(null);
      await fetchReports();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await monthlyReportService.deleteDraft(deleteTarget.id);
      toast({ title: t("common.deleted", { defaultValue: "Eliminado" }) });
      if (selectedReport?.id === deleteTarget.id) setSelectedReport(null);
      await fetchReports();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  // ── Detail View ─────────────────────────────────────────────
  if (selectedReport) {
    const r = selectedReport;
    const refLabel = new Date(r.reference_month).toLocaleDateString("pt-PT", { year: "numeric", month: "long" });
    const onTime = isOnTime(r);

    const ncOverdue15d = (r as any).kpi_nc_overdue_15d ?? null;
    const rmOnTime = (r as any).kpi_rm_on_time ?? null;

    const kpis = [
      { label: t("monthlyReport.kpi.testsPass"), value: r.kpi_tests_pass_rate !== null ? `${r.kpi_tests_pass_rate}%` : "—", ok: r.kpi_tests_pass_rate !== null && r.kpi_tests_pass_rate >= 95 },
      { label: t("monthlyReport.kpi.ncOpen"), value: String(r.kpi_nc_open ?? 0), ok: (r.kpi_nc_open ?? 0) === 0 },
      { label: t("monthlyReport.kpi.ncClosed"), value: String(r.kpi_nc_closed_month ?? 0), ok: true },
      { label: t("monthlyReport.kpi.hpConfirmed"), value: `${r.kpi_hp_approved ?? 0}/${r.kpi_hp_total ?? 0}`, ok: r.kpi_hp_total ? r.kpi_hp_approved === r.kpi_hp_total : true },
      { label: t("monthlyReport.kpi.matApproved"), value: String(r.kpi_mat_approved ?? 0), ok: true },
      { label: t("monthlyReport.kpi.matPending"), value: String(r.kpi_mat_pending ?? 0), ok: (r.kpi_mat_pending ?? 0) === 0 },
      { label: t("monthlyReport.kpi.ppiCompleted"), value: String(r.kpi_ppi_completed ?? 0), ok: true },
      { label: t("monthlyReport.kpi.emesExpiring"), value: String(r.kpi_emes_expiring ?? 0), ok: (r.kpi_emes_expiring ?? 0) === 0 },
      { label: t("monthlyReport.kpi.ncOverdue15d"), value: ncOverdue15d !== null ? String(ncOverdue15d) : "—", ok: ncOverdue15d === null || ncOverdue15d === 0 },
      { label: t("monthlyReport.kpi.rmOnTime"), value: rmOnTime === true ? t("common.yes") : rmOnTime === false ? t("common.no") : "—", ok: rmOnTime !== false },
    ];

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{r.code}</h1>
            <p className="text-sm text-muted-foreground capitalize">{refLabel}</p>
          </div>
          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[r.status])}>
            {getStatusLabel(r.status, t)}
          </Badge>
          {onTime !== null && (
            <Badge variant="secondary" className={cn("text-xs", onTime ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
               {onTime ? t("monthlyReport.onTime") : t("monthlyReport.late")}
            </Badge>
          )}
        </div>

        {/* Test & Control Section Cards */}
        {(() => {
          const refDate = new Date(r.reference_month);
          const nextM = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
          return (
            <MonthlyReportTestCards
              projectId={activeProject.id}
              monthStart={r.reference_month}
              monthEnd={nextM.toISOString().slice(0, 10)}
            />
          );
        })()}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                <p className={cn("text-2xl font-black tabular-nums mt-1", k.ok ? "text-foreground" : "text-destructive")}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Editable sections */}
        {r.status === "draft" && canEdit ? (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>{t("monthlyReport.observations")}</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("monthlyReport.correctiveActions")}</Label>
              <Textarea value={correctiveActions} onChange={e => setCorrectiveActions(e.target.value)} rows={4} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("monthlyReport.nextMonthPlan")}</Label>
              <Textarea value={nextMonthPlan} onChange={e => setNextMonthPlan(e.target.value)} rows={4} />
            </div>
             <div className="flex items-center gap-2 justify-end">
               <Button variant="outline" size="sm" onClick={async () => {
                 if (!activeProject || !selectedReport) return;
                 try {
                   const { data, error } = await supabase.rpc("fn_monthly_kpi_autofill" as any, {
                     p_project_id: activeProject.id,
                     p_reference_month: selectedReport.reference_month,
                   });
                   if (error) throw error;
                   const kpis = data as any;
                   // Direct update via supabase since service type is narrow
                    await (supabase as any).from("monthly_quality_reports").update({
                      kpi_tests_pass_rate: kpis.kpi_tests_pass_rate,
                      kpi_nc_open: kpis.kpi_nc_open,
                      kpi_nc_closed_month: kpis.kpi_nc_closed_month,
                      kpi_hp_approved: kpis.kpi_hp_approved,
                      kpi_hp_total: kpis.kpi_hp_total,
                      kpi_mat_approved: kpis.kpi_mat_approved,
                      kpi_mat_pending: kpis.kpi_mat_pending,
                      kpi_ppi_completed: kpis.kpi_ppi_completed,
                      kpi_emes_expiring: kpis.kpi_emes_expiring,
                      kpi_nc_overdue_15d: kpis.kpi_nc_overdue_15d ?? null,
                      kpi_rm_on_time: kpis.kpi_rm_on_time ?? null,
                    }).eq("id", selectedReport.id);
                   toast({ title: t("monthlyReport.autofillDone") });
                   await fetchReports();
                   const updated = (await monthlyReportService.listByProject(activeProject.id)).find(r => r.id === selectedReport.id);
                   if (updated) openDetail(updated);
                 } catch (err: any) {
                   toast({ title: "Erro", description: err.message, variant: "destructive" });
                 }
               }}>
                 {t("monthlyReport.autofillKpis")}
               </Button>
               <Button variant="outline" onClick={handleSave} disabled={saving}>
                 {t("common.save")}
               </Button>
               <Button onClick={() => handleSubmit(r)} disabled={saving}>
                 <Send className="h-3.5 w-3.5 mr-1.5" />
                 {t("monthlyReport.submit")}
               </Button>
               <Button variant="outline" onClick={() => doPdf(r)}>
                 <FileText className="h-3.5 w-3.5 mr-1.5" />
                 PDF
               </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            {r.observations && (
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("monthlyReport.observations")}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.observations}</p>
              </CardContent></Card>
            )}
            {r.corrective_actions && (
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("monthlyReport.correctiveActions")}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.corrective_actions}</p>
              </CardContent></Card>
            )}
            {r.next_month_plan && (
              <Card><CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("monthlyReport.nextMonthPlan")}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.next_month_plan}</p>
              </CardContent></Card>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => doPdf(r)}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {t("monthlyReport.exportPdf")}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("monthlyReport.title", { defaultValue: "Relatório Mensal SGQ" })}
        subtitle={t("monthlyReport.subtitle", { defaultValue: "CE Cláusula 35.ª §11 — Relatório mensal de qualidade" })}
        icon={FileBarChart2}
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("monthlyReport.create")}
            </Button>
          ) : undefined
        }
      />

      {/* Deadline Alert */}
      {deadlineAlert && (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border",
            deadlineAlert.overdue
              ? "bg-destructive/5 border-destructive/30 text-destructive"
              : "bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400"
          )}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm flex-1">
            {deadlineAlert.overdue
              ? t("monthlyReport.deadlineOverdue", { days: Math.abs(deadlineAlert.daysUntil) })
              : t("monthlyReport.deadlineAlert", { date: deadlineAlert.deadline.toLocaleDateString("pt-PT"), days: deadlineAlert.daysUntil })}
          </span>
          <Button size="sm" variant="outline" onClick={() => {
            setSelectedMonth(deadlineAlert.refMonth);
            setCreateOpen(true);
          }}>
            {t("monthlyReport.createReport")}
          </Button>
        </div>
      )}

      {/* Monthly Quality Summary */}
      {monthlySummary && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("monthlyReport.currentMonth")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("monthlyReport.kpi.ncOpen"), value: monthlySummary.nc_open ?? 0 },
              { label: t("monthlyReport.kpi.ncClosed"), value: monthlySummary.nc_closed_this_month ?? 0 },
              { label: t("monthlyReport.hpConfirmed"), value: monthlySummary.hp_confirmed_this_month ?? 0 },
              { label: t("monthlyReport.betonagem"), value: monthlySummary.concrete_batches_month ?? 0 },
              { label: t("monthlyReport.soldaduras"), value: monthlySummary.welds_month ?? 0 },
              { label: t("monthlyReport.topografia"), value: monthlySummary.topo_controls_month ?? 0 },
              { label: t("monthlyReport.partesDiarios"), value: monthlySummary.daily_reports_month ?? 0 },
            ].map((k, i) => (
              <Card key={i} className="border-0 bg-card shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-black tabular-nums mt-1 text-foreground">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileBarChart2}
          titleKey="monthlyReport.emptyTitle"
          subtitleKey="monthlyReport.emptySubtitle"
          ctaKey="monthlyReport.create"
          onCta={canCreate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const refLabel = new Date(r.reference_month).toLocaleDateString("pt-PT", { year: "numeric", month: "long" });
            const deadline = getDeadlineForMonth(r.reference_month);
            const onTime = isOnTime(r);
            const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / 86400000);

            return (
              <Card key={r.id} className="border-0 bg-card shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => openDetail(r)}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">{r.code}</span>
                      <Badge variant="secondary" className={cn("text-[10px]", STATUS_COLORS[r.status])}>
                        {getStatusLabel(r.status, t)}
                      </Badge>
                      {onTime !== null && (
                        <Badge variant="secondary" className={cn("text-[10px]", onTime ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
                          {onTime ? t("monthlyReport.onTime") : t("monthlyReport.late")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">{refLabel}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    {r.submitted_at ? (
                      <span>{t("monthlyReport.submittedAt")} {new Date(r.submitted_at).toLocaleDateString("pt-PT")}</span>
                    ) : r.status === "draft" ? (
                      <span className={cn(daysUntil <= 0 ? "text-destructive font-bold" : daysUntil <= 5 ? "text-amber-500 font-bold" : "")}>
                        {t("monthlyReport.deadline")}: {deadline.toLocaleDateString("pt-PT")}
                      </span>
                    ) : null}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <RowActionMenu
                      actions={[
                        { key: "view", labelKey: "common.view", onClick: () => openDetail(r) },
                        { key: "pdf", labelKey: "common.export", onClick: () => doPdf(r) },
                        ...(r.status === "draft" && canEdit ? [{ key: "submit", labelKey: "monthlyReport.submit", onClick: () => handleSubmit(r) }] : []),
                        ...(r.status === "draft" && canDelete ? [{ key: "delete", labelKey: "common.delete", onClick: () => setDeleteTarget(r), variant: "destructive" as const }] : []),
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("monthlyReport.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>{t("monthlyReport.refMonth")}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map(o => (
                    <SelectItem key={o.value} value={o.value} className="capitalize">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("monthlyReport.kpiAutoFill")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !selectedMonth}>
              {creating ? t("common.loading") : t("monthlyReport.createReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("monthlyReport.deleteConfirm", { code: deleteTarget?.code })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

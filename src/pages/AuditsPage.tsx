import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import {
  qualityAuditService,
  type QualityAudit,
  type QualityAuditInput,
} from "@/lib/services/qualityAuditService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarClock, Plus, FileText, FileDown, Loader2, AlertTriangle as AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { exportPAI } from "@/lib/services/sgqListExportService";
import { useReportMeta } from "@/hooks/useReportMeta";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import jsPDF from "jspdf";

const TYPE_KEYS: Record<string, string> = {
  internal: "audits.types.internal",
  external: "audits.types.external",
  surveillance: "audits.types.surveillance",
  closing: "audits.types.closing",
};

const STATUS_KEYS: Record<string, string> = {
  planned: "audits.statuses.planned",
  in_progress: "audits.statuses.inProgress",
  completed: "audits.statuses.completed",
  cancelled: "audits.statuses.cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
};

const TYPE_COLORS: Record<string, string> = {
  internal: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  external: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  surveillance: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  closing: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export default function AuditsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate, canEdit, canDelete } = useProjectRole();
  const reportMeta = useReportMeta();
  const { logoBase64 } = useProjectLogo();

  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editAudit, setEditAudit] = useState<QualityAudit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QualityAudit | null>(null);
  const [saving, setSaving] = useState(false);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [ncAudit, setNcAudit] = useState<QualityAudit | null>(null);

  // Form fields
  const [fAuditType, setFAuditType] = useState("internal");
  const [fPlannedDate, setFPlannedDate] = useState("");
  const [fAuditorName, setFAuditorName] = useState("");
  const [fScope, setFScope] = useState("");
  const [fFindings, setFFindings] = useState("");
  const [fObservations, setFObservations] = useState("");
  const [fNcCount, setFNcCount] = useState(0);
  const [fObsCount, setFObsCount] = useState(0);
  const [fReportRef, setFReportRef] = useState("");
  const [fCompletedDate, setFCompletedDate] = useState("");

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await qualityAuditService.listByProject(activeProject.id);
      setAudits(data);
    } catch {
      toast.error("Erro ao carregar auditorias");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditAudit(null);
    setFAuditType("internal");
    setFPlannedDate("");
    setFAuditorName("");
    setFScope("");
    setFFindings("");
    setFObservations("");
    setFNcCount(0);
    setFObsCount(0);
    setFReportRef("");
    setFCompletedDate("");
    setFormOpen(true);
  }

  function openEdit(audit: QualityAudit) {
    setEditAudit(audit);
    setFAuditType(audit.audit_type);
    setFPlannedDate(audit.planned_date);
    setFAuditorName(audit.auditor_name ?? "");
    setFScope(audit.scope ?? "");
    setFFindings(audit.findings ?? "");
    setFObservations(audit.observations ?? "");
    setFNcCount(audit.nc_count);
    setFObsCount(audit.obs_count);
    setFReportRef(audit.report_ref ?? "");
    setFCompletedDate(audit.completed_date ?? "");
    setFormOpen(true);
  }

  async function handleSave() {
    if (!activeProject || !fPlannedDate) return;
    setSaving(true);
    try {
      if (editAudit) {
        await qualityAuditService.update(editAudit.id, {
          audit_type: fAuditType as any,
          planned_date: fPlannedDate,
          auditor_name: fAuditorName || null,
          scope: fScope || null,
          findings: fFindings || null,
          observations: fObservations || null,
          nc_count: fNcCount,
          obs_count: fObsCount,
          report_ref: fReportRef || null,
          completed_date: fCompletedDate || null,
        });
        toast.success("Auditoria atualizada");
      } else {
        await qualityAuditService.create({
          project_id: activeProject.id,
          audit_type: fAuditType,
          planned_date: fPlannedDate,
          auditor_name: fAuditorName || undefined,
          scope: fScope || undefined,
        });
        toast.success("Auditoria criada");
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await qualityAuditService.delete(deleteTarget.id);
      toast.success("Auditoria cancelada");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleStatusTransition(audit: QualityAudit) {
    const next = audit.status === "planned" ? "in_progress" : audit.status === "in_progress" ? "completed" : null;
    if (!next) return;
    try {
      const updates: Partial<QualityAudit> = { status: next as any };
      if (next === "completed") updates.completed_date = new Date().toISOString().slice(0, 10);
      await qualityAuditService.update(audit.id, updates);
      toast.success(t("audits.statuses.transitionSuccess", { status: t(STATUS_KEYS[next]) }));
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("audits.title", { defaultValue: "Programa de Auditorias" })}
        subtitle={t("audits.subtitle", { defaultValue: "Auditorias internas e externas do programa de qualidade" })}
        icon={CalendarClock}
        actions={
          <div className="flex items-center gap-2">
            <ReportExportMenu
              options={[
                {
                  label: t("audits.exportPdf"),
                  icon: "pdf",
                  action: async () => {
                    if (!reportMeta) return;
                    await exportPAI(audits, reportMeta);
                  },
                },
                {
                  label: t("audits.exportListPdf"),
                  icon: "pdf",
                  action: () => {
                    const doc = new jsPDF({ unit: "mm", format: "a4" });
                    const projectName = `${activeProject.code} — ${activeProject.name}`;
                    const date = new Date().toLocaleDateString("pt-PT");
                    let html = `<html><head><style>
                      body{font-family:Arial,sans-serif;font-size:9px;color:#1a1a1a;padding:16px}
                      table{width:100%;border-collapse:collapse;margin-top:10px}
                      th{background:#192F48;color:#fff;padding:5px 4px;font-size:8px;text-align:left}
                      td{border:1px solid #e2e8f0;padding:4px;font-size:8px}
                    </style></head><body>`;
                    html += fullPdfHeader(logoBase64, projectName, "PAI-" + activeProject.code, "0", date);
                    html += `<h2 style="text-align:center;font-size:12px;color:#192F48;margin:8px 0">${t("audits.title")}</h2>`;
                    html += `<table><tr><th>${t("common.code")}</th><th>${t("audits.type")}</th><th>${t("common.date")}</th><th>${t("audits.auditor")}</th><th>${t("audits.scope")}</th><th>${t("audits.findings")}</th><th>${t("common.status")}</th></tr>`;
                    audits.forEach(a => {
                      html += `<tr><td>${a.code}</td><td>${t(TYPE_KEYS[a.audit_type])}</td><td>${new Date(a.planned_date).toLocaleDateString("pt-PT")}</td><td>${a.auditor_name ?? "—"}</td><td>${a.scope ?? "—"}</td><td>${a.findings ?? "—"}</td><td>${t(STATUS_KEYS[a.status])}</td></tr>`;
                    });
                    html += `</table></body></html>`;
                    doc.html(html, { callback: d => d.save(`Auditorias_${activeProject.code}.pdf`), x: 8, y: 5, width: 190, windowWidth: 900 });
                  },
                },
              ]}
            />
            {canCreate && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("audits.create")}
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("audits.emptyTitle", { defaultValue: "Nenhuma auditoria registada" })}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("audits.emptyDescription", { defaultValue: "O programa anual de auditorias deve ser definido no PQO. Crie a primeira auditoria para iniciar o registo." })}
          </p>
          {canCreate && (
            <Button size="sm" className="mt-6" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Auditoria
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map(audit => (
            <Card key={audit.id} className="border-0 bg-card shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">{audit.code}</span>
                      <Badge variant="outline" className={cn("text-[10px]", TYPE_COLORS[audit.audit_type])}>
                        {t(TYPE_KEYS[audit.audit_type]) ?? audit.audit_type}
                      </Badge>
                      <Badge variant="secondary" className={cn("text-[10px]", STATUS_COLORS[audit.status])}>
                        {t(STATUS_KEYS[audit.status]) ?? audit.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>{new Date(audit.planned_date).toLocaleDateString("pt-PT")}</span>
                      {audit.auditor_name && <span>Auditor: {audit.auditor_name}</span>}
                      {audit.nc_count > 0 && <span className="text-destructive font-medium">{audit.nc_count} NC</span>}
                      {audit.obs_count > 0 && <span className="text-amber-600 font-medium">{audit.obs_count} OBS</span>}
                    </div>
                    {audit.scope && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{audit.scope}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(audit.status === "planned" || audit.status === "in_progress") && canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleStatusTransition(audit)}
                      >
                        {audit.status === "planned" ? "Iniciar" : "Concluir"}
                      </Button>
                    )}

                    <RowActionMenu
                      actions={[
                        ...(canEdit ? [{ key: "edit", labelKey: "common.edit", onClick: () => openEdit(audit) }] : []),
                        { key: "export", label: "Exportar RAI (PDF)", onClick: () => qualityAuditService.exportRaiPdf(audit, activeProject.name ?? "Projeto", logoBase64) },
                        ...(canDelete ? [{ key: "delete", labelKey: "common.delete", onClick: () => setDeleteTarget(audit), variant: "destructive" as const }] : []),
                      ]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAudit ? "Editar Auditoria" : "Nova Auditoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select value={fAuditType} onValueChange={setFAuditType}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interna</SelectItem>
                    <SelectItem value="external">Externa</SelectItem>
                    <SelectItem value="surveillance">Vigilância</SelectItem>
                    <SelectItem value="closing">Encerramento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data Planeada *</Label>
                <Input type="date" value={fPlannedDate} onChange={e => setFPlannedDate(e.target.value)} className="text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Auditor</Label>
              <Input value={fAuditorName} onChange={e => setFAuditorName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Âmbito</Label>
              <Textarea value={fScope} onChange={e => setFScope(e.target.value)} rows={2} className="text-sm resize-none" />
            </div>

            {editAudit && (
              <>
                <div>
                  <Label className="text-xs">Constatações</Label>
                  <Textarea value={fFindings} onChange={e => setFFindings(e.target.value)} rows={3} className="text-sm resize-none" />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={fObservations} onChange={e => setFObservations(e.target.value)} rows={2} className="text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">N.º NCs</Label>
                    <Input type="number" min={0} value={fNcCount} onChange={e => setFNcCount(Number(e.target.value))} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">N.º Observações</Label>
                    <Input type="number" min={0} value={fObsCount} onChange={e => setFObsCount(Number(e.target.value))} className="text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data Conclusão</Label>
                    <Input type="date" value={fCompletedDate} onChange={e => setFCompletedDate(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Ref. Relatório</Label>
                    <Input value={fReportRef} onChange={e => setFReportRef(e.target.value)} placeholder="RAI-001" className="text-sm" />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !fPlannedDate}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editAudit ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende cancelar esta auditoria?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

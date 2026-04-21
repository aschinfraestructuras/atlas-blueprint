import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, AlertTriangle, Calendar, Clock, User, Tag, Pencil,
  CheckCircle2, RotateCcw, Archive, Loader2, Eye,
  FileText, Shield, Link2, ClipboardList, Printer, FileDown, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ncService, type NonConformity } from "@/lib/services/ncService";
import { auditService, type AuditEntry } from "@/lib/services/auditService";
import {
  exportNCPdf,
  buildNCDetailHtml,
  type NCExportLabels,
} from "@/lib/services/ncExportService";
import { PdfPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { buildHtmlPreviewUrl, revokeHtmlPreviewUrl } from "@/lib/utils/htmlPreview";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { cn } from "@/lib/utils";
import { getNCTransitions, canDeleteNC, canEditNC } from "@/lib/stateMachines";
import { NotifyEmailButton, NotificationHistory } from "@/components/notifications/EmailNotificationSection";
import { NCSourceBadge } from "@/components/nc/NCSourceBadge";

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  minor:    "bg-muted text-muted-foreground border-border",
  major:    "bg-primary/10 text-primary border-primary/20",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  low:      "bg-muted text-muted-foreground border-border",
  medium:   "bg-primary/10 text-primary border-primary/20",
  high:     "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_COLORS: Record<string, string> = {
  draft:                "bg-muted/60 text-muted-foreground",
  open:                 "bg-destructive/10 text-destructive",
  in_progress:          "bg-primary/10 text-primary",
  pending_verification: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  closed:               "bg-green-500/10 text-green-700 dark:text-green-400",
  archived:             "bg-muted text-muted-foreground",
};

const ORIGIN_ICON: Record<string, typeof AlertTriangle> = {
  ppi:      ClipboardList,
  test:     FileText,
  document: FileText,
  audit:    Shield,
  manual:   AlertTriangle,
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:w-40 flex-shrink-0 sm:mt-0.5">
        {label}
      </span>
      <span className={cn("text-sm text-foreground flex-1", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof AlertTriangle }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {children}
      </CardContent>
    </Card>
  );
}

function CapaField({ label, value, required = false, highlight = false }: {
  label: string; value?: string | null; required?: boolean; highlight?: boolean;
}) {
  const filled = !!value;
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      highlight && !filled ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20" :
      filled ? "border-border bg-card" : "border-border/50 bg-muted/20"
    )}>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex-1">{label}</p>
        {required && !filled && (
          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
            Obrigatório
          </span>
        )}
        {filled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
      </div>
      {filled ? (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60 italic">—</p>
      )}
    </div>
  );
}

// ─── Status Stepper ───────────────────────────────────────────────────────────

const NC_FLOW = ["draft", "open", "in_progress", "pending_verification", "closed"] as const;

function NCStatusStepper({ currentStatus }: { currentStatus: string }) {
  const { t } = useTranslation();
  const currentIdx = NC_FLOW.indexOf(currentStatus as any);

  return (
    <div className="flex items-center justify-between gap-1 px-2 py-3 rounded-xl border bg-card overflow-x-auto">
      {NC_FLOW.map((step, i) => {
        const isPast = currentIdx > i;
        const isCurrent = currentIdx === i;
        return (
          <div key={step} className="flex items-center gap-1 flex-1 min-w-0 flex-shrink-0">
            <div className={cn(
              "flex items-center justify-center rounded-full h-7 w-7 flex-shrink-0 text-xs font-bold transition-colors",
              isPast && "bg-green-500/15 text-green-600 dark:text-green-400",
              isCurrent && "bg-primary text-primary-foreground",
              !isPast && !isCurrent && "bg-muted text-muted-foreground",
            )}>
              {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-medium truncate",
              isCurrent ? "text-primary font-bold" : isPast ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
            )}>
              {t(`nc.statusFlow.${step}`, { defaultValue: step })}
            </span>
            {i < NC_FLOW.length - 1 && (
              <div className={cn(
                "flex-1 h-px mx-1",
                isPast ? "bg-green-500/40" : "bg-border",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NCDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/non-conformities", { replace: true });
    }
  }, [id, navigate, t]);

  const [nc, setNc] = useState<NonConformity | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { logoBase64 } = useProjectLogo();

  // PDF preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => () => revokeHtmlPreviewUrl(previewUrl), [previewUrl]);

  const loadNc = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ncService.getById(id);
      setNc(data);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadLogs = useCallback(async () => {
    if (!activeProject || !id) return;
    setLogsLoading(true);
    try {
      const logs = await auditService.getByProject(activeProject.id, { module: "non_conformities" });
      setAuditLogs(logs.filter(l => l.entity_id === id));
    } catch {
      // non-critical
    } finally {
      setLogsLoading(false);
    }
  }, [activeProject, id]);

  useEffect(() => { loadNc(); loadLogs(); }, [loadNc, loadLogs]);

  const handleTransition = async (toStatus: string) => {
    if (!nc) return;
    setTransitioning(true);
    try {
      await ncService.updateStatus(nc.id, toStatus);
      toast({ title: t("nc.toast.statusChanged", { status: t(`nc.status.${toStatus}`) }) });
      loadNc();
      loadLogs();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setTransitioning(false);
    }
  };

  const handleExportPdf = async () => {
    if (!nc || !activeProject) return;
    setExporting(true);
    try {
      const labels: NCExportLabels = {
        appName: "Atlas QMS", reportTitle: t("nc.export.reportTitle", { defaultValue: "Relatório de Não Conformidade" }),
        bulkTitle: t("nc.export.bulkTitle", { defaultValue: "Relatório de NCs" }),
        wiSummaryTitle: t("nc.export.wiSummaryTitle", { defaultValue: "Resumo NC por Work Item" }),
        generatedOn: t("nc.export.generatedOn", { defaultValue: "Gerado em" }),
        page: t("nc.export.page", { defaultValue: "Página" }), of: t("nc.export.of", { defaultValue: "de" }),
        code: t("nc.table.code"), title: t("nc.form.title"), description: t("nc.form.description"),
        severity: t("nc.table.severity"), category: t("nc.form.category"), origin: t("nc.table.origin"),
        status: t("common.status"), responsible: t("nc.table.responsible"), assignedTo: t("nc.detail.assignedTo"),
        detectedAt: t("nc.form.detectedAt"), dueDate: t("nc.table.dueDate"), closureDate: t("nc.detail.closureDate"),
        reference: t("nc.table.reference"), workItem: t("nc.detail.workItem"),
        capaTitle: t("nc.form.tabs.capa"), correction: t("nc.form.correction"), rootCause: t("nc.form.rootCause"),
        correctiveAction: t("nc.form.correctiveAction"), preventiveAction: t("nc.form.preventiveAction"),
        verificationMethod: t("nc.form.verificationMethod"), verificationResult: t("nc.form.verificationResult"),
        verifiedBy: t("nc.detail.verifiedBy"), verifiedAt: t("nc.detail.verifiedAt"),
        wiSector: t("workItems.detail.sector", { defaultValue: "Sector" }),
        wiBySeverity: t("nc.export.wiBySeverity", { defaultValue: "Por Gravidade" }),
        wiByStatus: t("nc.export.wiByStatus", { defaultValue: "Por Estado" }),
        wiOpenNcs: t("nc.export.wiOpenNcs", { defaultValue: "NCs em Aberto" }),
        severity_minor: t("nc.severity.minor"), severity_major: t("nc.severity.major"), severity_critical: t("nc.severity.critical"),
        status_draft: t("nc.status.draft"), status_open: t("nc.status.open"), status_in_progress: t("nc.status.in_progress"),
        status_pending_verification: t("nc.status.pending_verification"), status_closed: t("nc.status.closed"), status_archived: t("nc.status.archived"),
        origin_manual: t("nc.origin.manual"), origin_ppi: t("nc.origin.ppi"), origin_test: t("nc.origin.test"),
        origin_document: t("nc.origin.document"), origin_audit: t("nc.origin.audit"),
      };
      await exportNCPdf(nc, labels, activeProject.name, logoBase64, activeProject.code);
    } catch {
      toast({ title: t("nc.export.noData", { defaultValue: "Erro ao exportar" }), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!nc || !activeProject) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("non_conformities")
        .delete()
        .eq("id", nc.id);
      if (error) throw error;
      toast({ title: t("nc.toast.deleted", { defaultValue: "NC eliminada." }) });
      navigate("/non-conformities");
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!nc) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">{t("nc.detail.notFound")}</p>
    </div>
  );

  const transitions = getNCTransitions(nc.status);
  const OriginIcon = ORIGIN_ICON[nc.origin] ?? AlertTriangle;
  const canDelete  = canDeleteNC(nc.status);
  const canEdit    = canEditNC(nc.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/non-conformities")} className="mt-0.5 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("pages.nonConformities.title")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{nc.code ?? nc.reference ?? nc.id.slice(0, 8)}</span>
              {/* Aging badge — dias em aberto */}
              {nc.status !== "closed" && nc.status !== "archived" && (() => {
                const created = new Date(nc.detected_at ?? nc.created_at);
                const days = Math.floor((Date.now() - created.getTime()) / 86400000);
                const isOverdue = nc.due_date && new Date(nc.due_date) < new Date();
                return (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isOverdue
                      ? "bg-destructive/15 text-destructive border border-destructive/30"
                      : days > 30
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  )}>
                    <Clock className="h-3 w-3" />
                    {days}d
                  </span>
                );
              })()}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl line-clamp-2">
              {nc.title ?? nc.description}
            </p>
          </div>
        </div>

        {/* Actions — scrollable on mobile */}
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto pb-1 -mb-1 sm:pb-0 sm:mb-0 sm:flex-wrap">
          <NotifyEmailButton
            projectId={activeProject!.id}
            entityType="nc"
            entityId={nc.id}
            entityCode={nc.code ?? nc.reference}
            defaultSubject={`NC — ${nc.code ?? nc.reference ?? ""} — ${nc.title ?? ""}`}
          />
          {transitions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {transitions.map(s => {
                const cfg: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary"; cls: string }> = {
                  open:                 { label: t("nc.transitions.open",                 { defaultValue: "Abrir" }),              variant: "default",     cls: "" },
                  in_progress:          { label: t("nc.transitions.in_progress",          { defaultValue: "Iniciar" }),            variant: "default",     cls: "" },
                  pending_verification: { label: t("nc.transitions.pending_verification", { defaultValue: "Para Verificação" }),   variant: "secondary",   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-500/25" },
                  closed:               { label: t("nc.transitions.closed",               { defaultValue: "Encerrar" }),           variant: "secondary",   cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-500/25" },
                  archived:             { label: t("nc.transitions.archived",             { defaultValue: "Arquivar" }),           variant: "outline",     cls: "text-muted-foreground" },
                };
                const c = cfg[s] ?? { label: t(`nc.transitions.${s}`, { defaultValue: s }), variant: "outline" as const, cls: "" };
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={c.variant}
                    disabled={transitioning}
                    className={cn("gap-1.5 flex-shrink-0 text-xs", c.cls)}
                    onClick={() => handleTransition(s)}
                  >
                    {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {c.label}
                  </Button>
                );
              })}
            </div>
          )}
          <Button
            size="sm" variant="outline"
            onClick={() => handleExportPdf()}
            className="gap-1.5 flex-shrink-0"
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t("common.exportPdf", { defaultValue: "Exportar PDF" })}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 flex-shrink-0">
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.edit")}</span>
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="gap-1.5 flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.delete")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Status Stepper ──────────────────────────────────────────────── */}
      <NCStatusStepper currentStatus={nc.status} />

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge className={cn("text-sm px-3 py-1", STATUS_COLORS[nc.status])}>
          {t(`nc.status.${nc.status}`, { defaultValue: nc.status })}
        </Badge>
        <Badge variant="outline" className={cn("text-sm px-3 py-1 border", SEVERITY_COLORS[nc.severity])}>
          {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
          <OriginIcon className="h-3.5 w-3.5" />
          {t(`nc.origin.${nc.origin}`, { defaultValue: nc.origin })}
        </Badge>
        {nc.origin === "audit" && nc.audit_origin_type && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            {t(`nc.auditOrigin.${nc.audit_origin_type}`, { defaultValue: nc.audit_origin_type })}
          </Badge>
        )}
        <Badge variant="outline" className="text-sm px-3 py-1">
          {t(`nc.category.${nc.category}`, { defaultValue: nc.category })}
          {nc.category === "outros" && nc.category_outro && ` — ${nc.category_outro}`}
        </Badge>
        {nc.classification && (
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1 border",
            nc.classification === "C" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" :
            nc.classification === "AC" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" :
            nc.classification === "maior" ? "bg-destructive/10 text-destructive border-destructive/30" :
            "bg-muted text-muted-foreground border-border"
          )}>
            {nc.classification === "C" ? t("nc.classificationCE.C", { defaultValue: "Correção" }) :
             nc.classification === "AC" ? t("nc.classificationCE.AC", { defaultValue: "Ação Corretiva" }) :
             t(`nc.classification.${nc.classification}`, { defaultValue: nc.classification })}
          </Badge>
        )}
        {nc.due_date && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border",
            new Date(nc.due_date) < new Date() && nc.status !== "closed" && nc.status !== "archived"
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-muted text-muted-foreground border-border"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            {t("nc.detail.dueDate")}: {new Date(nc.due_date + "T00:00:00").toLocaleDateString()}
          </div>
        )}
      </div>

      {/* ── Origem dura: ensaio / PPI / frente que originaram esta NC ── */}
      <NCSourceBadge
        testResultId={nc.test_result_id}
        ppiInstanceId={nc.ppi_instance_id}
        workItemId={nc.work_item_id}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="description">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center">
          <TabsTrigger value="description" className="gap-1.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("nc.detail.tabs.description")}</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="capa" className="gap-1.5 flex-shrink-0">
            <Shield className="h-3.5 w-3.5" />
            CAPA
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("documents.linkedPanel.title")}</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5 flex-shrink-0">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("nc.detail.tabs.attachments")}</span>
            <span className="sm:hidden">Anexos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 flex-shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("nc.detail.tabs.history")}</span>
            <span className="sm:hidden">Hist.</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Descrição ──────────────────────────────────────────── */}
        <TabsContent value="description" className="mt-4 space-y-4">
          <SectionCard title={t("nc.detail.identification")} icon={AlertTriangle}>
            <InfoRow label={t("nc.table.code")} value={nc.code} mono />
            <InfoRow label={t("nc.form.title")} value={nc.title} />
            <InfoRow label={t("nc.form.description")} value={
              <span className="whitespace-pre-wrap">{nc.description}</span>
            } />
            <InfoRow label={t("nc.table.reference")} value={nc.reference} mono />
            <InfoRow label={t("nc.form.detectedAt")} value={
              nc.detected_at ? new Date(nc.detected_at + "T00:00:00").toLocaleDateString() : undefined
            } />
          </SectionCard>

          <SectionCard title={t("nc.detail.responsibility")} icon={User}>
            <InfoRow label={t("nc.table.responsible")} value={nc.responsible} />
            <InfoRow label={t("nc.detail.assignedTo")} value={nc.assigned_to} />
            <InfoRow label={t("nc.detail.owner")} value={nc.owner} />
            <InfoRow label={t("nc.detail.approver")} value={nc.approver} />
          </SectionCard>

          {/* Links to related entities */}
          {(nc.work_item_id || nc.ppi_instance_id || nc.test_result_id) && (
            <SectionCard title={t("nc.detail.linkedTo")} icon={Link2}>
              {nc.work_item_id && (
                <InfoRow label={t("nc.detail.workItem")} value={
                  <Link to={`/work-items/${nc.work_item_id}`} className="text-primary underline underline-offset-2 text-sm">
                    {t("nc.detail.viewWorkItem")}
                  </Link>
                } />
              )}
              {nc.ppi_instance_id && (
                <InfoRow label={t("nc.detail.ppiInstance")} value={
                  <Link to={`/ppi/${nc.ppi_instance_id}`} className="text-primary underline underline-offset-2 text-sm">
                    {t("nc.detail.viewPpi")}
                  </Link>
                } />
              )}
            </SectionCard>
          )}

          {/* Verification */}
          {(nc.verification_method || nc.verification_result || nc.verified_by || nc.verified_at) && (
            <SectionCard title={t("nc.detail.verification")} icon={CheckCircle2}>
              <InfoRow label={t("nc.form.verificationMethod")} value={nc.verification_method} />
              <InfoRow label={t("nc.form.verificationResult")} value={nc.verification_result} />
              <InfoRow label={t("nc.detail.verifiedBy")} value={nc.verified_by} />
              {nc.verified_at && (
                <InfoRow label={t("nc.detail.verifiedAt")} value={
                  new Date(nc.verified_at).toLocaleString()
                } />
              )}
              {nc.closure_date && (
                <InfoRow label={t("nc.detail.closureDate")} value={
                  new Date(nc.closure_date + "T00:00:00").toLocaleDateString()
                } />
              )}
            </SectionCard>
          )}
        </TabsContent>

        {/* ── TAB: CAPA ──────────────────────────────────────────────── */}
        <TabsContent value="capa" className="mt-4">
          <SectionCard title={t("nc.form.tabs.capa")} icon={Shield}>
            <div className="space-y-6">
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-2 text-xs text-muted-foreground">
                {t("nc.form.capaHint")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CapaField label={t("nc.form.correction")}       value={nc.correction}        highlight />
                <CapaField label={t("nc.form.rootCause")}        value={nc.root_cause}        highlight required={nc.severity === "major" || nc.severity === "critical"} />
                <CapaField label={t("nc.form.correctiveAction")} value={nc.corrective_action} highlight required={nc.severity === "major" || nc.severity === "critical"} />
                <CapaField label={t("nc.form.preventiveAction")} value={nc.preventive_action} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CapaField label={t("nc.form.verificationMethod")} value={nc.verification_method} />
                <CapaField label={t("nc.form.verificationResult")} value={nc.verification_result} />
              </div>

              {/* Seguimento CE */}
              {(nc.actual_completion_date || nc.deviation_justification || nc.efficacy_analysis) && (
                <>
                  <Separator />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("nc.form.seguimentoSection", { defaultValue: "Seguimento CE" })}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CapaField label={t("nc.form.actualCompletionDate", { defaultValue: "Data Real de Implementação" })} value={
                      nc.actual_completion_date ? new Date(nc.actual_completion_date + "T00:00:00").toLocaleDateString() : null
                    } />
                    {nc.due_date && (
                      <CapaField label={t("nc.table.dueDate")} value={
                        new Date(nc.due_date + "T00:00:00").toLocaleDateString()
                      } />
                    )}
                  </div>
                  <CapaField label={t("nc.form.deviationJustification", { defaultValue: "Justificação de Desvios" })} value={nc.deviation_justification} />
                  <CapaField label={t("nc.form.efficacyAnalysis", { defaultValue: "Análise de Eficácia" })} value={nc.efficacy_analysis} />
                </>
              )}

              {(!nc.correction && !nc.root_cause && !nc.corrective_action && !nc.preventive_action) && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Shield className="h-8 w-8 opacity-30" />
                  <p className="text-sm">{t("nc.detail.capaEmpty")}</p>
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="mt-2 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    {t("nc.detail.fillCapa")}
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <LinkedDocumentsPanel
            entityType="non_conformity"
            entityId={nc.id}
            projectId={nc.project_id}
          />
        </TabsContent>

        {/* ── TAB: Evidências ─────────────────────────────────────────── */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="non_conformities"
            entityId={nc.id}
            projectId={nc.project_id}
            cameraProminent={true}
          />
        </TabsContent>

        {/* ── TAB: Histórico ──────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("nc.detail.tabs.history")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {logsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Clock className="h-6 w-6 opacity-30" />
                  <p className="text-sm">{t("nc.detail.historyEmpty")}</p>
                </div>
              ) : (
                <ol className="relative border-l border-border/60 ml-3 space-y-0">
                  {auditLogs.map((log) => {
                    const isStatusChange = log.action === "STATUS_CHANGE" || log.action === "status_change";
                    const isInsert = log.action === "INSERT";
                    const isDelete = log.action === "DELETE";

                    // Human-readable action label
                    const actionLabel = isInsert ? t("nc.history.created", { defaultValue: "Criada" })
                      : isStatusChange ? t("nc.history.statusChanged", { defaultValue: "Estado alterado" })
                      : isDelete ? t("nc.history.deleted", { defaultValue: "Eliminada" })
                      : t("nc.history.updated", { defaultValue: "Atualizada" });

                    // Human-readable diff (status change)
                    let humanDiff: string | null = null;
                    if (isStatusChange && log.diff && typeof log.diff === "object") {
                      const d = log.diff as Record<string, unknown>;
                      const from = d.from ?? d.status_from;
                      const to   = d.to   ?? d.status_to;
                      if (from && to) {
                        humanDiff = `${t(`nc.status.${from}`, { defaultValue: String(from) })} → ${t(`nc.status.${to}`, { defaultValue: String(to) })}`;
                      }
                    }

                    // For UPDATE, summarise changed fields
                    let updatedFields: string[] | null = null;
                    if (!isInsert && !isStatusChange && log.diff && typeof log.diff === "object") {
                      updatedFields = Object.keys(log.diff as object).filter(k => k !== "updated_at");
                    }

                    return (
                      <li key={log.id} className="mb-5 ml-5 relative">
                        <div className="absolute -left-[22px] mt-1 h-3 w-3 rounded-full border border-border bg-background" />
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            isInsert      ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                            isStatusChange? "bg-primary/10 text-primary" :
                            isDelete      ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {actionLabel}
                          </span>
                          <time className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </time>
                        </div>
                        {log.description && (
                          <p className="text-sm text-foreground">{log.description}</p>
                        )}
                        {humanDiff && (
                          <p className="text-sm text-foreground font-medium">{humanDiff}</p>
                        )}
                        {updatedFields && updatedFields.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("nc.history.fieldsUpdated", { defaultValue: "Campos: " })}
                            {updatedFields.map(f => t(`nc.form.${f}`, { defaultValue: f })).join(", ")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email notification history */}
      {activeProject && <NotificationHistory projectId={activeProject.id} entityType="nc" entityId={nc.id} />}

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <NCFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        nc={nc}
        onSuccess={() => { loadNc(); loadLogs(); }}
      />

      {/* ── Delete draft dialog ─────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nc.deleteDialog.title", { defaultValue: "Eliminar NC?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("nc.deleteDialog.description", { defaultValue: "Esta ação é irreversível. A NC será eliminada permanentemente." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

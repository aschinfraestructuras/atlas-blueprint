import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, FileText, CheckCircle2, Clock, RotateCcw,
  Upload, ExternalLink, Download, Archive, Loader2, FileUp,
} from "lucide-react";
import { planService, PLAN_STATUS_TRANSITIONS } from "@/lib/services/planService";
import type { Plan } from "@/lib/services/planService";
import { documentService } from "@/lib/services/documentService";
import type { DocumentVersion } from "@/lib/services/documentService";
import { exportPlanDetailPdf } from "@/lib/services/planExportService";
import { attachmentService, getSignedUrlForPath } from "@/lib/services/attachmentService";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { ControlledCopiesPanel } from "@/components/plans/ControlledCopiesPanel";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { cn } from "@/lib/utils";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-primary/15 text-primary",
  approved: "bg-chart-2/15 text-chart-2 font-semibold",
  obsolete: "bg-amber-500/15 text-amber-600",
  archived: "bg-muted/60 text-muted-foreground",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-32 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(fileName: string | null | undefined): boolean {
  return !!fileName && fileName.toLowerCase().endsWith(".pdf");
}

function isDwg(fileName: string | null | undefined): boolean {
  return !!fileName && (fileName.toLowerCase().endsWith(".dwg") || fileName.toLowerCase().endsWith(".dxf"));
}

export default function PlanDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { logoBase64 } = useProjectLogo();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/plans", { replace: true });
    }
  }, [id, navigate, t]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changeDesc, setChangeDesc] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await planService.getById(id);
      setPlan(data);
    } catch {
      toast({ title: t("plans.toast.error"), variant: "destructive" });
      navigate("/plans");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  const loadVersions = useCallback(async () => {
    if (!plan) return;
    try {
      const v = await planService.getVersions(plan);
      setVersions(v);
    } catch { /* ignore */ }
  }, [plan]);

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { loadVersions(); }, [loadVersions]);

  // Load PDF preview when current version is PDF
  const currentVersion = useMemo(() => versions.find(v => v.is_current), [versions]);

  useEffect(() => {
    if (!currentVersion || !isPdf(currentVersion.file_name) || !activeProject || !plan) {
      setPdfPreviewUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    planService.getSignedUrl(currentVersion.file_path, activeProject.id, plan.id)
      .then(url => { if (!cancelled) setPdfPreviewUrl(url); })
      .catch(() => { if (!cancelled) setPdfPreviewUrl(null); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [currentVersion, activeProject, plan]);

  const handleStatusTransition = async (toStatus: string) => {
    if (!plan || !activeProject) return;
    setTransitioning(true);
    try {
      await planService.changeStatus(plan.id, activeProject.id, plan.status, toStatus);
      toast({ title: t(`plans.toast.status_${toStatus}`, { defaultValue: `Estado alterado para ${toStatus}` }) });
      loadPlan();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ title, description, variant: "destructive" });
    } finally {
      setTransitioning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !plan || !activeProject || !user) return;
    setUploading(true);
    try {
      await planService.uploadFile(plan, file, changeDesc || undefined);
      toast({ title: t("plans.toast.fileUploaded", { defaultValue: "Ficheiro carregado com sucesso.", name: file.name }) });
      setChangeDesc("");
      loadPlan();
      loadVersions();
    } catch (err) {
      toast({ title: t("plans.toast.uploadError", { defaultValue: "Falha no upload" }), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !plan || !activeProject || !user) return;
    setUploading(true);
    try {
      await attachmentService.upload(file, activeProject.id, "plans", plan.id, user.id);
      toast({ title: t("plans.toast.fileUploaded", { defaultValue: "Ficheiro anexado com sucesso." }) });
    } catch (err) {
      toast({ title: t("plans.toast.uploadError", { defaultValue: "Falha no upload" }), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    if (!activeProject || !plan) return;
    try {
      const url = await planService.getSignedUrl(version.file_path, activeProject.id, plan.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ title: t("plans.toast.downloadError", { defaultValue: "Erro no download" }), variant: "destructive" });
    }
  };

  const handleOpenPdf = async () => {
    if (!currentVersion || !activeProject || !plan) return;
    try {
      const url = await planService.getSignedUrl(currentVersion.file_path, activeProject.id, plan.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ title: t("plans.toast.downloadError", { defaultValue: "Erro ao abrir ficheiro" }), variant: "destructive" });
    }
  };

  const handleExportPdf = () => {
    if (!plan || !activeProject) return;
    const meta: ReportMeta = {
      projectName: activeProject.name,
      projectCode: activeProject.code,
      locale: i18n.language,
      generatedBy: user?.email ?? undefined,
    };
    const statusLabels: Record<string, string> = {};
    const typeLabels: Record<string, string> = {};
    ["draft", "under_review", "approved", "obsolete", "archived"].forEach(s => {
      statusLabels[s] = t(`plans.status.${s}`, { defaultValue: s });
    });
    ["MS", "PlanEsc", "PlanBet", "PlanMont", "PlanTraf", "PlanSeg", "Schedule", "Drawing", "Other"].forEach(pt => {
      typeLabels[pt] = t(`plans.types.${pt}`, { defaultValue: pt });
    });
    exportPlanDetailPdf(plan, versions, meta, statusLabels, typeLabels, logoBase64);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!plan || !activeProject) return null;

  const transitions = PLAN_STATUS_TRANSITIONS[plan.status] ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/plans")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("plans.detail.breadcrumb", { defaultValue: "Planos" })}
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-mono">
              {t(`plans.types.${plan.plan_type}`, { defaultValue: plan.plan_type })}
            </Badge>
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[plan.status])}>
              {t(`plans.status.${plan.status}`, { defaultValue: plan.status })}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-foreground">{plan.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rev. {plan.revision ?? "0"} · {new Date(plan.updated_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentVersion && isPdf(currentVersion.file_name) && (
            <Button variant="outline" size="sm" onClick={handleOpenPdf} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("plans.detail.openPdf", { defaultValue: "Abrir PDF" })}
            </Button>
          )}
          {currentVersion && isDwg(currentVersion.file_name) && (
            <Button variant="outline" size="sm" onClick={() => handleDownloadVersion(currentVersion)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {t("plans.detail.downloadDwg", { defaultValue: "Descarregar DWG" })}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* Workflow buttons */}
      {transitions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            {t("plans.detail.workflow", { defaultValue: "Workflow:" })}
          </span>
          {transitions.map(toStatus => (
            <Button
              key={toStatus}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              disabled={transitioning}
              onClick={() => handleStatusTransition(toStatus)}
            >
              {transitioning && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {t(`plans.status.${toStatus}`, { defaultValue: toStatus })}
            </Button>
          ))}
        </div>
      )}

      {/* PDF Inline Preview */}
      {currentVersion && isPdf(currentVersion.file_name) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("plans.detail.pdfPreview", { defaultValue: "Pré-visualização PDF" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPreview ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-96 border border-border rounded"
                title="PDF Preview"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("plans.detail.pdfPreviewError", { defaultValue: "Não foi possível carregar a pré-visualização." })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("plans.detail.info", { defaultValue: "Informação Geral" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label={t("plans.form.planType")} value={t(`plans.types.${plan.plan_type}`, { defaultValue: plan.plan_type })} />
          <InfoRow label={t("plans.form.code")} value={plan.code} />
          <InfoRow label={t("plans.form.title")} value={plan.title} />
          <InfoRow label={t("plans.form.discipline")} value={
            plan.discipline ? (
              <Badge variant="secondary" className="text-[10px]">{t(`plans.disciplines.${plan.discipline}`, { defaultValue: plan.discipline })}</Badge>
            ) : "—"
          } />
          <InfoRow label={t("plans.form.responsible")} value={plan.responsible} />
          <InfoRow label={t("plans.form.approvalDate")} value={plan.approval_date ? new Date(plan.approval_date).toLocaleDateString() : null} />
          <InfoRow label={t("plans.form.revision")} value={plan.revision ?? "0"} />
          <InfoRow label={t("plans.form.docReference")} value={plan.doc_reference} />
          <InfoRow label={t("common.status")} value={
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[plan.status])}>
              {t(`plans.status.${plan.status}`, { defaultValue: plan.status })}
            </Badge>
          } />
          <InfoRow label={t("plans.form.notes")} value={plan.notes} />
          <InfoRow label={t("plans.detail.createdAt", { defaultValue: "Criado em" })} value={new Date(plan.created_at).toLocaleDateString()} />
          <InfoRow label={t("plans.detail.updatedAt", { defaultValue: "Atualizado em" })} value={new Date(plan.updated_at).toLocaleDateString()} />
          {plan.file_url && (
            <InfoRow label={t("plans.form.fileUrl")} value={
              <a href={plan.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">{plan.file_url}</a>
            } />
          )}
          {currentVersion && (
            <InfoRow label={t("plans.detail.currentFile", { defaultValue: "Ficheiro atual" })} value={
              <div className="flex items-center gap-2">
                <span className="text-xs">{currentVersion.file_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(currentVersion.file_size)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(currentVersion.uploaded_at).toLocaleDateString()}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadVersion(currentVersion)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            } />
          )}
        </CardContent>
      </Card>

      {/* External Approval — Fiscalização / IP */}
      <Card>
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
            {t("plans.externalApproval.title")}
            {(plan as any).external_approved_at && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("plans.externalApproval.badge")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("plans.externalApproval.sentAt")}</label>
              <Input
                type="date"
                className="h-8 text-xs"
                defaultValue={(plan as any).external_sent_at?.slice(0, 10) ?? ""}
                onBlur={async (e) => {
                  await supabase.from("plans").update({ external_sent_at: e.target.value || null } as any).eq("id", plan.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("plans.externalApproval.responseAt")}</label>
              <Input
                type="date"
                className="h-8 text-xs"
                defaultValue={(plan as any).external_response_at?.slice(0, 10) ?? ""}
                onBlur={async (e) => {
                  await supabase.from("plans").update({ external_response_at: e.target.value || null } as any).eq("id", plan.id);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("plans.externalApproval.status")}</label>
              <Select
                defaultValue={(plan as any).external_approval_status ?? ""}
                onValueChange={async (val) => {
                  await supabase.from("plans").update({ external_approval_status: val || null } as any).eq("id", plan.id);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {["pending", "approved", "approved_comments", "rejected"].map(s => (
                    <SelectItem key={s} value={s}>{t(`plans.externalApproval.statusOptions.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("plans.externalApproval.observations")}</label>
              <Input
                className="h-8 text-xs"
                defaultValue={(plan as any).external_approval_observations ?? ""}
                onBlur={async (e) => {
                  await supabase.from("plans").update({ external_approval_observations: e.target.value || null } as any).eq("id", plan.id);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("plans.detail.uploadTitle", { defaultValue: "Carregar nova versão" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t("plans.detail.changeDescPlaceholder", { defaultValue: "Descrição da alteração (opcional)…" })}
            value={changeDesc}
            onChange={e => setChangeDesc(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {t("plans.detail.uploadBtn", { defaultValue: "Selecionar ficheiro" })}
            </Button>
            <input
              ref={attachFileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.dwg,.dxf,.xlsx"
              onChange={handleAttachFile}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => attachFileInputRef.current?.click()}
            >
              <FileUp className="h-3.5 w-3.5" />
              {t("plans.detail.attachFile", { defaultValue: "📎 Anexar ficheiro" })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("plans.detail.versionsTitle", { defaultValue: "Histórico de Versões" })}</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <FileText className="h-6 w-6 opacity-40" />
              <p className="text-sm">{t("plans.detail.noVersions", { defaultValue: "Sem versões registadas. Carregue o primeiro ficheiro." })}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map(v => (
                <li key={v.id} className="flex items-center gap-3 py-3 hover:bg-muted/20 px-2 rounded">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0",
                    v.is_current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{v.file_name ?? "—"}</span>
                      {v.is_current && (
                        <Badge variant="secondary" className="text-[10px] py-0 bg-primary/10 text-primary">
                          {t("plans.detail.current", { defaultValue: "Atual" })}
                        </Badge>
                      )}
                    </div>
                    {v.change_description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.change_description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(v.uploaded_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {v.file_size ? ` · ${formatBytes(v.file_size)}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0" onClick={() => handleDownloadVersion(v)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Controlled Copies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{i18n.language?.startsWith("es") ? "Copias Controladas" : "Cópias Controladas"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ControlledCopiesPanel planId={plan.id} projectId={activeProject.id} />
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("plans.detail.attachments", { defaultValue: "Anexos" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentsPanel
            projectId={activeProject.id}
            entityType="plans"
            entityId={plan.id}
          />
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <PlanFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={plan}
        onSuccess={() => { loadPlan(); loadVersions(); }}
      />
    </div>
  );
}

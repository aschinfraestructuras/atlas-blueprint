import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
  materialService,
  type Material,
  type MaterialDocument,
  type MaterialDetailMetrics,
  type WorkItemMaterial,
} from "@/lib/services/materialService";
import { exportMaterialPdf, exportFavPdf, buildMaterialDetailHtml } from "@/lib/services/materialExportService";
import { printQuarantineLabel } from "@/components/materials/QuarantineLabelView";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Plus, History, CheckCircle2, XCircle, SendHorizontal, AlertTriangle, Clock, Loader2, Tag, FileDown, ShieldCheck, ShieldAlert, Ban, Eye } from "lucide-react";
import { PdfPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { buildHtmlPreviewUrl, revokeHtmlPreviewUrl } from "@/lib/utils/htmlPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { MaterialReceptionDialog } from "@/components/materials/MaterialReceptionDialog";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { TechnicalDossierTab } from "@/components/materials/TechnicalDossierTab";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  discontinued: "bg-accent text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
};

const APPROVAL_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-accent text-accent-foreground",
  in_review: "bg-primary/15 text-primary",
  approved: "bg-chart-2/15 text-chart-2",
  rejected: "bg-destructive/10 text-destructive",
  conditional: "bg-accent text-accent-foreground",
};

const PAME_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-accent text-accent-foreground",
  approved: "bg-primary/15 text-primary",
  conditional: "bg-accent text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const RECEPTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  quarantine: "bg-accent text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const PHYSICAL_STATE_COLORS: Record<string, string> = {
  conforme: "bg-primary/15 text-primary",
  nao_conforme: "bg-destructive/10 text-destructive",
};

type MaterialLot = {
  id: string;
  lot_code: string;
  reception_date: string;
  delivery_note_ref: string | null;
  lot_ref: string | null;
  ce_marking_ok: boolean | null;
  physical_state: string;
  reception_status: string;
  nc_id: string | null;
  suppliers?: { id: string; name: string | null } | null;
  non_conformities?: { id: string; code: string | null } | null;
};

// ── Lot Thumbnail (loads first photo attachment) ─────────────────────────────
function LotThumbnail({ lotId, projectId }: { lotId: string; projectId: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("attachments")
          .select("file_path")
          .eq("entity_type", "material_lot")
          .eq("entity_id", lotId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (cancelled || !data?.length) return;
        const path = data[0].file_path;
        const { data: urlData } = await supabase.storage
          .from("qms-files")
          .createSignedUrl(path, 300);
        if (!cancelled && urlData?.signedUrl) setThumbUrl(urlData.signedUrl);
      } catch { /* no photo — that's fine */ }
    })();
    return () => { cancelled = true; };
  }, [lotId, projectId]);

  return (
    <div className="w-14 h-14 rounded-lg bg-muted/50 border border-border/40 flex-shrink-0 overflow-hidden flex items-center justify-center">
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Package className="h-5 w-5 text-muted-foreground/40" />
      )}
    </div>
  );
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canEdit, canCreate, canValidate } = useProjectRole();
  const { user } = useAuth();
  const [lotUpdating, setLotUpdating] = useState<string | null>(null);
  const { logoBase64 } = useProjectLogo();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/materials", { replace: true });
    }
  }, [id, navigate, t]);

  const [material, setMaterial] = useState<Material | null>(null);
  const [metrics, setMetrics] = useState<MaterialDetailMetrics | null>(null);
  const [docs, setDocs] = useState<MaterialDocument[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [workItemLinks, setWorkItemLinks] = useState<WorkItemMaterial[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [lots, setLots] = useState<MaterialLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);
  // PDF in-app preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => () => revokeHtmlPreviewUrl(previewUrl), [previewUrl]);

  async function handleLotStatus(lotId: string, newStatus: "approved" | "quarantine" | "rejected") {
    if (!user) return;
    setLotUpdating(lotId);
    try {
      const { error } = await (supabase as any).rpc("fn_update_lot_status", {
        p_lot_id: lotId,
        p_new_status: newStatus,
        p_user_id: user.id,
      });
      if (error) throw error;
      toast({ title: t(`materials.reception.toast.${newStatus}`, { defaultValue: `Lote ${newStatus === "approved" ? "libertado" : newStatus === "quarantine" ? "em quarentena" : "rejeitado"}` }) });
      await fetchAll();
    } catch (err) {
      toast({ title: t("common.error"), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setLotUpdating(null);
    }
  }
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchAll = useCallback(async () => {
    if (!id || !activeProject) return;
    setLoading(true);
    try {
      const [mat, met, d, sl, wl] = await Promise.all([
        materialService.getById(id),
        materialService.getDetailMetrics(id),
        materialService.getDocuments(id),
        materialService.getSupplierLinks(id),
        materialService.getWorkItemLinks(id),
      ]);
      setMaterial(mat);
      setMetrics(met);
      setDocs(d);
      setSupplierLinks(sl);
      setWorkItemLinks(wl);

      const [{ data: ncData }, { data: trData }, { data: logData }, { data: lotsData }] = await Promise.all([
        (supabase.from("non_conformities") as any)
          .select("id, code, title, severity, status, detected_at")
          .eq("material_id", id)
          .order("detected_at", { ascending: false }),
        (supabase.from("test_results") as any)
          .select("id, code, date, status, pass_fail, sample_ref")
          .eq("material_id", id)
          .order("date", { ascending: false }),
        supabase
          .from("audit_log")
          .select("id, action, diff, created_at, description")
          .eq("entity", "materials")
          .eq("entity_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase.from("material_lots") as any)
          .select("id, lot_code, reception_date, delivery_note_ref, lot_ref, ce_marking_ok, physical_state, reception_status, nc_id, suppliers:supplier_id(id, name), non_conformities:nc_id(id, code)")
          .eq("material_id", id)
          .order("reception_date", { ascending: false }),
      ]);

      setNcs(ncData ?? []);
      setTests(trData ?? []);
      setAuditLogs(logData ?? []);
      setLots((lotsData ?? []) as MaterialLot[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, activeProject]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!activeProject) return <NoProjectBanner />;

  if (loading) return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!material) return <div className="text-center py-12 text-muted-foreground">{t("common.noData")}</div>;

  const handleApprovalAction = async (action: "submit" | "review" | "approve" | "reject" | "conditional") => {
    setActionLoading(true);
    try {
      if (action === "submit") await materialService.submitForApproval(material.id, activeProject.id);
      else if (action === "review") await materialService.sendToReview(material.id, activeProject.id);
      else if (action === "approve") await materialService.approve(material.id, activeProject.id);
      else if (action === "reject") {
        if (!rejectReason.trim()) { toast({ title: t("materials.approval.reasonRequired"), variant: "destructive" }); setActionLoading(false); return; }
        await materialService.reject(material.id, activeProject.id, rejectReason.trim());
      } else if (action === "conditional") {
        if (!rejectReason.trim()) { toast({ title: t("materials.approval.reasonRequired"), variant: "destructive" }); setActionLoading(false); return; }
        await materialService.setConditional(material.id, activeProject.id, rejectReason.trim());
      }
      toast({ title: t(`materials.approval.toast.${action}`) });
      setRejectReason("");
      fetchAll();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const buildPreviewData = () => ({
    material: material!,
    metrics,
    docs,
    workItemLinks,
    ncs: ncs.map(nc => ({ code: nc.code ?? "", title: nc.title ?? "", severity: nc.severity ?? "", status: nc.status ?? "" })),
    tests: tests.map(tr => ({ code: tr.code ?? "", date: tr.date, pass_fail: tr.pass_fail ?? "", status: tr.status ?? "" })),
    projectName: activeProject!.name,
    projectCode: activeProject!.code,
    logoBase64,
    t,
  });

  const handleExportPdf = () => {
    exportMaterialPdf(buildPreviewData());
  };

  const handlePreviewPdf = () => {
    if (!material || !activeProject) return;
    revokeHtmlPreviewUrl(previewUrl);
    const html = buildMaterialDetailHtml(buildPreviewData());
    const url = buildHtmlPreviewUrl(html);
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/materials")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground truncate">{material.name}</h1>
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[material.status] ?? "")}>{t(`materials.status.${material.status}`)}</Badge>
            <Badge variant="secondary" className={cn("text-xs", APPROVAL_COLORS[material.approval_status] ?? "")}>
              {t(`materials.approval.statuses.${material.approval_status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{material.code} · {t(`materials.categories.${material.category}`, { defaultValue: material.category })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePreviewPdf}>
            <Eye className="h-3.5 w-3.5" />
            {t("common.preview", { defaultValue: "Pré-visualizar" })}
          </Button>
          <ReportExportMenu options={[{ label: "PDF", icon: "pdf" as const, action: handleExportPdf }]} />
          {/* FAV Export */}
          {material.pame_code && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportFavPdf(material, ncs, activeProject.name, activeProject.code, logoBase64)}>
              <FileDown className="h-3.5 w-3.5" />
              {t("materials.fav.exportFav", { defaultValue: "Exportar FAV" })}
            </Button>
          )}
          {/* Quarantine Label */}
          {(material.pame_status === "rejected" || ncs.some((nc: any) => nc.status !== "closed")) && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                const openNc = ncs.find((nc: any) => nc.status !== "closed");
                printQuarantineLabel(material, openNc ? { code: openNc.code, description: openNc.title ?? openNc.description ?? "", detected_at: openNc.detected_at } : undefined);
              }}
            >
              <Tag className="h-3.5 w-3.5" />
              {t("materials.quarantine.printLabel", { defaultValue: "🏷️ Etiqueta Quarentena" })}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
          )}
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: t("materials.detail.suppliersCount"), value: metrics.suppliers_count },
            { label: t("materials.detail.testsTotal"), value: metrics.tests_total },
            { label: t("materials.detail.testsNC"), value: metrics.tests_nonconform, warn: metrics.tests_nonconform > 0 },
            { label: t("materials.detail.ncOpen"), value: metrics.nc_open_count, warn: metrics.nc_open_count > 0 },
            { label: t("materials.detail.docsExpiring"), value: metrics.docs_expiring_30d, warn: metrics.docs_expiring_30d > 0 },
            { label: t("materials.detail.docsExpired"), value: metrics.docs_expired, warn: metrics.docs_expired > 0 },
            { label: t("materials.detail.workItems"), value: metrics.work_items_count },
          ].map((m, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className={cn("text-xl font-black tabular-nums mt-1", m.warn ? "text-destructive" : "text-foreground")}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="summary" className="space-y-4">
        <div className="relative">
          <TabsList className="bg-muted/50 w-full overflow-x-auto flex-nowrap justify-start gap-0.5 h-auto p-1 scrollbar-none">
            <TabsTrigger value="summary" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.summary")}</TabsTrigger>
            <TabsTrigger value="approval" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.approval")}</TabsTrigger>
            <TabsTrigger value="reception" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.reception")}</TabsTrigger>
            <TabsTrigger value="suppliers" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.suppliers")}</TabsTrigger>
            <TabsTrigger value="documents" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.documents")}</TabsTrigger>
            <TabsTrigger value="tests" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.tests")}</TabsTrigger>
            <TabsTrigger value="ncs" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.ncs")}</TabsTrigger>
            <TabsTrigger value="workItems" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.workItems")}</TabsTrigger>
            <TabsTrigger value="usage" className="flex-shrink-0 text-xs">{t("materials.usageTab")}</TabsTrigger>
            <TabsTrigger value="recycled" className="flex-shrink-0 text-xs">{t("recycled.title", { defaultValue: "Reciclado" })}</TabsTrigger>
            <TabsTrigger value="dossier" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.dossier")}</TabsTrigger>
            <TabsTrigger value="audit" className="flex-shrink-0 text-xs">{t("materials.detail.tabs.audit")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                [t("materials.form.category"), t(`materials.categories.${material.category}`, { defaultValue: material.category })],
                [t("materials.form.subcategory"), material.subcategory ?? "—"],
                [t("materials.form.specification"), material.specification ?? "—"],
                [t("materials.form.unit"), material.unit ?? "—"],
                [t("materials.pameCode"), material.pame_code ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-mono">{material.pame_code}</Badge>
                    <Badge variant="secondary" className={cn("text-xs", PAME_COLORS[material.pame_status ?? "pending"] ?? "")}>{t(`materials.pameStatuses.${material.pame_status ?? "pending"}`)}</Badge>
                  </div>
                ) : "—"],
                [t("materials.form.normativeRefs"), material.normative_refs ?? "—"],
                [t("materials.form.acceptanceCriteria"), material.acceptance_criteria ?? "—"],
                [t("materials.approval.required"), material.approval_required ? t("common.yes") : t("common.no")],
              ].map(([label, value], i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("materials.approval.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                {["pending", "submitted", "in_review", "approved"].map((step, i) => (
                  <div key={step} className="flex items-center gap-1">
                    <Badge variant="secondary" className={cn("text-xs", material.approval_status === step ? APPROVAL_COLORS[step] : "bg-muted/40 text-muted-foreground")}>
                      {t(`materials.approval.statuses.${step}`)}
                    </Badge>
                    {i < 3 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("materials.approval.currentStatus")}</p>
                  <Badge variant="secondary" className={cn("text-sm mt-1", APPROVAL_COLORS[material.approval_status] ?? "")}>
                    {t(`materials.approval.statuses.${material.approval_status}`)}
                  </Badge>
                </div>
                {material.submitted_at && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("materials.approval.submittedAt")}</p>
                    <p className="text-sm text-foreground mt-0.5">{new Date(material.submitted_at).toLocaleString()}</p>
                  </div>
                )}
                {material.approved_at && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("materials.approval.approvedAt")}</p>
                    <p className="text-sm text-foreground mt-0.5">{new Date(material.approved_at).toLocaleString()}</p>
                  </div>
                )}
                {material.rejection_reason && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("materials.approval.rejectionReason")}</p>
                    <p className="text-sm text-destructive mt-0.5">{material.rejection_reason}</p>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <Switch
                    checked={material.approval_required}
                    onCheckedChange={async (checked) => {
                      try {
                        await materialService.update(material.id, activeProject.id, { approval_required: checked });
                        fetchAll();
                      } catch {
                        // noop
                      }
                    }}
                  />
                  <Label className="text-sm">{t("materials.approval.requireApproval")}</Label>
                </div>
              )}

              {canValidate && (material.approval_status === "submitted" || material.approval_status === "in_review") && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs">{t("materials.approval.notesLabel")}</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder={t("materials.approval.notesPlaceholder")}
                    rows={2}
                  />
                </div>
              )}

              <div className="flex gap-2 flex-wrap pt-2">
                {canEdit && material.approval_status === "pending" && (
                  <Button size="sm" className="gap-1.5" onClick={() => handleApprovalAction("submit")} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                    {t("materials.approval.actions.submit")}
                  </Button>
                )}
                {canEdit && material.approval_status === "submitted" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleApprovalAction("review")} disabled={actionLoading}>
                    <Clock className="h-3.5 w-3.5" />
                    {t("materials.approval.actions.sendToReview")}
                  </Button>
                )}
                {canValidate && (material.approval_status === "submitted" || material.approval_status === "in_review") && (
                  <>
                    <Button size="sm" className="gap-1.5 bg-chart-2 hover:bg-chart-2/90" onClick={() => handleApprovalAction("approve")} disabled={actionLoading}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("materials.approval.actions.approve")}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleApprovalAction("conditional")} disabled={actionLoading}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("materials.approval.actions.conditional")}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleApprovalAction("reject")} disabled={actionLoading}>
                      <XCircle className="h-3.5 w-3.5" />
                      {t("materials.approval.actions.reject")}
                    </Button>
                  </>
                )}
                {canEdit && (material.approval_status === "rejected" || material.approval_status === "conditional") && (
                  <Button size="sm" className="gap-1.5" onClick={() => handleApprovalAction("submit")} disabled={actionLoading}>
                    <SendHorizontal className="h-3.5 w-3.5" />
                    {t("materials.approval.actions.resubmit")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reception">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("materials.reception.title")}</h3>
              {canCreate && (
                <Button size="sm" onClick={() => setReceptionOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {t("materials.reception.newReception")}
                </Button>
              )}
            </div>

            {lots.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground text-center py-6">{t("common.noData")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lots.map((lot) => {
                  const statusColor = RECEPTION_STATUS_COLORS[lot.reception_status] ?? "";
                  const physicalColor = PHYSICAL_STATE_COLORS[lot.physical_state] ?? "";
                  return (
                    <Card key={lot.id} className="border border-border/60 bg-card overflow-hidden">
                      <CardContent className="p-0">
                        {/* Lot thumbnail + header */}
                        <div className="flex gap-3 p-4 pb-3">
                          {/* Thumbnail placeholder — will show photo if exists */}
                          <LotThumbnail lotId={lot.id} projectId={activeProject.id} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[11px] text-muted-foreground">{lot.lot_code}</span>
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", statusColor)}>
                                {t(`materials.reception.status.${lot.reception_status}`)}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">
                              {lot.suppliers?.name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lot.reception_date).toLocaleDateString()}
                              {lot.delivery_note_ref ? ` · GR ${lot.delivery_note_ref}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="flex flex-wrap gap-2 px-4 pb-3">
                          {lot.lot_ref && (
                            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                              Lote: {lot.lot_ref}
                            </span>
                          )}
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", physicalColor)}>
                            {lot.physical_state === "conforme" ? "✅ Conforme" : "❌ Não conforme"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                            CE: {lot.ce_marking_ok ? "✅" : "❌"}
                          </span>
                          {lot.nc_id && (
                            <button
                              className="text-[10px] text-destructive underline underline-offset-2"
                              onClick={() => navigate(`/non-conformities/${lot.nc_id}`)}
                            >
                              {lot.non_conformities?.code ?? "NC"}
                            </button>
                          )}
                        </div>

                        {/* Action buttons */}
                        {canValidate && (
                          <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border/40 bg-muted/20">
                            {lot.reception_status !== "approved" && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => handleLotStatus(lot.id, "approved")}
                                disabled={lotUpdating === lot.id}
                              >
                                {lotUpdating === lot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                {t("materials.reception.actions.release", { defaultValue: "Libertar" })}
                              </Button>
                            )}
                            {lot.reception_status !== "quarantine" && lot.reception_status !== "rejected" && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                onClick={() => handleLotStatus(lot.id, "quarantine")}
                                disabled={lotUpdating === lot.id}
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                {t("materials.reception.actions.quarantine", { defaultValue: "Quarentena" })}
                              </Button>
                            )}
                            {lot.reception_status !== "rejected" && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => handleLotStatus(lot.id, "rejected")}
                                disabled={lotUpdating === lot.id}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                {t("materials.reception.actions.reject", { defaultValue: "Rejeitar" })}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {supplierLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noSuppliers")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("suppliers.table.code")}</TableHead>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierLinks.map(sl => {
                      const sup = sl.suppliers;
                      return (
                        <TableRow key={sl.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/suppliers/${sup?.id}`)}>
                          <TableCell className="font-mono text-xs">{sup?.code ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{sup?.name ?? "—"}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{sup?.status ?? "—"}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <LinkedDocumentsPanel entityType="material" entityId={material.id} projectId={activeProject.id} />
          {docs.length > 0 && (
            <Card className="border-0 shadow-card mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("materials.detail.materialDocs")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("materials.detail.docType")}</TableHead>
                      <TableHead>{t("materials.detail.validFrom")}</TableHead>
                      <TableHead>{t("materials.detail.validTo")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{t(`materials.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</TableCell>
                        <TableCell className="text-sm">{d.valid_from ? new Date(d.valid_from).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-sm">{d.valid_to ? new Date(d.valid_to).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs",
                            d.status === "expired" ? "bg-destructive/10 text-destructive" :
                            d.status === "valid" ? "bg-primary/15 text-primary" : ""
                          )}>{t(`materials.docStatuses.${d.status}`, { defaultValue: d.status })}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tests">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("materials.detail.tabs.tests")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/tests")}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("materials.detail.createTest")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noTests")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tests.results.table.code")}</TableHead>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("tests.results.table.passFail")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map(tr => (
                      <TableRow key={tr.id}>
                        <TableCell className="font-mono text-xs">{tr.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(tr.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`tests.status.${tr.status}`, { defaultValue: tr.status })}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className={cn("text-xs", tr.pass_fail === "fail" ? "bg-destructive/10 text-destructive" : "")}>{tr.pass_fail ?? "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ncs">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("materials.detail.tabs.ncs")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/non-conformities?material_id=${material.id}`)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("materials.detail.createNC")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {ncs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noNCs")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("nc.table.code")}</TableHead>
                      <TableHead>{t("nc.table.title")}</TableHead>
                      <TableHead>{t("nc.table.severity")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ncs.map(nc => (
                      <TableRow key={nc.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/non-conformities/${nc.id}`)}>
                        <TableCell className="font-mono text-xs">{nc.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{nc.title ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workItems">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {workItemLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noWorkItems")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("materials.detail.workItemId")}</TableHead>
                      <TableHead>{t("materials.detail.lotRef")}</TableHead>
                      <TableHead>{t("materials.detail.quantity")}</TableHead>
                      <TableHead>{t("materials.form.unit")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workItemLinks.map(wl => (
                      <TableRow key={wl.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/work-items/${wl.work_item_id}`)}>
                        <TableCell className="font-mono text-xs">{wl.work_item_id.substring(0, 8)}…</TableCell>
                        <TableCell className="text-sm">{wl.lot_ref ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">{wl.quantity != null ? wl.quantity : "—"}</TableCell>
                        <TableCell className="text-sm">{wl.unit ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <MaterialUsageTab materialId={material.id} projectId={activeProject.id} />
        </TabsContent>

        <TabsContent value="recycled">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("recycled.title", { defaultValue: "Materiais Reciclados" })}</p>
              <p className="text-sm text-muted-foreground mb-2">
                {t("recycled.subtitle", { defaultValue: "Registos PPGRCD associados a este material." })}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/recycled-materials")}>
                {t("recycled.title")} →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dossier">
          <TechnicalDossierTab
            material={material}
            lots={lots}
            tests={tests}
            docs={docs}
            ncs={ncs}
          />
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noAudit")}</p>
              ) : (
                <ul className="space-y-3">
                  {auditLogs.map(log => (
                    <li key={log.id} className="flex items-start gap-3 text-sm">
                      <History className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{log.action}</span>
                        {log.description && <span className="text-muted-foreground ml-1">— {log.description}</span>}
                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaterialFormDialog open={editOpen} onOpenChange={setEditOpen} material={material} onSuccess={fetchAll} />
      <MaterialReceptionDialog open={receptionOpen} onOpenChange={setReceptionOpen} projectId={activeProject.id} material={material} onSuccess={fetchAll} />

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) { revokeHtmlPreviewUrl(previewUrl); setPreviewUrl(null); }
        }}
        url={previewUrl}
        title={`MAT ${material.code} — ${material.name}`}
        subtitle={activeProject.name}
        downloadName={`MAT_${activeProject.code}_${material.code}.pdf`}
      />
    </div>
  );
}

function MaterialUsageTab({ materialId, projectId }: { materialId: string; projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [usageRows, setUsageRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("daily_report_materials" as any)
        .select("id, nomenclature, quantity, unit, lot_number, daily_report_id")
        .eq("material_id", materialId);
      const rows = (data ?? []) as any[];

      // Fetch report info for each
      if (rows.length > 0) {
        const reportIds = [...new Set(rows.map(r => r.daily_report_id))];
        const { data: reports } = await supabase
          .from("daily_reports" as any)
          .select("id, report_number, report_date, work_item_id")
          .in("id", reportIds);
        const reportMap = new Map((reports ?? []).map((r: any) => [r.id, r]));
        rows.forEach(r => { r._report = reportMap.get(r.daily_report_id); });
      }

      setUsageRows(rows);
      setLoading(false);
    })();
  }, [materialId]);

  const totalQty = usageRows.reduce((s, r) => s + (r.quantity ?? 0), 0);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>;

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("materials.usageTab")}</CardTitle>
      </CardHeader>
      <CardContent>
        {usageRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("common.noData")}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("materials.usageTable.date")}</TableHead>
                  <TableHead>{t("materials.usageTable.report")}</TableHead>
                  <TableHead>{t("materials.usageTable.quantity")}</TableHead>
                  <TableHead>{t("materials.usageTable.lot")}</TableHead>
                  <TableHead>{t("materials.usageTable.workItem")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageRows.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => r._report && navigate(`/daily-reports/${r.daily_report_id}`)}>
                    <TableCell className="text-sm">{r._report?.report_date ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r._report?.report_number ?? "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{r.quantity != null ? `${r.quantity} ${r.unit ?? ""}` : "—"}</TableCell>
                    <TableCell className="text-sm">{r.lot_number ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r._report?.work_item_id ? r._report.work_item_id.substring(0, 8) + "…" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-3 text-sm font-semibold">
              {t("materials.usageTable.total")}: <span className="ml-2 tabular-nums">{totalQty}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

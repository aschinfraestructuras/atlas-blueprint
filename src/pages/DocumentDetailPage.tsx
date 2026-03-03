import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, FileText, CheckCircle2, Clock, RotateCcw,
  SendHorizontal, Loader2, Upload, ExternalLink, Download,
  Link2, Plus, Trash2, Pencil, Archive, FileDown, ClipboardList,
} from "lucide-react";
import { documentService, isDocumentEditable, getDocumentTransitions } from "@/lib/services/documentService";
import type { Document, DocumentVersion, DocumentLink, DocumentStatus } from "@/lib/services/documentService";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import { DynamicFormRenderer, type FormSchema } from "@/components/documents/DynamicFormRenderer";
import { exportDocumentPdf, type DocExportLabels } from "@/lib/services/documentExportService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Status colors ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  in_review: "bg-primary/15 text-primary",
  approved:  "bg-chart-2/15 text-chart-2 font-semibold",
  obsolete:  "bg-amber-500/15 text-amber-600",
  archived:  "bg-muted/60 text-muted-foreground",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: RotateCcw,
  in_review: Clock,
  approved: CheckCircle2,
  obsolete: RotateCcw,
  archived: Archive,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Versions Tab ───────────────────────────────────────────────────────────

function VersionsTab({ documentId, projectId }: { documentId: string; projectId: string }) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentService.getVersions(documentId);
      setVersions(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  const handleViewVersion = async (version: DocumentVersion) => {
    try {
      const url = await documentService.getSignedUrl(version.file_path, projectId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({ title: t("attachments.toast.downloadError"), variant: "destructive" });
    }
  };

  if (loading) return <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>;

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <FileText className="h-6 w-6 opacity-40" />
        <p className="text-sm">{t("documents.versions.noVersions")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0",
            v.is_current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            v{v.version_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{v.file_name ?? t("documents.noFile")}</span>
              {v.is_current && (
                <Badge variant="secondary" className="text-[10px] py-0 bg-primary/10 text-primary">
                  {t("documents.versions.current")}
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
            onClick={() => handleViewVersion(v)}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

// ─── Links Tab ──────────────────────────────────────────────────────────────

const LINK_ENTITY_TYPES = ["work_item", "ppi_instance", "test_result", "non_conformity", "supplier"] as const;

function LinksTab({ documentId, projectId }: { documentId: string; projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const [newId, setNewId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentService.getLinks(documentId);
      setLinks(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newType || !newId.trim()) return;
    setSubmitting(true);
    try {
      await documentService.addLink(documentId, newType, newId.trim());
      toast({ title: t("documents.links.added") });
      setAdding(false);
      setNewType("");
      setNewId("");
      load();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await documentService.removeLink(linkId);
      toast({ title: t("documents.links.removed") });
      load();
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
    }
  };

  const getEntityRoute = (type: string, id: string): string | null => {
    switch (type) {
      case "work_item": return `/work-items/${id}`;
      case "ppi_instance": return `/ppi/${id}`;
      case "non_conformity": return `/non-conformities/${id}`;
      default: return null;
    }
  };

  if (loading) return <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("documents.links.title")}
          {links.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">{links.length}</span>}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" />
          {t("documents.links.addLink")}
        </Button>
      </div>

      {adding && (
        <div className="flex items-end gap-2 px-5 py-3 bg-muted/30 border-b border-border">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("documents.links.entityType")}</label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {LINK_ENTITY_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>{t(`documents.links.entityTypes.${et}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-semibold uppercase text-muted-foreground">ID</label>
            <Input className="h-8 text-xs font-mono" placeholder="uuid…" value={newId} onChange={(e) => setNewId(e.target.value)} />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={submitting || !newType || !newId.trim()}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : t("common.save")}
          </Button>
        </div>
      )}

      {links.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Link2 className="h-6 w-6 opacity-40" />
          <p className="text-sm">{t("documents.links.noLinks")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {links.map((link) => {
            const route = getEntityRoute(link.linked_entity_type, link.linked_entity_id);
            return (
              <li key={link.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 group">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] mr-2">
                    {t(`documents.links.entityTypes.${link.linked_entity_type}`, { defaultValue: link.linked_entity_type })}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{link.linked_entity_id.slice(0, 8)}…</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {route && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => navigate(route)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(link.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocumentDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [versionKey, setVersionKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const loadDoc = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await documentService.getById(id);
      setDoc(data);
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
      navigate("/documents");
    } finally { setLoading(false); }
  }, [id, navigate, t]);

  useEffect(() => { loadDoc(); }, [loadDoc]);

  // Load versions for export
  useEffect(() => {
    if (!doc?.id) return;
    documentService.getVersions(doc.id).then(setVersions).catch(() => {});
  }, [doc?.id, versionKey]);

  const handleExportPdf = async () => {
    if (!doc || !activeProject) return;
    setExporting(true);
    try {
      const labels: DocExportLabels = {
        appName: "Atlas QMS",
        reportTitle: t("documents.export.reportTitle"),
        listReportTitle: t("documents.export.listReportTitle"),
        generatedOn: t("documents.export.generatedOn"),
        page: t("documents.export.page"),
        of: t("documents.export.of"),
        code: t("documents.detail.code"),
        title: t("documents.form.title"),
        type: t("documents.form.type"),
        disciplina: t("documents.form.disciplina"),
        revision: t("documents.form.revision"),
        status: t("common.status"),
        createdAt: t("documents.detail.createdAt"),
        approvedAt: t("documents.detail.approvedAt"),
        approvedBy: t("documents.export.approvedBy"),
        version: t("documents.export.version"),
        fileName: t("documents.table.fileName"),
        fileSize: t("documents.table.size"),
        statuses: {
          draft: t("documents.status.draft"),
          in_review: t("documents.status.in_review"),
          approved: t("documents.status.approved"),
          obsolete: t("documents.status.obsolete"),
          archived: t("documents.status.archived"),
        },
        docTypes: Object.fromEntries(
          ["procedure", "instruction", "plan", "report", "certificate", "drawing", "specification", "form", "record", "other"]
            .map(k => [k, t(`documents.docTypes.${k}`)])
        ),
        disciplinas: Object.fromEntries(
          ["geral", "estruturas", "geotecnia", "hidraulica", "estradas", "ambiente", "seguranca", "eletrica", "mecanica", "outro"]
            .map(k => [k, t(`documents.disciplinas.${k}`)])
        ),
        versionsTitle: t("documents.versions.title"),
        versionNo: t("documents.export.versionNo"),
        changeDescription: t("documents.form.changeDescription"),
        uploadedAt: t("documents.export.uploadedAt"),
      };
      await exportDocumentPdf(doc, versions, labels, i18n.language, activeProject.name, activeProject.code);
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
    } finally { setExporting(false); }
  };

  const handleStatusTransition = async (toStatus: DocumentStatus) => {
    if (!doc || !activeProject) return;
    setTransitioning(true);
    try {
      await documentService.changeStatus(doc.id, activeProject.id, doc.status, toStatus);
      toast({ title: t(`documents.toast.status_${toStatus}`) });
      loadDoc();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw || t("auth.errors.unexpected"), variant: "destructive" });
    } finally { setTransitioning(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !doc || !activeProject || !user) return;
    setUploadingFile(true);
    try {
      await documentService.uploadFile(file, activeProject.id, doc.id, user.id);
      toast({ title: t("documents.toast.fileUploaded", { name: file.name }) });
      loadDoc();
      setVersionKey((k) => k + 1);
    } catch (err) {
      toast({ title: t("attachments.toast.uploadError"), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setUploadingFile(false); }
  };

  const handleViewFile = async (download = false) => {
    if (!doc?.file_path) return;
    try {
      const url = await documentService.getSignedUrl(doc.file_path, activeProject?.id, doc.id);
      if (download) {
        const a = window.document.createElement("a");
        a.href = url; a.download = doc.file_name ?? "document"; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch { toast({ title: t("attachments.toast.downloadError"), variant: "destructive" }); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!doc) return null;

  const editable = isDocumentEditable(doc.status);
  const StatusIcon = STATUS_ICONS[doc.status] ?? RotateCcw;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/documents")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("documents.detail.breadcrumb")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {doc.code ?? doc.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{doc.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[doc.status] ?? "")}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {t(`documents.status.${doc.status}`)}
              </Badge>
              {doc.revision && (
                <Badge variant="outline" className="text-xs font-mono">
                  Rev. {doc.revision}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Workflow actions */}
          {doc.status === "draft" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => handleStatusTransition("in_review")} disabled={transitioning}>
              {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendHorizontal className="h-3 w-3" />}
              {t("documents.actions.submit")}
            </Button>
          )}
          {doc.status === "in_review" && (
            <>
              <Button size="sm" className="gap-1.5 text-xs bg-primary/90 hover:bg-primary"
                onClick={() => handleStatusTransition("approved")} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                {t("documents.actions.approve")}
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => handleStatusTransition("draft")} disabled={transitioning}>
                <RotateCcw className="h-3 w-3" />
                {t("documents.actions.backToDraft")}
              </Button>
            </>
          )}
          {doc.status === "approved" && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => handleStatusTransition("obsolete")} disabled={transitioning}>
              <RotateCcw className="h-3 w-3" />
              {t("documents.actions.obsolete")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs" disabled={exporting}>
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
            {t("documents.export.exportPdf")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 text-xs">
            <Pencil className="h-3 w-3" /> {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* ── Info Card ─────────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("documents.detail.info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label={t("documents.detail.code")} value={<span className="font-mono text-xs">{doc.code ?? "—"}</span>} />
            <InfoRow label={t("documents.form.title")} value={doc.title} />
            <InfoRow label={t("documents.form.type")} value={t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })} />
            <InfoRow label={t("documents.form.disciplina")} value={t(`documents.disciplinas.${doc.disciplina}`, { defaultValue: doc.disciplina })} />
          </div>
          <div>
            <InfoRow label={t("documents.form.revision")} value={doc.revision ?? "—"} />
            <InfoRow label={t("common.status")} value={t(`documents.status.${doc.status}`)} />
            <InfoRow label={t("documents.detail.createdAt")} value={new Date(doc.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />
            {doc.approved_at && (
              <InfoRow label={t("documents.detail.approvedAt")} value={new Date(doc.approved_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />
            )}
          </div>
        </CardContent>

        {/* File section */}
        {doc.file_path && (
          <>
            <Separator />
            <div className="flex items-center gap-3 px-5 py-3">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{doc.file_name ?? doc.file_path.split("/").pop()}</span>
              {doc.file_size && <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewFile(false)}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewFile(true)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {/* Upload new version */}
        {editable && (
          <>
            <Separator />
            <div className="px-5 py-3">
              <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {doc.file_path ? t("documents.actions.newVersion") : t("documents.form.attachFile")}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("documents.detail.tabs.versions")}
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            {t("documents.detail.tabs.links")}
          </TabsTrigger>
          {(doc as any).form_schema && (
            <TabsTrigger value="form" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              {t("documents.detail.tabs.form")}
            </TabsTrigger>
          )}
          <TabsTrigger value="attachments" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("documents.detail.tabs.attachments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="mt-4">
          <Card className="shadow-card overflow-hidden">
            <VersionsTab key={versionKey} documentId={doc.id} projectId={activeProject?.id ?? ""} />
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <Card className="shadow-card overflow-hidden">
            <LinksTab documentId={doc.id} projectId={activeProject?.id ?? ""} />
          </Card>
        </TabsContent>

        {(doc as any).form_schema && (
          <TabsContent value="form" className="mt-4">
            <DynamicFormRenderer
              schema={(doc as any).form_schema as FormSchema}
              data={(doc as any).form_data ?? {}}
              readOnly={!isDocumentEditable(doc.status)}
              onSave={async (formData) => {
                await supabase
                  .from("documents")
                  .update({ form_data: formData as any })
                  .eq("id", doc.id);
                toast({ title: t("documents.toast.updated") });
                loadDoc();
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel entityType="documents" entityId={doc.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
      <DocumentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        document={doc}
        onSuccess={() => { loadDoc(); setVersionKey((k) => k + 1); }}
      />
    </div>
  );
}

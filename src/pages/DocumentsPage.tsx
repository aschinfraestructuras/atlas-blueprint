import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";
import { documentService } from "@/lib/services/documentService";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Plus, Pencil, Upload, Download, ExternalLink, Loader2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import { cn } from "@/lib/utils";
import type { Document } from "@/lib/services/documentService";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  approved:  "bg-primary/15 text-primary",
  rejected:  "bg-destructive/10 text-destructive",
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: documents, loading, error, refetch } = useDocuments();

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingDoc, setEditingDoc]     = useState<Document | null>(null);
  const [uploadingId, setUploadingId]   = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Hidden file input shared across all rows
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<Document | null>(null);

  const handleEdit = (doc: Document) => { setEditingDoc(doc); setDialogOpen(true); };
  const handleNew  = () => { setEditingDoc(null); setDialogOpen(true); };

  const triggerUpload = useCallback((doc: Document) => {
    pendingDocRef.current = doc;
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const doc  = pendingDocRef.current;
    if (!file || !doc || !activeProject || !user) return;
    e.target.value = ""; // allow re-selection of the same file

    setUploadingId(doc.id);
    try {
      await documentService.uploadFile(file, activeProject.id, doc.id, user.id);
      toast({ title: t("documents.toast.uploaded", { name: file.name }) });
      refetch();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      toast({
        title: t("documents.toast.uploadError"),
        description: raw,
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
      pendingDocRef.current = null;
    }
  }, [activeProject, user, refetch, t]);

  const handleDownload = useCallback(async (doc: Document) => {
    const path = doc.file_path ?? doc.file_url; // fallback for legacy rows
    if (!path) return;
    setDownloadingId(doc.id);
    try {
      const signedUrl = await documentService.getSignedUrl(path, activeProject?.id, doc.id);
      const a = window.document.createElement("a");
      a.href = signedUrl;
      a.download = doc.file_name ?? path.split("/").pop() ?? doc.title;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      await auditDownload(doc);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      toast({ title: t("documents.toast.downloadError"), description: raw, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }, [activeProject, t]);

  const handleView = useCallback(async (doc: Document) => {
    const path = doc.file_path ?? doc.file_url;
    if (!path) return;
    setDownloadingId(doc.id);
    try {
      const signedUrl = await documentService.getSignedUrl(path, activeProject?.id, doc.id);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      toast({ title: t("documents.toast.downloadError"), description: raw, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }, [activeProject, t]);

  // No-op helper (audit is already handled inside getSignedUrl)
  const auditDownload = async (_doc: Document) => { /* logged in service */ };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Hidden file input – shared across all rows */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="*/*"
          onChange={handleFileSelected}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("pages.documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("pages.documents.subtitle")}</p>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("documents.newDocument")}
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState icon={FileText} subtitleKey="emptyState.documents.subtitle" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.title")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.type")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.revision")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.status")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.file")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.date")}
                  </TableHead>
                  <TableHead className="w-[130px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const storagePath = doc.file_path ?? doc.file_url; // support legacy rows
                  const hasFile     = !!storagePath;
                  const ext         = getExtension(doc.file_name ?? storagePath);
                  const isPdf       = ext === "pdf";
                  const isUploading = uploadingId === doc.id;
                  const isDownloading = downloadingId === doc.id;

                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors">
                      {/* Title */}
                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.title}</span>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="text-sm text-muted-foreground">
                        {t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}
                      </TableCell>

                      {/* Revision */}
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.revision ?? doc.version}
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[doc.status] ?? "")}>
                          {t(`documents.status.${doc.status}`)}
                        </Badge>
                      </TableCell>

                      {/* File info */}
                      <TableCell className="text-sm text-muted-foreground">
                        {hasFile ? (
                          <div className="flex items-center gap-1.5">
                            {ext && (
                              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-mono uppercase">
                                {ext}
                              </span>
                            )}
                            {doc.file_name && (
                              <span className="truncate max-w-[120px] text-xs text-muted-foreground" title={doc.file_name}>
                                {doc.file_name}
                              </span>
                            )}
                            {doc.file_size && (
                              <span className="text-xs text-muted-foreground/60">
                                {formatBytes(doc.file_size)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">
                            {t("documents.noFile")}
                          </span>
                        )}
                      </TableCell>

                      {/* Created at */}
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {/* Edit */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(doc)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("common.edit")}</TooltipContent>
                          </Tooltip>

                          {/* Upload — always available so user can replace file */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className={cn(
                                  "h-7 w-7",
                                  hasFile
                                    ? "text-muted-foreground hover:text-primary"
                                    : "text-primary hover:text-primary/80"
                                )}
                                onClick={() => triggerUpload(doc)}
                                disabled={isUploading}
                              >
                                {isUploading
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Upload className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {hasFile ? t("documents.actions.replace") : t("documents.actions.upload")}
                            </TooltipContent>
                          </Tooltip>

                          {/* View in new tab (PDFs only) */}
                          {hasFile && isPdf && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => handleView(doc)}
                                  disabled={isDownloading}
                                >
                                  {isDownloading
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <ExternalLink className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t("documents.actions.view")}</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Download */}
                          {hasFile && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => handleDownload(doc)}
                                  disabled={isDownloading}
                                >
                                  {isDownloading
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t("documents.actions.download")}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DocumentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          document={editingDoc}
          onSuccess={refetch}
        />
      </div>
    </TooltipProvider>
  );
}

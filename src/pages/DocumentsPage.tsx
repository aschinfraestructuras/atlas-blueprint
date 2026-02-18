import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";
import { documentService } from "@/lib/services/documentService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(path: string | null): string {
  if (!path) return "";
  const parts = path.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: documents, loading, error, refetch } = useDocuments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  // Track which doc is currently uploading/downloading
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Hidden file input — reused for every row
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<Document | null>(null);

  const handleEdit = (doc: Document) => { setEditingDoc(doc); setDialogOpen(true); };
  const handleNew = () => { setEditingDoc(null); setDialogOpen(true); };

  const triggerUpload = useCallback((doc: Document) => {
    pendingDocRef.current = doc;
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const doc = pendingDocRef.current;
    if (!file || !doc || !activeProject || !user) return;

    // Reset input so the same file can be re-selected if needed
    e.target.value = "";

    setUploadingId(doc.id);
    try {
      await documentService.uploadFile(file, activeProject.id, doc.id, user.id);
      toast({ title: t("documents.toast.uploaded") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw,
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
      pendingDocRef.current = null;
    }
  }, [activeProject, user, refetch, t]);

  const handleDownload = useCallback(async (doc: Document) => {
    if (!doc.file_url) return;
    setDownloadingId(doc.id);
    try {
      const signedUrl = await documentService.getSignedUrl(doc.file_url);
      // Trigger download via temporary anchor
      const a = window.document.createElement("a");
      a.href = signedUrl;
      a.download = doc.file_url.split("/").pop() ?? doc.title;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [t]);

  const handleView = useCallback(async (doc: Document) => {
    if (!doc.file_url) return;
    setDownloadingId(doc.id);
    try {
      const signedUrl = await documentService.getSignedUrl(doc.file_url);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [t]);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Hidden file input shared across all rows */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="*/*"
          onChange={handleFileSelected}
        />

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

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

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
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const ext = getExtension(doc.file_url);
                  const isPdf = ext === "pdf";
                  const hasFile = !!doc.file_url;
                  const isUploading = uploadingId === doc.id;
                  const isDownloading = downloadingId === doc.id;

                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.revision ?? doc.version}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[doc.status] ?? "")}>
                          {t(`documents.status.${doc.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {hasFile ? (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-mono uppercase">
                            {ext || "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">
                            {t("documents.noFile")}
                          </span>
                        )}
                      </TableCell>
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
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(doc)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("common.edit")}</TooltipContent>
                          </Tooltip>

                          {/* Upload (if no file yet) */}
                          {!hasFile && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => triggerUpload(doc)}
                                  disabled={isUploading}
                                >
                                  {isUploading
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Upload className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t("documents.actions.upload")}</TooltipContent>
                            </Tooltip>
                          )}

                          {/* View in new tab (PDF) */}
                          {hasFile && isPdf && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
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
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => handleDownload(doc)}
                                  disabled={isDownloading}
                                >
                                  {isDownloading && !isPdf
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

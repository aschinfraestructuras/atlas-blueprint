import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";
import { documentService } from "@/lib/services/documentService";
import type { Document } from "@/lib/services/documentService";
import type { DocumentStatus } from "@/lib/services/documentService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Download, ExternalLink, Loader2, Search,
  Plus, Trash2, Pencil, CheckCircle2, Clock, RotateCcw,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(b: number | null | undefined): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<DocumentStatus, { cls: string; icon: React.ElementType }> = {
  draft:    { cls: "bg-muted text-muted-foreground border-border",     icon: RotateCcw    },
  review:   { cls: "bg-primary/10 text-primary border-primary/20",     icon: Clock        },
  approved: { cls: "bg-chart-2/10 text-chart-2 border-chart-2/20",    icon: CheckCircle2 },
};

// ─── DOC TYPE config (canonical values → display) ─────────────────────────────

const DOC_TYPES = [
  "procedure", "instruction", "plan", "report", "certificate",
  "drawing", "specification", "form", "record", "other",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const { data: documents, loading, error, refetch } = useDocuments();

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [typeFilter, setTypeFilter]   = useState<string>("all");
  const [actionId, setActionId]       = useState<string | null>(null);

  // ── Form dialog ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc]   = useState<Document | null>(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // ── Admin check ───────────────────────────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!activeProject || !user) return;
    supabase
      .rpc("is_project_admin", { _project_id: activeProject.id, _user_id: user.id })
      .then(({ data }) => setIsAdmin(!!data));
  }, [activeProject, user]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = documents.filter((d) => {
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchType   = typeFilter === "all" || d.doc_type === typeFilter;
    const matchSearch = !search
      || d.title.toLowerCase().includes(search.toLowerCase())
      || d.doc_type.toLowerCase().includes(search.toLowerCase())
      || (d.revision ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  // ── Counts for header badges ──────────────────────────────────────────────
  const totalDocs    = documents.length;
  const reviewCount  = documents.filter((d) => d.status === "review").length;
  const approvedCount= documents.filter((d) => d.status === "approved").length;

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async (doc: Document, openInTab = false) => {
    if (!doc.file_path) return;
    setActionId(doc.id + (openInTab ? "_view" : "_dl"));
    try {
      const url = await documentService.getSignedUrl(doc.file_path, activeProject?.id, doc.id);
      if (openInTab) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = window.document.createElement("a");
        a.href = url;
        a.download = doc.file_name ?? "document";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    } catch (err) {
      toast({
        title: t("attachments.toast.downloadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, t]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      if (deleteDoc.file_path) {
        await supabase.storage.from("qms-files").remove([deleteDoc.file_path]).catch(() => null);
      }
      const { error: dbErr } = await supabase.from("documents").delete().eq("id", deleteDoc.id);
      if (dbErr) throw dbErr;
      toast({ title: t("documents.toast.deleted") });
      refetch();
      setDeleteDoc(null);
    } catch (err) {
      toast({
        title: t("documents.toast.deleteError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("pages.documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pages.documents.subtitle")}
            </p>
          </div>

          {/* Summary badges + CTA */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!loading && (
              <>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <FileText className="h-3 w-3" />
                  {totalDocs} {t("documents.allFiles")}
                </Badge>
                {reviewCount > 0 && (
                  <Badge variant="outline" className="gap-1.5 text-xs bg-primary/10 text-primary border-primary/20">
                    <Clock className="h-3 w-3" />
                    {reviewCount} {t("documents.status.review")}
                  </Badge>
                )}
                {approvedCount > 0 && (
                  <Badge variant="outline" className="gap-1.5 text-xs bg-chart-2/10 text-chart-2 border-chart-2/20">
                    <CheckCircle2 className="h-3 w-3" />
                    {approvedCount} {t("documents.status.approved")}
                  </Badge>
                )}
              </>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { setEditDoc(null); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              {t("documents.form.createBtn")}
            </Button>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("documents.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all")}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAllStatus")}</SelectItem>
              <SelectItem value="draft">{t("documents.status.draft")}</SelectItem>
              <SelectItem value="review">{t("documents.status.review")}</SelectItem>
              <SelectItem value="approved">{t("documents.status.approved")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("documents.form.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAllTypes")}</SelectItem>
              {DOC_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>{t(`documents.docTypes.${dt}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
                <Skeleton className="h-4 w-5/12" />
                <Skeleton className="h-4 w-2/12" />
                <Skeleton className="h-4 w-1/12" />
                <Skeleton className="h-4 w-2/12" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            subtitleKey={documents.length === 0 ? "emptyState.documents.subtitle" : "emptyState.noResults"}
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.title")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    {t("documents.table.type")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    {t("common.status")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {t("documents.table.revision")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {t("documents.table.size")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    {t("common.date")}
                  </TableHead>
                  <TableHead className="w-[130px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((doc) => {
                  const statusCfg = STATUS_BADGE[doc.status as DocumentStatus] ?? STATUS_BADGE.draft;
                  const StatusIcon = statusCfg.icon;
                  const isDownloading = actionId === doc.id + "_dl";
                  const isViewing     = actionId === doc.id + "_view";
                  const hasFile       = !!doc.file_path;

                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors group">

                      {/* Title + file indicator */}
                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            hasFile ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className="truncate max-w-[240px]" title={doc.title}>
                            {doc.title}
                          </span>
                          {doc.file_name && (
                            <span className="hidden xl:inline text-xs text-muted-foreground truncate max-w-[120px]" title={doc.file_name}>
                              · {doc.file_name.split("/").pop()}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}
                        </span>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-xs font-medium", statusCfg.cls)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                        </Badge>
                      </TableCell>

                      {/* Revision */}
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                        {doc.revision ? `Rev. ${doc.revision}` : "—"}
                      </TableCell>

                      {/* File size */}
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                        {formatBytes(doc.file_size)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-0.5 justify-end">

                          {/* View in new tab */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleDownload(doc, true)}
                                disabled={!hasFile || isViewing || isDownloading}
                              >
                                {isViewing
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <ExternalLink className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("documents.actions.view")}</TooltipContent>
                          </Tooltip>

                          {/* Download */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleDownload(doc, false)}
                                disabled={!hasFile || isDownloading || isViewing}
                              >
                                {isDownloading
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Download className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("documents.actions.download")}</TooltipContent>
                          </Tooltip>

                          {/* Edit */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditDoc(doc); setFormOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("common.edit")}</TooltipContent>
                          </Tooltip>

                          {/* Delete (admin only) */}
                          {isAdmin && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteDoc(doc)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{t("common.delete")}</TooltipContent>
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

        {/* ── Create / Edit dialog ────────────────────────────────────────── */}
        <DocumentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          document={editDoc}
          onSuccess={() => { refetch(); setFormOpen(false); }}
        />

        {/* ── Delete confirmation ─────────────────────────────────────────── */}
        <AlertDialog open={!!deleteDoc} onOpenChange={(o) => { if (!o) setDeleteDoc(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("documents.deleteConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("documents.deleteConfirm.description", { name: deleteDoc?.title ?? "" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
}

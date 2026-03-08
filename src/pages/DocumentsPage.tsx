import { useState, useCallback, useEffect } from "react";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useDocuments } from "@/hooks/useDocuments";
import { documentService } from "@/lib/services/documentService";
import type { Document } from "@/lib/services/documentService";
import type { DocumentStatus } from "@/lib/services/documentService";
import { exportDocumentListPdf, type DocExportLabels } from "@/lib/services/documentExportService";
import { auditService } from "@/lib/services/auditService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import {
  FileText, Download, ExternalLink, Loader2, Search,
  Plus, Trash2, Pencil, CheckCircle2, Clock, RotateCcw,
  Archive, Eye, FileDown, AlertTriangle,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<DocumentStatus, { cls: string; icon: React.ElementType }> = {
  draft:     { cls: "bg-muted text-muted-foreground border-border",         icon: RotateCcw    },
  in_review: { cls: "bg-primary/10 text-primary border-primary/20",        icon: Clock        },
  approved:  { cls: "bg-chart-2/10 text-chart-2 border-chart-2/20",       icon: CheckCircle2 },
  obsolete:  { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: RotateCcw    },
  archived:  { cls: "bg-muted/50 text-muted-foreground border-border",     icon: Archive      },
};

const DOC_TYPES = [
  "procedure", "instruction", "plan", "report", "certificate",
  "drawing", "specification", "form", "record", "other",
];

const DISCIPLINAS = [
  "geral", "estruturas", "geotecnia", "hidraulica", "estradas",
  "ambiente", "seguranca", "eletrica", "mecanica", "outro",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const { data: documents, loading, error, refetch } = useDocuments();

  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState<DocumentStatus | "all">("all");
  const [typeFilter, setTypeFilter]         = useState<string>("all");
  const [disciplinaFilter, setDisciplinaFilter] = useState<string>("all");
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [actionId, setActionId]             = useState<string | null>(null);

  // ── Form dialog ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc]   = useState<Document | null>(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // ── Role check (replaces manual admin check) ──────────────────────────────
  const { isAdmin, canCreate, canEdit, canDelete } = useProjectRole();

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = documents.filter((d) => {
    const matchStatus     = statusFilter === "all" || d.status === statusFilter;
    const matchType       = typeFilter === "all" || d.doc_type === typeFilter;
    const matchDisciplina = disciplinaFilter === "all" || d.disciplina === disciplinaFilter;
    const matchSearch     = !search
      || d.title.toLowerCase().includes(search.toLowerCase())
      || d.doc_type.toLowerCase().includes(search.toLowerCase())
      || (d.code ?? "").toLowerCase().includes(search.toLowerCase())
      || (d.revision ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchDisciplina && matchSearch;
  });

  const totalDocs     = documents.length;
  const draftCount    = documents.filter((d) => d.status === "draft").length;
  const reviewCount   = documents.filter((d) => d.status === "in_review").length;
  const approvedCount = documents.filter((d) => d.status === "approved").length;
  const obsoleteCount = documents.filter((d) => d.status === "obsolete").length;
  const now30d = new Date(); now30d.setDate(now30d.getDate() - 30);
  const recentCount   = documents.filter((d) => new Date(d.updated_at) >= now30d).length;

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  // ── Bulk archive ──────────────────────────────────────────────────────────
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const handleBulkArchive = async () => {
    if (selected.size === 0 || !activeProject) return;
    setBulkArchiving(true);
    try {
      for (const id of selected) {
        const doc = documents.find((d) => d.id === id);
        if (doc && doc.status !== "archived") {
          await documentService.changeStatus(id, activeProject.id, doc.status, "archived");
        }
      }
      toast({ title: t("documents.toast.bulkArchived", { count: selected.size }) });
      setSelected(new Set());
      refetch();
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
    } finally { setBulkArchiving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDoc || !activeProject) return;
    setDeleting(true);
    try {
      await documentService.softDelete(deleteDoc.id, activeProject.id);
      toast({ title: t("documents.toast.deleted") });
      refetch();
      setDeleteDoc(null);
    } catch (err) {
      toast({ title: t("documents.toast.deleteError"), description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setDeleting(false); }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.documents.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("pages.documents.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canCreate && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEditDoc(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4" /> {t("documents.form.createBtn")}
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI Row ────────────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            <ModuleKPICard label={t("moduleKpi.total")} value={totalDocs} icon={FileText} />
            <ModuleKPICard label={t("moduleKpi.draft")} value={draftCount} icon={RotateCcw} active={statusFilter === "draft"} onClick={() => setStatusFilter(statusFilter === "draft" ? "all" : "draft")} />
            <ModuleKPICard label={t("moduleKpi.inReview")} value={reviewCount} icon={Clock} color="hsl(var(--primary))" active={statusFilter === "in_review"} onClick={() => setStatusFilter(statusFilter === "in_review" ? "all" : "in_review")} />
            <ModuleKPICard label={t("moduleKpi.approved")} value={approvedCount} icon={CheckCircle2} color="hsl(var(--chart-2))" active={statusFilter === "approved"} onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")} />
            <ModuleKPICard label={t("moduleKpi.obsolete")} value={obsoleteCount} icon={Archive} active={statusFilter === "obsolete"} onClick={() => setStatusFilter(statusFilter === "obsolete" ? "all" : "obsolete")} />
            <ModuleKPICard label={t("moduleKpi.recentlyUpdated")} value={recentCount} icon={Clock} />
            <ModuleKPICard label={t("moduleKpi.total")} value={`${approvedCount}/${totalDocs}`} icon={CheckCircle2} />
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <FilterBar>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder={t("documents.searchPlaceholder")} value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all")}>
            <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAllStatus")}</SelectItem>
              <SelectItem value="draft">{t("documents.status.draft")}</SelectItem>
              <SelectItem value="in_review">{t("documents.status.in_review")}</SelectItem>
              <SelectItem value="approved">{t("documents.status.approved")}</SelectItem>
              <SelectItem value="obsolete">{t("documents.status.obsolete")}</SelectItem>
              <SelectItem value="archived">{t("documents.status.archived")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAllTypes")}</SelectItem>
              {DOC_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>{t(`documents.docTypes.${dt}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
            <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAllDisciplinas")}</SelectItem>
              {DISCIPLINAS.map((d) => (
                <SelectItem key={d} value={d}>{t(`documents.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* ── Bulk actions ───────────────────────────────────────────────── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <span className="text-sm font-medium text-primary">
              {t("documents.bulk.selected", { count: selected.size })}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
              onClick={() => {
                const toExport = filtered.filter((d) => selected.has(d.id));
                if (toExport.length === 0) return;
                const labels: DocExportLabels = {
                  appName: "Atlas QMS",
                  reportTitle: t("documents.export.reportTitle"),
                  listReportTitle: t("documents.export.listReportTitle"),
                  generatedOn: t("documents.export.generatedOn"),
                  page: t("documents.export.page"), of: t("documents.export.of"),
                  code: t("documents.detail.code"), title: t("documents.form.title"),
                  type: t("documents.form.type"), disciplina: t("documents.form.disciplina"),
                  revision: t("documents.form.revision"), status: t("common.status"),
                  createdAt: t("documents.detail.createdAt"), approvedAt: t("documents.detail.approvedAt"),
                  approvedBy: t("documents.export.approvedBy"), version: t("documents.export.version"),
                  fileName: t("documents.table.fileName"), fileSize: t("documents.table.size"),
                  statuses: Object.fromEntries(["draft","in_review","approved","obsolete","archived"].map(k => [k, t(`documents.status.${k}`)])),
                  docTypes: Object.fromEntries(["procedure","instruction","plan","report","certificate","drawing","specification","form","record","other"].map(k => [k, t(`documents.docTypes.${k}`)])),
                  disciplinas: Object.fromEntries(["geral","estruturas","geotecnia","hidraulica","estradas","ambiente","seguranca","eletrica","mecanica","outro"].map(k => [k, t(`documents.disciplinas.${k}`)])),
                  versionsTitle: t("documents.versions.title"),
                  versionNo: t("documents.export.versionNo"),
                  changeDescription: t("documents.form.changeDescription"),
                  uploadedAt: t("documents.export.uploadedAt"),
                };
                exportDocumentListPdf(toExport, labels, i18n.language, activeProject?.name ?? "Atlas", activeProject?.id, logoBase64 || logoUrl);
              }}>
              <FileDown className="h-3 w-3" />
              {t("documents.bulk.exportSelected")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
              onClick={handleBulkArchive} disabled={bulkArchiving}>
              {bulkArchiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
              {t("documents.bulk.archive")}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelected(new Set())}>
              {t("documents.bulk.clear")}
            </Button>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
                <Skeleton className="h-4 w-5/12" /><Skeleton className="h-4 w-2/12" /><Skeleton className="h-4 w-1/12" /><Skeleton className="h-4 w-2/12" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} subtitleKey={documents.length === 0 ? "emptyState.documents.subtitle" : "emptyState.noResults"} />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[40px]">
                    <CheckboxUI checked={selected.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">
                    {t("documents.table.code")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.title")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    {t("documents.table.type")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {t("documents.table.disciplina")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    {t("common.status")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {t("documents.table.revision")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    {t("common.date")}
                  </TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const statusCfg = STATUS_BADGE[doc.status as DocumentStatus] ?? STATUS_BADGE.draft;
                  const StatusIcon = statusCfg.icon;
                  const isSelected = selected.has(doc.id);

                  return (
                    <TableRow key={doc.id}
                      className={cn("hover:bg-muted/20 transition-colors group cursor-pointer", isSelected && "bg-primary/5")}
                      onClick={() => navigate(`/documents/${doc.id}`)}>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CheckboxUI checked={isSelected} onCheckedChange={() => toggleSelect(doc.id)} />
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                        {doc.code ?? "—"}
                      </TableCell>

                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className={cn("h-3.5 w-3.5 flex-shrink-0", doc.file_path ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate max-w-[240px]" title={doc.title}>{doc.title}</span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}
                        </span>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {t(`documents.disciplinas.${doc.disciplina}`, { defaultValue: doc.disciplina })}
                        </span>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={cn("gap-1 text-xs font-medium", statusCfg.cls)}>
                          <StatusIcon className="h-3 w-3" />
                          {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                        {doc.revision ? `Rev. ${doc.revision}` : "—"}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => navigate(`/documents/${doc.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("common.view")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditDoc(doc); setFormOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("common.edit")}</TooltipContent>
                          </Tooltip>
                          {isAdmin && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteDoc(doc)}>
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
        <DocumentFormDialog open={formOpen} onOpenChange={setFormOpen} document={editDoc}
          onSuccess={() => { refetch(); setFormOpen(false); }} />

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
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
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

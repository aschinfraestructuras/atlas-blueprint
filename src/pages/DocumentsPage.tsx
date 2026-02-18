import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAllAttachments } from "@/hooks/useAllAttachments";
import { useDocuments } from "@/hooks/useDocuments";
import { attachmentService } from "@/lib/services/attachmentService";
import { documentService } from "@/lib/services/documentService";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Download, ExternalLink, Loader2, Paperclip, Search,
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
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import type { Attachment } from "@/lib/services/attachmentService";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(b: number | null | undefined): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

const ENTITY_COLORS: Record<string, string> = {
  documents:        "bg-primary/10 text-primary",
  tests:            "bg-chart-2/10 text-chart-2",
  non_conformities: "bg-destructive/10 text-destructive",
  suppliers:        "bg-chart-3/10 text-chart-3",
  subcontractors:   "bg-chart-4/10 text-chart-4",
  survey:           "bg-chart-5/10 text-chart-5",
  technical_office: "bg-muted text-muted-foreground",
  ppi:              "bg-accent text-accent-foreground",
};

const ALL_ENTITY_TYPES = [
  "documents", "tests", "non_conformities", "suppliers",
  "subcontractors", "survey", "technical_office", "ppi",
];

// ─── Unified file row ─────────────────────────────────────────────────────────

interface FileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  entity_type: string;
  project_id: string;
  entity_id: string;
  created_at: string;
  /** Whether to use documentService or attachmentService for the signed URL */
  source: "document_main" | "attachment";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();

  // All generic attachments
  const { data: attachments, loading: loadingAtt, error: errorAtt } = useAllAttachments(activeProject?.id);
  // Documents with a file_path (main document file)
  const { data: documents, loading: loadingDocs, error: errorDocs } = useDocuments();

  const loading = loadingAtt || loadingDocs;
  const error   = errorAtt || errorDocs;

  const [search, setSearch]           = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionId, setActionId]        = useState<string | null>(null);

  // ── Build unified list ────────────────────────────────────────────────────
  const docRows: FileRow[] = (documents ?? [])
    .filter((d) => !!d.file_path)
    .map((d) => ({
      id:          `doc_${d.id}`,
      file_name:   d.file_name ?? d.file_path!.split("/").pop() ?? "document",
      file_path:   d.file_path!,
      file_size:   d.file_size,
      entity_type: "documents",
      project_id:  d.project_id,
      entity_id:   d.id,
      created_at:  d.created_at,
      source:      "document_main" as const,
    }));

  const attRows: FileRow[] = (attachments ?? []).map((a: Attachment) => ({
    id:          a.id,
    file_name:   a.file_name,
    file_path:   a.file_path,
    file_size:   a.file_size,
    entity_type: a.entity_type,
    project_id:  a.project_id,
    entity_id:   a.entity_id,
    created_at:  a.created_at,
    source:      "attachment" as const,
  }));

  // Merge: doc main files first, then attachments; deduplicate by file_path
  const seen = new Set<string>();
  const allRows: FileRow[] = [...docRows, ...attRows].filter((r) => {
    if (seen.has(r.file_path)) return false;
    seen.add(r.file_path);
    return true;
  });

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = allRows.filter((r) => {
    const matchEntity = entityFilter === "all" || r.entity_type === entityFilter;
    const matchSearch = !search
      || r.file_name.toLowerCase().includes(search.toLowerCase())
      || r.entity_type.toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchSearch;
  });

  // ── Signed URL helper ─────────────────────────────────────────────────────
  const getSignedUrl = async (row: FileRow): Promise<string> => {
    if (row.source === "document_main") {
      return documentService.getSignedUrl(row.file_path, row.project_id, row.entity_id);
    }
    return attachmentService.getSignedUrl(
      row.file_path,
      row.project_id,
      row.entity_type as Parameters<typeof attachmentService.getSignedUrl>[2],
      row.entity_id,
      row.file_name
    );
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async (row: FileRow) => {
    setActionId(row.id);
    try {
      const url = await getSignedUrl(row);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = row.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      toast({ title: t("attachments.toast.downloaded") });
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
  }, [t]);

  const handleView = useCallback(async (row: FileRow) => {
    setActionId(row.id + "_view");
    try {
      const url = await getSignedUrl(row);
      window.open(url, "_blank", "noopener,noreferrer");
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
  }, [t]);

  if (!activeProject) return <NoProjectBanner />;

  const entityLabel = (type: string) =>
    t(`documents.entityTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("pages.documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pages.documents.subtitle")}
            </p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
              <Paperclip className="h-3.5 w-3.5" />
              {allRows.length} {t("documents.allFiles")}
            </Badge>
          )}
        </div>

        {/* Filters */}
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
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder={t("documents.filterAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filterAll")}</SelectItem>
              {ALL_ENTITY_TYPES.map((et) => (
                <SelectItem key={et} value={et}>{entityLabel(et)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-5/12" />
                  <Skeleton className="h-4 w-2/12" />
                  <Skeleton className="h-4 w-1/12" />
                  <Skeleton className="h-4 w-2/12" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} subtitleKey="emptyState.documents.subtitle" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.fileName")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.module")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("documents.table.size")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.date")}
                  </TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((row) => {
                  const ext       = getExt(row.file_name);
                  const isPdf     = ext === "pdf";
                  const isActing  = actionId === row.id;
                  const isViewing = actionId === row.id + "_view";

                  return (
                    <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">

                      {/* File name */}
                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          {ext && (
                            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-mono uppercase flex-shrink-0">
                              {ext}
                            </span>
                          )}
                          <span className="truncate max-w-[260px] text-sm" title={row.file_name}>
                            {row.file_name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Module / entity type */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${ENTITY_COLORS[row.entity_type] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {entityLabel(row.entity_type)}
                        </Badge>
                      </TableCell>

                      {/* Size */}
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatBytes(row.file_size)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-0.5 justify-end">
                          {/* View in new tab (PDF or all files) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleView(row)}
                                disabled={isViewing || isActing}
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
                                onClick={() => handleDownload(row)}
                                disabled={isActing || isViewing}
                              >
                                {isActing
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Download className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{t("documents.actions.download")}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

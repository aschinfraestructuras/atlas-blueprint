import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, Search, Construction, Pencil, Trash2, Eye, ClipboardCheck, Loader2,
  ShieldCheck, ShieldAlert, AlertTriangle, FlaskConical, Copy, ChevronDown, ChevronRight,
} from "lucide-react";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import {
  exportToCSV,
  generateListPdf,
  buildReportFilename,
} from "@/lib/services/reportService";
import { exportWorkItemsCsv } from "@/lib/services/workItemExportService";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useProjectRole } from "@/hooks/useProjectRole";
import { RoleGate, RoleGateAdmin } from "@/components/RoleGate";
import {
  workItemService, formatPk, WORK_ITEM_STATUS_OPTIONS, type WorkItem,
} from "@/lib/services/workItemService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
import { PPIInstanceFormDialog } from "@/components/ppi/PPIInstanceFormDialog";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

// ─── Discipline codes ──────────────────────────────────────────────────────────
const DISCIPLINE_CODES = [
  "geral", "terras", "firmes", "betao", "drenagem",
  "estruturas", "ferrovia", "instalacoes", "outros",
] as const;

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  planned:     "hsl(215 18% 60%)",
  in_progress: "hsl(var(--primary))",
  hold:        "hsl(38 85% 44%)",
  completed:   "hsl(158 45% 40%)",
  approved:    "hsl(158 45% 32%)",
  archived:    "hsl(215 15% 55%)",
  cancelled:   "hsl(var(--destructive))",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const dotColor = STATUS_DOT[status] ?? "hsl(215 15% 55%)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {t(`workItems.status.${status}`, { defaultValue: status })}
    </span>
  );
}

function ReadinessBadge({ item }: { item: WorkItem }) {
  const { t } = useTranslation();
  const isBlocked = item.readiness_status === "blocked";
  const indicators: string[] = [];
  if (item.has_open_nc) indicators.push(t("workItems.readiness.openNc"));
  if (item.has_pending_ppi) indicators.push(t("workItems.readiness.pendingPpi"));
  if (item.has_pending_tests) indicators.push(t("workItems.readiness.pendingTests"));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isBlocked
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-primary/10 text-primary border border-primary/20",
      )}
      title={indicators.length > 0 ? indicators.join(", ") : undefined}
    >
      {isBlocked
        ? <ShieldAlert className="h-3 w-3" />
        : <ShieldCheck className="h-3 w-3" />}
      {t(`workItems.readiness.${item.readiness_status ?? "not_ready"}`)}
    </span>
  );
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

interface ObraGroup {
  obra: string;
  items: WorkItem[];
  statusCounts: Record<string, number>;
}

interface SectorGroup {
  sector: string;
  obraGroups: ObraGroup[];
  hasInProgress: boolean;
}

function buildGroups(items: WorkItem[]): SectorGroup[] {
  const sectorMap = new Map<string, Map<string, WorkItem[]>>();
  for (const wi of items) {
    const s = wi.sector || "—";
    const o = wi.obra || "—";
    if (!sectorMap.has(s)) sectorMap.set(s, new Map());
    const obraMap = sectorMap.get(s)!;
    if (!obraMap.has(o)) obraMap.set(o, []);
    obraMap.get(o)!.push(wi);
  }

  const result: SectorGroup[] = [];
  for (const [sector, obraMap] of sectorMap) {
    let hasInProgress = false;
    const obraGroups: ObraGroup[] = [];
    for (const [obra, items] of obraMap) {
      const statusCounts: Record<string, number> = {};
      for (const wi of items) {
        statusCounts[wi.status] = (statusCounts[wi.status] || 0) + 1;
        if (wi.status === "in_progress") hasInProgress = true;
      }
      obraGroups.push({ obra, items, statusCounts });
    }
    obraGroups.sort((a, b) => a.obra.localeCompare(b.obra));
    result.push({ sector, obraGroups, hasInProgress });
  }
  result.sort((a, b) => a.sector.localeCompare(b.sector));
  return result;
}

function GroupSummary({ items, t }: { items: WorkItem[]; t: (k: string, o?: any) => string }) {
  const frentesCount = items.filter(wi => wi.elemento).length;
  const inProgressCount = items.filter(wi => wi.status === "in_progress").length;

  if (frentesCount === 0) {
    return (
      <span className="text-[10px] text-muted-foreground ml-2">
        {t("workItems.groups.baseActivity")}
      </span>
    );
  }

  const parts: string[] = [];
  parts.push(`${frentesCount} ${t("workItems.groups.frentes")}`);
  if (inProgressCount > 0) parts.push(`${inProgressCount} ${t("workItems.groups.inExecution")}`);

  return (
    <span className="text-[10px] text-muted-foreground ml-2">
      {parts.join(" · ")}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkItemsPage() {
  const { t, i18n }                = useTranslation();
  const navigate                   = useNavigate();
  const { activeProject }          = useProject();
  const { user }                   = useAuth();
  const { data, loading, refetch } = useWorkItems();
  const { canCreate, canEdit, canDelete } = useProjectRole();

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem,   setEditItem]     = useState<WorkItem | null>(null);
  const [duplicateItem, setDuplicateItem] = useState<WorkItem | null>(null);
  const [deleteItem, setDeleteItem]   = useState<WorkItem | null>(null);
  const [deleting,   setDeleting]     = useState(false);
  const [search,     setSearch]       = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus,     setFilterStatus]     = useState("all");

  // PPI creation
  const [ppiDialogOpen, setPpiDialogOpen] = useState(false);
  const [ppiWorkItemId, setPpiWorkItemId] = useState<string | undefined>();

  // Collapsible state
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [expandedObras, setExpandedObras]     = useState<Set<string>>(new Set());

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sector.toLowerCase().includes(q)     ||
          r.disciplina.toLowerCase().includes(q) ||
          (r.obra ?? "").toLowerCase().includes(q) ||
          (r.lote ?? "").toLowerCase().includes(q) ||
          (r.elemento ?? "").toLowerCase().includes(q),
      );
    }
    if (filterDiscipline !== "all") rows = rows.filter((r) => r.disciplina === filterDiscipline);
    if (filterStatus     !== "all") rows = rows.filter((r) => r.status     === filterStatus);
    return rows;
  }, [data, search, filterDiscipline, filterStatus]);

  // ── Groups ──────────────────────────────────────────────────────────────────
  const groups = useMemo(() => buildGroups(filtered), [filtered]);

  // Auto-expand logic
  const effectiveExpandedSectors = useMemo(() => {
    if (expandedSectors.size > 0) return expandedSectors;
    const auto = new Set<string>();
    if (groups.length <= 3) {
      groups.forEach(g => auto.add(g.sector));
    } else {
      groups.forEach(g => { if (g.hasInProgress) auto.add(g.sector); });
    }
    return auto;
  }, [groups, expandedSectors]);

  const effectiveExpandedObras = useMemo(() => {
    if (expandedObras.size > 0) return expandedObras;
    const auto = new Set<string>();
    groups.forEach(g => {
      g.obraGroups.forEach(og => {
        if (og.statusCounts["in_progress"] || groups.length <= 3) {
          auto.add(`${g.sector}::${og.obra}`);
        }
      });
    });
    return auto;
  }, [groups, expandedObras]);

  function toggleSector(sector: string) {
    setExpandedSectors(prev => {
      const base = prev.size > 0 ? new Set(prev) : new Set(effectiveExpandedSectors);
      if (base.has(sector)) base.delete(sector); else base.add(sector);
      return base;
    });
  }

  function toggleObra(key: string) {
    setExpandedObras(prev => {
      const base = prev.size > 0 ? new Set(prev) : new Set(effectiveExpandedObras);
      if (base.has(key)) base.delete(key); else base.add(key);
      return base;
    });
  }

  function openCreate() { setEditItem(null); setDuplicateItem(null); setDialogOpen(true); }
  function openEdit(item: WorkItem) { setEditItem(item); setDuplicateItem(null); setDialogOpen(true); }

  function openDuplicate(item: WorkItem) {
    // Clone with cleared elemento/pk
    const clone = { ...item, id: "", elemento: null, parte: null, pk_inicio: null, pk_fim: null, status: "planned" as const };
    setEditItem(null);
    setDuplicateItem(clone);
    setDialogOpen(true);
  }

  function openCreatePPI(workItemId: string) {
    setPpiWorkItemId(workItemId);
    setPpiDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteItem || !activeProject) return;
    setDeleting(true);
    try {
      await workItemService.softDelete(deleteItem.id, activeProject.id);
      toast({ title: t("workItems.toast.deleted") });
      refetch();
    } catch (err) {
      toast({
        title: t("workItems.toast.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  function handleExportCsv() {
    if (!activeProject) return;
    const headers = [
      t("workItems.export.fields.sector"),
      t("workItems.export.fields.discipline"),
      t("workItems.export.fields.obra"),
      t("workItems.export.fields.lote"),
      t("workItems.export.fields.pk"),
      t("workItems.export.fields.status"),
      t("workItems.export.fields.createdAt"),
    ];
    const rows = filtered.map((wi) => [
      wi.sector,
      t(`workItems.disciplines.${wi.disciplina}`, { defaultValue: wi.disciplina }),
      wi.obra ?? "",
      wi.lote ?? "",
      formatPk(wi.pk_inicio, wi.pk_fim),
      t(`workItems.status.${wi.status}`, { defaultValue: wi.status }),
      wi.created_at?.slice(0, 10) ?? "",
    ]);
    exportToCSV(headers, rows,
      buildReportFilename("WI", activeProject.code, "list", "csv"));
  }

  function handleExportPdf() {
    if (!activeProject || filtered.length === 0) return;
    const locale = i18n.language ?? "pt";
    const columns = [
      t("workItems.export.fields.sector"),
      t("workItems.export.fields.discipline"),
      t("workItems.export.fields.obra"),
      t("workItems.export.fields.pk"),
      t("workItems.export.fields.status"),
    ];
    const rows = filtered.map((wi) => [
      wi.sector,
      t(`workItems.disciplines.${wi.disciplina}`, { defaultValue: wi.disciplina }),
      wi.obra ?? "—",
      formatPk(wi.pk_inicio, wi.pk_fim),
      t(`workItems.status.${wi.status}`, { defaultValue: wi.status }),
    ]);
    generateListPdf({
      reportTitle: t("workItems.export.reportTitle"),
      labels: { appName: "Atlas QMS", reportTitle: t("workItems.export.reportTitle"), generatedOn: t("workItems.export.generatedOn") },
      meta: reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale },
      columns,
      rows,
      footerRef: `${filtered.length} work items`,
      filename: buildReportFilename("WI", activeProject.code, "list"),
    });
  }

  if (!activeProject) return <NoProjectBanner />;

  // Helper: render item row actions
  function renderActions(item: WorkItem) {
    return (
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/work-items/${item.id}`)} title={t("common.view")}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} title={t("common.edit")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canCreate && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDuplicate(item)} title={t("workItems.actions.duplicate")}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        {canCreate && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 hover:text-primary hover:bg-primary/10"
            onClick={() => openCreatePPI(item.id)}
            title={t("workItems.actions.createPPI")}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteItem(item)}
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // Helper: render a single work item row
  function renderItemRow(item: WorkItem, idx: number) {
    return (
      <TableRow
        key={item.id}
        className={cn(
          "cursor-pointer group transition-colors duration-100",
          "hover:bg-primary/[0.028]",
          idx % 2 === 1 && "bg-muted/[0.018]",
        )}
        onClick={() => navigate(`/work-items/${item.id}`)}
      >
        <TableCell className="text-sm text-muted-foreground">
          {t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {[item.elemento, item.parte].filter(Boolean).join(" · ") || "—"}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {formatPk(item.pk_inicio, item.pk_fim)}
        </TableCell>
        <TableCell>
          <StatusBadge status={item.status} />
        </TableCell>
        <TableCell>
          <ReadinessBadge item={item} />
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {renderActions(item)}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        module={t("workItems.module")}
        title={t("workItems.title")}
        subtitle={`${activeProject.name} · ${t("workItems.count", { count: data.length })}`}
        icon={Construction}
        iconColor="hsl(212, 43%, 40%)"
        actions={
          <>
            <ReportExportMenu
              disabled={filtered.length === 0}
              options={[
                { label: t("report.pdfList"), icon: "pdf", action: handleExportPdf },
                { label: t("report.csvList"), icon: "csv", action: handleExportCsv },
              ]}
            />
            {canCreate && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("workItems.new")}
              </Button>
            )}
          </>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <FilterBar>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("workItems.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 bg-background text-sm"
          />
        </div>

        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[190px] h-8 bg-background text-sm">
            <SelectValue placeholder={t("workItems.filters.allDisciplines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workItems.filters.allDisciplines")}</SelectItem>
            {DISCIPLINE_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`workItems.disciplines.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[170px] h-8 bg-background text-sm">
            <SelectValue placeholder={t("workItems.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workItems.filters.allStatuses")}</SelectItem>
            {WORK_ITEM_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {t(`workItems.status.${s.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {data.length}
        </span>
      </FilterBar>

      {/* ── Grouped content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Construction}
          titleKey="emptyState.title"
          subtitleKey={
            !search && filterDiscipline === "all" && filterStatus === "all"
              ? "workItems.emptyState.subtitle"
              : "emptyState.noResults"
          }
          {...(!search && filterDiscipline === "all" && filterStatus === "all"
            ? { ctaKey: "emptyState.cta", onCta: openCreate }
            : {})}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((sectorGroup) => {
            const sectorOpen = effectiveExpandedSectors.has(sectorGroup.sector);
            const totalItems = sectorGroup.obraGroups.reduce((sum, og) => sum + og.items.length, 0);

            return (
              <Collapsible key={sectorGroup.sector} open={sectorOpen} onOpenChange={() => toggleSector(sectorGroup.sector)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card shadow-card hover:bg-muted/30 transition-colors cursor-pointer">
                    {sectorOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm text-foreground">{sectorGroup.sector}</span>
                    <Badge variant="secondary" className="text-[10px] ml-1">{totalItems}</Badge>
                    <span className="flex-1" />
                    {sectorGroup.obraGroups.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">{sectorGroup.obraGroups.length} {t("workItems.groups.obras")}</span>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-2 space-y-2">
                    {sectorGroup.obraGroups.map((obraGroup) => {
                      const obraKey = `${sectorGroup.sector}::${obraGroup.obra}`;
                      const obraOpen = effectiveExpandedObras.has(obraKey);

                      return (
                        <Collapsible key={obraKey} open={obraOpen} onOpenChange={() => toggleObra(obraKey)}>
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                              {obraOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="text-sm font-medium text-foreground">{obraGroup.obra}</span>
                              <GroupSummary items={obraGroup.items} t={t} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="rounded-lg border border-border/40 overflow-hidden mt-1.5 ml-2 bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.discipline")}</TableHead>
                                    <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.element")}</TableHead>
                                    <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.pk")}</TableHead>
                                    <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.status")}</TableHead>
                                    <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.readiness")}</TableHead>
                                    <TableHead className="text-right text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.actions")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {obraGroup.items.map((item, idx) => renderItemRow(item, idx))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* ── Form dialog (create / edit / duplicate) ──────────────────── */}
      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        duplicateFrom={duplicateItem}
        onSuccess={() => {
          refetch();
          if (duplicateItem) {
            toast({ title: t("workItems.toast.duplicated") });
          }
        }}
      />

      {/* ── PPI creation dialog ──────────────────────────────────────── */}
      <PPIInstanceFormDialog
        open={ppiDialogOpen}
        onOpenChange={setPpiDialogOpen}
        preselectedWorkItemId={ppiWorkItemId}
        onSuccess={(instanceId) => navigate(`/ppi/${instanceId}`)}
      />

      {/* ── Delete confirm ───────────────────────────────────────────── */}
      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workItems.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workItems.deleteConfirm.description", { sector: deleteItem?.sector ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, Search, Construction, Pencil, Trash2, Eye, ClipboardCheck, Loader2, FileDown,
} from "lucide-react";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  workItemService, formatPk, WORK_ITEM_STATUS_OPTIONS, type WorkItem,
} from "@/lib/services/workItemService";
import { exportWorkItemsCsv, type WorkItemForExport } from "@/lib/services/workItemExportService";
import { ppiDemoService } from "@/lib/services/ppiDemoService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkItemsPage() {
  const { t, i18n }                = useTranslation();
  const navigate                   = useNavigate();
  const { activeProject }          = useProject();
  const { user }                   = useAuth();
  const { data, loading, refetch } = useWorkItems();

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editItem,   setEditItem]     = useState<WorkItem | null>(null);
  const [deleteItem, setDeleteItem]   = useState<WorkItem | null>(null);
  const [deleting,   setDeleting]     = useState(false);
  const [search,     setSearch]       = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [demoCreatingId, setDemoCreatingId]     = useState<string | null>(null);

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
          (r.lote ?? "").toLowerCase().includes(q),
      );
    }
    if (filterDiscipline !== "all") rows = rows.filter((r) => r.disciplina === filterDiscipline);
    if (filterStatus     !== "all") rows = rows.filter((r) => r.status     === filterStatus);
    return rows;
  }, [data, search, filterDiscipline, filterStatus]);

  function openCreate() { setEditItem(null); setDialogOpen(true); }
  function openEdit(item: WorkItem) { setEditItem(item); setDialogOpen(true); }

  async function handleDelete() {
    if (!deleteItem || !activeProject) return;
    setDeleting(true);
    try {
      await workItemService.delete(deleteItem.id, activeProject.id);
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

  async function handleCreateDemoPPI(item: WorkItem) {
    if (!activeProject || !user) return;
    setDemoCreatingId(item.id);
    try {
      const { instanceId, code } = await ppiDemoService.seedDemoInstance(
        activeProject.id, item.id, user.id,
      );
      toast({ title: t("ppi.demo.instance.created", { code }) });
      navigate(`/ppi/${instanceId}`);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({
        title: t("ppi.demo.error"),
        description: info.raw || (err instanceof Error ? err.message : String(err)),
        variant: "destructive",
      });
    } finally {
      setDemoCreatingId(null);
    }
  }

  function handleExportCsv() {
    if (!activeProject) return;
    const locale = i18n.language ?? "pt";
    const rows: WorkItemForExport[] = filtered.map((wi) => ({
      ...wi,
      disciplina_label: t(`workItems.disciplines.${wi.disciplina}`, { defaultValue: wi.disciplina }),
      status_label:     t(`workItems.status.${wi.status}`,          { defaultValue: wi.status }),
    }));
    exportWorkItemsCsv(rows, {
      appName:     "Atlas QMS",
      reportTitle: t("workItems.export.reportTitle"),
      generatedOn: t("workItems.export.generatedOn"),
      project:     t("workItems.export.fields.sector"),
      sector:      t("workItems.export.fields.sector"),
      discipline:  t("workItems.export.fields.discipline"),
      obra:        t("workItems.export.fields.obra"),
      lote:        t("workItems.export.fields.lote"),
      elemento:    t("workItems.export.fields.elemento"),
      parte:       t("workItems.export.fields.parte"),
      pk:          t("workItems.export.fields.pk"),
      status:      t("workItems.export.fields.status"),
      createdAt:   t("workItems.export.fields.createdAt"),
      ncs:         t("workItems.export.fields.ncs"),
      tests:       t("workItems.export.fields.tests"),
      ppis:        t("workItems.export.fields.ppis"),
    }, locale, activeProject.name,
      `WI_${activeProject.code}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (!activeProject) return <NoProjectBanner />;

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
            <Button
              variant="outline" size="sm"
              onClick={handleExportCsv}
              className="gap-2"
              disabled={filtered.length === 0}
            >
              <FileDown className="h-4 w-4" />
              {t("workItems.export.csvList")}
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("workItems.new")}
            </Button>
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

      {/* ── Table ───────────────────────────────────────────────────── */}
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
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.sector")}
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.discipline")}
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.obraLote")}
                </TableHead>
                <TableHead className="hidden lg:table-cell text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.element")}
                </TableHead>
                <TableHead className="hidden xl:table-cell text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.pk")}
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.status")}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("workItems.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "cursor-pointer group transition-colors duration-100",
                    "hover:bg-primary/[0.028]",
                    idx % 2 === 1 && "bg-muted/[0.018]",
                  )}
                  onClick={() => navigate(`/work-items/${item.id}`)}
                >
                  <TableCell className="font-semibold text-sm">{item.sector}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {[item.obra, item.lote].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {[item.elemento, item.parte].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                    {formatPk(item.pk_inicio, item.pk_fim)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {/* Actions: visible only on row hover */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => navigate(`/work-items/${item.id}`)}
                        title={t("common.view")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(item)}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                        onClick={() => handleCreateDemoPPI(item)}
                        disabled={demoCreatingId === item.id}
                        title={t("ppi.demo.instance.button")}
                      >
                        {demoCreatingId === item.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ClipboardCheck className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteItem(item)}
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Form dialog ──────────────────────────────────────────────── */}
      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        onSuccess={refetch}
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

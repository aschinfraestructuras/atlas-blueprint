import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PKRangeFilter } from "@/components/ui/pk-range-filter";
import { Plus, Search, ClipboardCheck, Eye, Archive, CheckSquare, Square, Trash2, RotateCcw, Clock, CheckCircle2, XCircle, AlertTriangle, Send, BarChart3 } from "lucide-react";
import { usePPIInstances } from "@/hooks/usePPI";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { ppiService, PPI_DISCIPLINAS, PPI_INSTANCE_STATUSES, type PpiKpis } from "@/lib/services/ppiService";
import { PPIInstanceFormDialog } from "@/components/ppi/PPIInstanceFormDialog";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
import { PPIExportMenu } from "@/components/ppi/PPIExportMenu";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { supabase } from "@/integrations/supabase/client";
import type { PpiInstanceForExport } from "@/lib/services/ppiExportService";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPIPage() {
  const { t }             = useTranslation();
  const navigate          = useNavigate();
  const { activeProject } = useProject();
  const { data, loading, refetch } = usePPIInstances();
  const { canCreate, isAdmin } = useProjectRole();

  const [formOpen,    setFormOpen]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [pkFrom, setPkFrom] = useState<number | null>(null);
  const [pkTo, setPkTo]   = useState<number | null>(null);
  const [showDeleted,  setShowDeleted]  = useState(false);
  const [archiveItem, setArchiveItem] = useState<string | null>(null);
  const [archiving,   setArchiving]   = useState(false);
  const [deleteItem, setDeleteItem]   = useState<string | null>(null);
  const [deleting,   setDeleting]     = useState(false);
  const [kpis, setKpis] = useState<PpiKpis | null>(null);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeProject) return;
    ppiService.getKpis(activeProject.id).then(setKpis).catch(() => {});
  }, [activeProject, data]);

  // ── Selection for bulk export ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportInstances, setExportInstances] = useState<PpiInstanceForExport[]>([]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    // Filtro por PK
    if (pkFrom !== null || pkTo !== null) {
      rows = rows.filter(r => {
        const pk = (r as any).pk_inicio ?? null;
        if (pk === null) return true; // sem PK definido — mostrar sempre
        if (pkFrom !== null && pk < pkFrom) return false;
        if (pkTo   !== null && pk > pkTo)   return false;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.code.toLowerCase().includes(q));
    }
    if (filterDiscipline !== "all") {
      rows = rows.filter((r) => r.template_disciplina === filterDiscipline);
    }
    if (filterStatus === "overdue") {
      // Aprovação em atraso: submetidas há mais de 5 dias sem aprovação
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 5);
      rows = rows.filter((r) => r.status === "submitted" && new Date(r.created_at) < cutoff);
    } else if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    return rows;
  }, [data, search, filterDiscipline, filterStatus, pkFrom, pkTo]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allSelected   = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected  = filtered.some((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // ── Build enriched export instances (fetch items for selected) ─────────────
  const buildExportInstances = useCallback(async (): Promise<PpiInstanceForExport[]> => {
    setLoadingExport(true);
    try {
      const toExport = filtered.filter((r) => selected.has(r.id));
      if (toExport.length === 0) return [];

      // Fetch items + work_item info in parallel
      const enriched = await Promise.all(
        toExport.map(async (inst) => {
          const [{ items }, wiResult] = await Promise.all([
            ppiService.getInstance(inst.id),
            supabase.from("work_items").select("sector, disciplina").eq("id", inst.work_item_id).single(),
          ]);
          return {
            ...inst,
            items,
            work_item_sector: wiResult.data?.sector ?? null,
            work_item_disciplina: wiResult.data?.disciplina ?? null,
          } as PpiInstanceForExport;
        })
      );
      setExportInstances(enriched);
      return enriched;
    } finally {
      setLoadingExport(false);
    }
  }, [filtered, selected]);

  // Pre-load when selection changes (async, best-effort)
  const handleSelectionChange = useCallback(async () => {
    if (selected.size === 0) { setExportInstances([]); return; }
    await buildExportInstances();
  }, [selected, buildExportInstances]);

  // ── Archive ────────────────────────────────────────────────────────────────
  async function handleArchive() {
    if (!archiveItem || !activeProject) return;
    setArchiving(true);
    try {
      const item = data.find((d) => d.id === archiveItem);
      if (!item) return;
      await ppiService.updateInstanceStatus(archiveItem, activeProject.id, item.status, "archived");
      toast({ title: t("ppi.instances.toast.statusChanged", { status: t("ppi.status.archived") }) });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({
        title: info.title,
        description: info.description ?? info.raw,
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
      setArchiveItem(null);
    }
  }

  // ── Hard delete (admin, draft only) ────────────────────────────────────────
  async function handleDelete() {
    if (!deleteItem || !activeProject) return;
    setDeleting(true);
    try {
      await ppiService.softDeleteInstance(deleteItem, activeProject.id);
      toast({ title: t("ppi.instances.toast.deleted") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  if (!activeProject) return <NoProjectBanner />;

  const selectedCount = filtered.filter((r) => selected.has(r.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Viewer banner */}
      {!canCreate && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Eye className="h-4 w-4 flex-shrink-0" />
          {t("viewer.ppiBanner")}
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            {t("nav.ppi")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
            {t("ppi.instances.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject.name} · {data.length} {t("ppi.instances.title").toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/ppi/templates")} className="gap-2">
            {t("ppi.templates.title")}
          </Button>
          {canCreate && (
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("ppi.instances.new")}
            </Button>
          )}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <ModuleKPICard label={t("ppi.kpi.total")} value={kpis.total} icon={BarChart3}
            active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
          <ModuleKPICard label={t("ppi.kpi.inProgress")} value={kpis.in_progress_count} icon={Clock} color="hsl(var(--primary))"
            active={filterStatus === "in_progress"} onClick={() => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress")} />
          <ModuleKPICard label={t("ppi.kpi.submitted")} value={kpis.submitted_count} icon={Send} color="hsl(35, 92%, 50%)"
            active={filterStatus === "submitted"} onClick={() => setFilterStatus(filterStatus === "submitted" ? "all" : "submitted")} />
          <ModuleKPICard label={t("ppi.kpi.approved")} value={kpis.approved_count} icon={CheckCircle2} color="hsl(152, 69%, 31%)"
            active={filterStatus === "approved"} onClick={() => setFilterStatus(filterStatus === "approved" ? "all" : "approved")} />
          <ModuleKPICard label={t("ppi.kpi.rejected")} value={kpis.rejected_count} icon={XCircle} color="hsl(var(--destructive))"
            active={filterStatus === "rejected"} onClick={() => setFilterStatus(filterStatus === "rejected" ? "all" : "rejected")} />
          <ModuleKPICard label={t("ppi.kpi.overdueApproval")} value={kpis.overdue_approval} icon={AlertTriangle}
            color={kpis.overdue_approval > 0 ? "hsl(var(--destructive))" : undefined}
            active={filterStatus === "overdue"} onClick={() => setFilterStatus(filterStatus === "overdue" ? "all" : "overdue")} />
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("ppi.instances.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("ppi.instances.filters.allDisciplines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ppi.instances.filters.allDisciplines")}</SelectItem>
            {PPI_DISCIPLINAS.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`ppi.disciplinas.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("ppi.instances.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ppi.instances.filters.allStatuses")}</SelectItem>
            {PPI_INSTANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`ppi.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PKRangeFilter onFilter={(f, t) => { setPkFrom(f); setPkTo(t); }} />
        {/* Toggle vista */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("table")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            title="Vista tabela">☰</button>
          <button onClick={() => setViewMode("cards")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            title="Vista cards">⊞</button>
        </div>
        {/* Export menu — appears when rows exist */}
        {filtered.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedCount} {t("ppi.export.selected", { defaultValue: "selecionados" })}
              </span>
            )}
            <PPIExportMenu
              instances={exportInstances.length > 0 ? exportInstances : filtered.map((inst) => ({ ...inst, items: [] }))}
              loading={loadingExport}
              projectName={activeProject.name}
              variant="bulk"
            />
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          titleKey="emptyState.title"
          subtitleKey={
            !search && filterDiscipline === "all" && filterStatus === "all"
              ? "ppi.instances.empty"
              : "emptyState.noResults"
          }
          {...(!search && filterDiscipline === "all" && filterStatus === "all"
            ? { ctaKey: "emptyState.cta", onCta: () => setFormOpen(true) }
            : {})}
        />
      ) : (
        <>
        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((inst) => {
              const total   = (inst as any).items_total   ?? 0;
              const checked = (inst as any).items_checked ?? 0;
              const hpCount = (inst as any).hp_pending_count ?? 0;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              const statusColors: Record<string, string> = {
                draft:       "border-l-muted-foreground/40",
                in_progress: "border-l-primary",
                submitted:   "border-l-amber-500",
                approved:    "border-l-emerald-500",
                rejected:    "border-l-destructive",
                archived:    "border-l-muted-foreground/30",
              };
              return (
                <div
                  key={inst.id}
                  className={`rounded-xl border border-border bg-card cursor-pointer hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.99] border-l-4 ${statusColors[inst.status] ?? ""}`}
                  onClick={() => navigate(`/ppi/${inst.id}`)}
                >
                  <div className="p-4">
                    {/* Header: código + status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-bold text-foreground">{inst.code}</p>
                        {inst.template_code && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {inst.template_code}
                            {inst.template_disciplina && ` · ${t(`ppi.disciplinas.${inst.template_disciplina}`, { defaultValue: inst.template_disciplina })}`}
                          </p>
                        )}
                      </div>
                      <PPIStatusBadge status={inst.status} />
                    </div>

                    {/* Barra de progresso dos itens */}
                    {total > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">{t("ppi.progress", { defaultValue: "Progresso" })}</span>
                          <span className="text-[10px] font-semibold text-foreground">{checked}/{total} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct === 100 ? "bg-emerald-500" :
                              pct > 50    ? "bg-primary" :
                              pct > 0     ? "bg-amber-500" : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rodapé: data + HPs */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground">
                        {inst.inspection_date
                          ? new Date(inst.inspection_date + "T12:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" })
                          : inst.created_at
                          ? new Date(inst.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" })
                          : "—"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hpCount > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] h-5 px-1.5 gap-0.5 animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            HP {hpCount}
                          </Badge>
                        )}
                        {pct === 100 && inst.status === "in_progress" && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] h-5 px-1.5">
                            Pronto
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {/* Select-all checkbox */}
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={async () => {
                      toggleAll();
                      // Trigger async re-build after state settles
                      setTimeout(handleSelectionChange, 50);
                    }}
                    aria-label="Select all"
                    className={cn(someSelected && !allSelected && "opacity-60")}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ppi.instances.table.code")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  {t("ppi.instances.table.template")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  {t("ppi.instances.table.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  {t("ppi.instances.form.inspectionDate")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  {t("ppi.instances.table.openedAt")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell w-20">
                  {t("ppi.instances.table.hpPending", { defaultValue: "HP Pend." })}
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inst) => {
                const isSelected = selected.has(inst.id);
                return (
                  <TableRow
                    key={inst.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/20 relative",
                      isSelected && "bg-primary/5"
                    )}
                    style={{
                      borderLeft: `3px solid ${
                        inst.status === "approved"    ? "hsl(152 69% 31%)" :
                        inst.status === "submitted"   ? "hsl(35 92% 50%)"  :
                        inst.status === "in_progress" ? "hsl(var(--primary))" :
                        inst.status === "rejected"    ? "hsl(var(--destructive))" :
                        "transparent"
                      }`
                    }}
                    onClick={() => navigate(`/ppi/${inst.id}`)}
                  >
                    {/* Row checkbox */}
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={async () => {
                          toggleOne(inst.id);
                          setTimeout(handleSelectionChange, 50);
                        }}
                        aria-label={`Select ${inst.code}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {inst.code}
                        </span>
                        {inst.template_disciplina && (
                          <Badge variant="outline" className="text-[10px] font-normal hidden sm:inline-flex">
                            {t(`ppi.disciplinas.${inst.template_disciplina}`, { defaultValue: inst.template_disciplina })}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {inst.template_code ? (
                        <span className="font-mono text-xs">[{inst.template_code}]</span>
                      ) : (
                        <span className="italic text-xs">{t("ppi.instances.form.noTemplate")}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PPIStatusBadge status={inst.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {inst.inspection_date
                        ? new Date(inst.inspection_date + "T12:00:00").toLocaleDateString()
                        : <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(inst.opened_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(inst as any).hp_pending_count > 0 ? (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs font-bold">
                          {(inst as any).hp_pending_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => navigate(`/ppi/${inst.id}`)}
                          title={t("common.view")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {inst.status !== "archived" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 hover:text-muted-foreground"
                            onClick={() => setArchiveItem(inst.id)}
                            title={t("ppi.instances.detail.archive")}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && (inst.status === "draft" || inst.status === "archived") && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItem(inst.id)}
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        </>
      )}

      {/* ── New Instance dialog ──────────────────────────────────────── */}
      <PPIInstanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={(id) => { refetch(); navigate(`/ppi/${id}`); }}
      />

      {/* ── Archive confirm ──────────────────────────────────────────── */}
      <AlertDialog open={!!archiveItem} onOpenChange={(v) => { if (!v) setArchiveItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ppi.instances.detail.archive")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ppi.status.archived")} — {data.find((d) => d.id === archiveItem)?.code}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving}>
              {archiving ? t("common.loading") : t("ppi.instances.detail.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirm (admin, draft only) ───────────────────────── */}
      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ppi.instances.toast.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ppi.instances.toast.deleteDesc", { code: data.find((d) => d.id === deleteItem)?.code ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

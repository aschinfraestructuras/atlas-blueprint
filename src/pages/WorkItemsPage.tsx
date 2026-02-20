import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Construction, Pencil, Trash2, Eye, ClipboardCheck, Loader2 } from "lucide-react";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { workItemService, formatPk, WORK_ITEM_STATUS_OPTIONS, type WorkItem } from "@/lib/services/workItemService";
import { ppiDemoService } from "@/lib/services/ppiDemoService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// ─── Discipline codes (same as in DB) ─────────────────────────────────────────

const DISCIPLINE_CODES = [
  "geral", "terras", "firmes", "betao", "drenagem",
  "estruturas", "ferrovia", "instalacoes", "outros",
] as const;

// ─── Status badge variant map (no labels — labels come from i18n) ─────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned:     "outline",
  in_progress: "default",
  hold:        "outline",
  completed:   "secondary",
  approved:    "secondary",
  archived:    "outline",
  cancelled:   "destructive",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant = STATUS_VARIANT[status] ?? "outline";
  return (
    <Badge variant={variant}>
      {t(`workItems.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkItemsPage() {
  const { t }                     = useTranslation();
  const navigate                  = useNavigate();
  const { activeProject }         = useProject();
  const { user }                  = useAuth();
  const { data, loading, refetch }= useWorkItems();

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editItem,   setEditItem]       = useState<WorkItem | null>(null);
  const [deleteItem, setDeleteItem]     = useState<WorkItem | null>(null);
  const [deleting,   setDeleting]       = useState(false);
  const [search,     setSearch]         = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus,     setFilterStatus]     = useState("all");

  // Demo PPI creation — per selected row
  const [demoCreatingId, setDemoCreatingId] = useState<string | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sector.toLowerCase().includes(q)     ||
          r.disciplina.toLowerCase().includes(q) ||
          (r.obra ?? "").toLowerCase().includes(q) ||
          (r.lote ?? "").toLowerCase().includes(q)
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
        activeProject.id, item.id, user.id
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

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            {t("workItems.module")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Construction className="h-6 w-6 text-muted-foreground" />
            {t("workItems.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject.name} · {t("workItems.count", { count: data.length })}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t("workItems.new")}
        </Button>
      </div>


      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("workItems.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[180px]">
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
      </div>

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
              <TableRow>
                <TableHead>{t("workItems.table.sector")}</TableHead>
                <TableHead>{t("workItems.table.discipline")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("workItems.table.obraLote")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("workItems.table.element")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("workItems.table.pk")}</TableHead>
                <TableHead>{t("workItems.table.status")}</TableHead>
                <TableHead className="text-right">{t("workItems.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/work-items/${item.id}`)}
                >
                  <TableCell className="font-medium">{item.sector}</TableCell>
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => navigate(`/work-items/${item.id}`)}
                        title={t("common.view")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => openEdit(item)}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 hover:text-primary hover:bg-primary/10"
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
                        className={cn("h-8 w-8 hover:text-destructive hover:bg-destructive/10")}
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

      {/* ── Form dialog ─────────────────────────────────────────────── */}
      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        onSuccess={refetch}
      />

      {/* ── Delete confirm ──────────────────────────────────────────── */}
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

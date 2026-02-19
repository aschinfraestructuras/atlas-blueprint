import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Construction, Pencil, Trash2, Eye } from "lucide-react";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { workItemService, formatPk, WORK_ITEM_STATUS_OPTIONS, type WorkItem } from "@/lib/services/workItemService";
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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned:     { label: "Previsto",     variant: "outline"   },
  in_progress: { label: "Em Execução",  variant: "default"   },
  completed:   { label: "Concluído",    variant: "secondary" },
  cancelled:   { label: "Cancelado",    variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const DISCIPLINES = [
  "Geral", "Terraplenagem", "Pavimentação", "Drenagem",
  "Estruturas", "Sinalização", "Instalações", "Geotecnia", "Outro",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkItemsPage() {
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

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sector.toLowerCase().includes(q)    ||
          r.disciplina.toLowerCase().includes(q)||
          (r.obra ?? "").toLowerCase().includes(q) ||
          (r.lote ?? "").toLowerCase().includes(q)
      );
    }
    if (filterDiscipline !== "all") {
      rows = rows.filter((r) => r.disciplina === filterDiscipline);
    }
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    return rows;
  }, [data, search, filterDiscipline, filterStatus]);

  function openCreate() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(item: WorkItem) {
    setEditItem(item);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteItem || !activeProject) return;
    setDeleting(true);
    try {
      await workItemService.delete(deleteItem.id, activeProject.id);
      toast({ title: "Work Item eliminado" });
      refetch();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Módulo
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Construction className="h-6 w-6 text-muted-foreground" />
            Work Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject.name} · {data.length} item{data.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Work Item
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar sector, obra, lote…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as disciplinas</SelectItem>
            {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {WORK_ITEM_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
          subtitleKey="emptyState.subtitle"
          {...(!search && filterDiscipline === "all" && filterStatus === "all"
            ? { ctaKey: "emptyState.cta", onCta: openCreate }
            : {})}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead className="hidden md:table-cell">Obra / Lote</TableHead>
                <TableHead className="hidden lg:table-cell">Elemento</TableHead>
                <TableHead className="hidden xl:table-cell">PK</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                    <span className="text-xs text-muted-foreground">{item.disciplina}</span>
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
                        variant="ghost" size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/work-items/${item.id}`)}
                        title="Ver detalhe"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(item)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={cn("h-8 w-8 hover:text-destructive hover:bg-destructive/10")}
                        onClick={() => setDeleteItem(item)}
                        title="Eliminar"
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
            <AlertDialogTitle>Eliminar Work Item?</AlertDialogTitle>
            <AlertDialogDescription>
              O work item <strong>{deleteItem?.sector}</strong> será eliminado permanentemente.
              Os ensaios e NCs associados perderão a ligação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? "A eliminar…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useNonConformities } from "@/hooks/useNonConformities";
import { ncService } from "@/lib/services/ncService";
import type { NonConformity } from "@/lib/services/ncService";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, Calendar, Plus, Pencil, ChevronDown,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import { cn } from "@/lib/utils";

// ─── Paletes de cor ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  minor:    "bg-muted text-muted-foreground",
  major:    "bg-primary/10 text-primary",
  critical: "bg-destructive text-destructive-foreground",
  // legado
  low:      "bg-muted text-muted-foreground",
  medium:   "bg-primary/10 text-primary",
  high:     "bg-destructive/15 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  draft:                "bg-muted/60 text-muted-foreground",
  open:                 "bg-destructive/10 text-destructive",
  in_progress:          "bg-primary/10 text-primary",
  pending_verification: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  closed:               "bg-green-500/10 text-green-700 dark:text-green-400",
  archived:             "bg-muted text-muted-foreground",
};

// Transições permitidas (espelho da RPC)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:                ["open", "archived"],
  open:                 ["in_progress", "closed", "archived"],
  in_progress:          ["pending_verification", "open", "archived"],
  pending_verification: ["closed", "in_progress", "archived"],
  closed:               ["archived", "open"],
  archived:             ["open"],
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NonConformitiesPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: ncs, loading, error, refetch } = useNonConformities();

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingNC, setEditingNC]     = useState<NonConformity | null>(null);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeProject) return [];
    return ncs.filter(nc => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (nc.code ?? "").toLowerCase().includes(q) ||
        (nc.title ?? "").toLowerCase().includes(q) ||
        nc.description.toLowerCase().includes(q) ||
        (nc.responsible ?? "").toLowerCase().includes(q);
      const matchesStatus   = filterStatus === "all"   || nc.status === filterStatus;
      const matchesSeverity = filterSeverity === "all" || nc.severity === filterSeverity;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [ncs, search, filterStatus, filterSeverity]);

  const handleEdit = (nc: NonConformity) => { setEditingNC(nc); setDialogOpen(true); };
  const handleNew  = () => { setEditingNC(null); setDialogOpen(true); };

  const handleTransition = async (nc: NonConformity, toStatus: string) => {
    setTransitioningId(nc.id);
    try {
      await ncService.updateStatus(nc.id, toStatus);
      toast({ title: t("nc.toast.statusChanged", { status: t(`nc.status.${toStatus}`) }) });
      refetch();
    } catch (err) {
      toast({
        title: t("errors.generic.title"),
        description: err instanceof Error ? err.message : t("errors.generic.description"),
        variant: "destructive",
      });
    } finally {
      setTransitioningId(null);
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("pages.nonConformities.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pages.nonConformities.subtitle")}</p>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {t("nc.newNC")}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("nc.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-64 text-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder={t("nc.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("nc.status.draft")}</SelectItem>
            <SelectItem value="open">{t("nc.status.open")}</SelectItem>
            <SelectItem value="in_progress">{t("nc.status.in_progress")}</SelectItem>
            <SelectItem value="pending_verification">{t("nc.status.pending_verification")}</SelectItem>
            <SelectItem value="closed">{t("nc.status.closed")}</SelectItem>
            <SelectItem value="archived">{t("nc.status.archived")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder={t("nc.filters.allSeverities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allSeverities")}</SelectItem>
            <SelectItem value="minor">{t("nc.severity.minor")}</SelectItem>
            <SelectItem value="major">{t("nc.severity.major")}</SelectItem>
            <SelectItem value="critical">{t("nc.severity.critical")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} subtitleKey="emptyState.nonConformities.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">
                  {t("nc.table.code")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.title")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  {t("nc.table.severity")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40">
                  {t("common.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  {t("nc.table.responsible")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  {t("nc.table.dueDate")}
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(nc => {
                const transitions = ALLOWED_TRANSITIONS[nc.status] ?? [];
                const isTransitioning = transitioningId === nc.id;
                return (
                  <TableRow key={nc.id} className="hover:bg-muted/20 transition-colors">
                    {/* Código */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {nc.code ?? nc.reference ?? "—"}
                    </TableCell>
                    {/* Título / Descrição */}
                    <TableCell className="text-sm text-foreground max-w-[260px]">
                      {nc.title ? (
                        <>
                          <p className="truncate font-medium">{nc.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{nc.description}</p>
                        </>
                      ) : (
                        <p className="truncate">{nc.description}</p>
                      )}
                    </TableCell>
                    {/* Severidade */}
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", SEVERITY_COLORS[nc.severity] ?? "")}>
                        {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
                      </Badge>
                    </TableCell>
                    {/* Estado */}
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[nc.status] ?? "")}>
                        {t(`nc.status.${nc.status}`, { defaultValue: nc.status })}
                      </Badge>
                    </TableCell>
                    {/* Responsável */}
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                      {nc.responsible ?? "—"}
                    </TableCell>
                    {/* Prazo */}
                    <TableCell className="text-sm text-muted-foreground">
                      {nc.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(nc.due_date + "T00:00:00").toLocaleDateString()}
                        </div>
                      ) : "—"}
                    </TableCell>
                    {/* Ações */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(nc)}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {transitions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                disabled={isTransitioning}
                                title={t("nc.transitions.label")}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                                {t("nc.transitions.label")}
                              </div>
                              <DropdownMenuSeparator />
                              {transitions.map(s => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleTransition(nc, s)}
                                >
                                  {t(`nc.transitions.${s}`, { defaultValue: s })}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Diálogo criar/editar */}
      <NCFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nc={editingNC}
        onSuccess={refetch}
      />
    </div>
  );
}

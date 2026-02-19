import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, ClipboardCheck, Eye, Archive, Pencil } from "lucide-react";
import { usePPIInstances } from "@/hooks/usePPI";
import { useProject } from "@/contexts/ProjectContext";
import { ppiService, PPI_DISCIPLINAS, PPI_INSTANCE_STATUSES } from "@/lib/services/ppiService";
import { PPIInstanceFormDialog } from "@/components/ppi/PPIInstanceFormDialog";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPIPage() {
  const { t }             = useTranslation();
  const navigate          = useNavigate();
  const { activeProject } = useProject();
  const { data, loading, refetch } = usePPIInstances();

  const [formOpen,    setFormOpen]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [archiveItem, setArchiveItem] = useState<string | null>(null);
  const [archiving,   setArchiving]   = useState(false);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.code.toLowerCase().includes(q));
    }
    if (filterDiscipline !== "all") {
      rows = rows.filter((r) => r.template_disciplina === filterDiscipline);
    }
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    return rows;
  }, [data, search, filterDiscipline, filterStatus]);

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
      toast({
        title: t("ppi.instances.toast.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
      setArchiveItem(null);
    }
  }

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 animate-fade-in">
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
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t("ppi.instances.new")}
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
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
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
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
                  {t("ppi.instances.table.openedAt")}
                </TableHead>
                <TableHead className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inst) => (
                <TableRow
                  key={inst.id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => navigate(`/ppi/${inst.id}`)}
                >
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
                    {new Date(inst.opened_at).toLocaleDateString()}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
    </div>
  );
}

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useAllProjectsHealth, type ProjectHealth } from "@/hooks/useProjectHealth";
import { projectService } from "@/lib/services/projectService";
import type { Project } from "@/lib/services/projectService";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import {
  FolderKanban, MapPin, Calendar, Plus, MoreHorizontal, Pencil,
  Archive, ArchiveRestore, User, Trash2,
  AlertTriangle, FlaskConical, ClipboardCheck, FileText, Ban, CheckCircle2,
  LayoutGrid, List, Activity, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/* ── Health config ─────────────────────────────────────────── */

const HEALTH_CONFIG: Record<string, { emoji: string; cls: string; barColor: string }> = {
  healthy:   { emoji: "🟢", cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", barColor: "bg-green-500" },
  attention: { emoji: "🟡", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", barColor: "bg-amber-500" },
  critical:  { emoji: "🔴", cls: "bg-destructive/10 text-destructive border-destructive/20", barColor: "bg-destructive" },
};

/* ── MiniKPI tooltip chip ──────────────────────────────────── */

function MiniKPI({ icon: Icon, value, color, tooltip }: { icon: React.ElementType; value: number; color: string; tooltip: string }) {
  if (value === 0) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums rounded px-1 py-0.5", color)}>
          <Icon className="h-2.5 w-2.5" />{value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/* ── Summary KPI Card ──────────────────────────────────────── */

function SummaryKPI({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 min-w-0">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0", accent ?? "bg-primary/10")}>
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-primary")} />
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-black leading-none tabular-nums text-foreground">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────── */

function ProjectCardSkeleton() {
  return (
    <Card className="border shadow-none">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mt-3" />
      </CardContent>
    </Card>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject, setActiveProject } = useProject();
  const { data: projects, loading, error, refetch } = useProjects();
  const { healthMap } = useAllProjectsHealth();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = projects.filter((p) =>
    tab === "active" ? p.status !== "archived" && p.status !== "inactive" : p.status === "archived"
  );

  const activeCount = projects.filter((p) => p.status !== "archived" && p.status !== "inactive").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  const getHealth = (pid: string): ProjectHealth | undefined => healthMap.find(h => h.project_id === pid);

  /* ── Aggregated KPIs ─────────────────────────────────────── */
  const kpis = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== "archived" && p.status !== "inactive");
    const healths = activeProjects.map(p => getHealth(p.id)).filter(Boolean) as ProjectHealth[];
    const avgHealth = healths.length > 0 ? Math.round(healths.reduce((s, h) => s + h.health_score, 0) / healths.length) : 0;
    const totalNcOpen = healths.reduce((s, h) => s + h.total_nc_open, 0);
    const totalPpiPending = healths.reduce((s, h) => s + h.total_ppi_pending, 0);
    return { total: activeProjects.length, avgHealth, totalNcOpen, totalPpiPending };
  }, [projects, healthMap]);

  const openCreate = () => { setEditingProject(null); setDialogOpen(true); };
  const openEdit = (project: Project) => { setEditingProject(project); setDialogOpen(true); };

  const handleArchiveToggle = async (project: Project) => {
    setArchiving(project.id);
    try {
      if (project.status === "archived") {
        await projectService.unarchive(project.id);
        toast({ title: t("projects.toast.unarchived") });
      } else {
        await projectService.archive(project.id);
        toast({ title: t("projects.toast.archived") });
        if (activeProject?.id === project.id) {
          const others = projects.filter(p => p.id !== project.id && p.status !== "archived");
          if (others.length > 0) setActiveProject(others[0]);
        }
      }
      const { auditService } = await import("@/lib/services/auditService");
      await auditService.log({
        projectId: project.id, entity: "projects", entityId: project.id,
        action: "STATUS_CHANGE", module: "projects",
        description: project.status === "archived" ? "Project reactivated" : "Project archived",
        diff: { from: project.status, to: project.status === "archived" ? "active" : "archived" },
      });
      refetch();
    } catch (err) {
      toast({ title: t("projects.toast.error"), description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally { setArchiving(null); }
  };

  const handleSetActive = (project: Project) => {
    setActiveProject(project);
    toast({ title: t("projects.toast.activated", { name: project.name }) });
  };

  const handleDelete = async (project: Project) => {
    try {
      await projectService.softDelete(project.id);
      const { auditService } = await import("@/lib/services/auditService");
      await auditService.log({
        projectId: project.id, entity: "projects", entityId: project.id,
        action: "DELETE", module: "projects",
        description: `Project soft-deleted: ${project.name}`,
        diff: { status: "inactive" },
      });
      toast({ title: t("projects.toast.deleted", { defaultValue: "Projeto eliminado." }) });
      if (activeProject?.id === project.id) {
        const others = projects.filter(p => p.id !== project.id && p.status === "active");
        if (others.length > 0) setActiveProject(others[0]);
      }
      refetch();
    } catch (err) {
      toast({ title: t("projects.toast.error"), description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  /* ── DropdownActions (shared between card & list) ─────────── */
  const ProjectActions = ({ project }: { project: Project }) => {
    const isActive = activeProject?.id === project.id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {project.status !== "archived" && (
            <DropdownMenuItem onClick={() => handleSetActive(project)} className="gap-2 text-sm" disabled={isActive}>
              <FolderKanban className="h-3.5 w-3.5" />{t("projects.actions.setActive")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => openEdit(project)} className="gap-2 text-sm">
            <Pencil className="h-3.5 w-3.5" />{t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleArchiveToggle(project)} disabled={archiving === project.id} className="gap-2 text-sm text-muted-foreground">
            {project.status === "archived" ? <><ArchiveRestore className="h-3.5 w-3.5" />{t("projects.actions.unarchive")}</> : <><Archive className="h-3.5 w-3.5" />{t("projects.actions.archive")}</>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteTarget(project)} className="gap-2 text-sm text-destructive">
            <Trash2 className="h-3.5 w-3.5" />{t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  /* ── Card View ───────────────────────────────────────────── */
  const renderCard = (project: Project) => {
    const isActive = activeProject?.id === project.id;
    const h = getHealth(project.id);
    const hc = h ? HEALTH_CONFIG[h.health_status] : undefined;

    return (
      <Card
        key={project.id}
        className={cn(
          "group border transition-all duration-200 hover:shadow-md cursor-pointer relative overflow-hidden",
          isActive ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]" : "shadow-none hover:border-primary/20"
        )}
        onClick={() => { handleSetActive(project); navigate("/"); }}
      >
        {/* Subtle gradient accent at top for active project */}
        {isActive && (
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        )}

        <CardContent className="p-5">
          {/* Top row: icon + badges + actions */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors",
              isActive
                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                : "bg-primary/8 border border-primary/10"
            )}>
              <FolderKanban className={cn("h-4.5 w-4.5", isActive ? "" : "text-primary")} />
            </div>

            <div className="flex items-center gap-1.5">
              {hc && (
                <Badge variant="outline" className={cn("text-[10px] gap-1 border font-bold tabular-nums", hc.cls)}>
                  {hc.emoji} {h!.health_score}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  project.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {t(`projects.status.${project.status}`)}
              </Badge>
              <ProjectActions project={project} />
            </div>
          </div>

          {/* Title + code */}
          <h3 className="font-bold text-foreground text-[15px] leading-snug mb-0.5 truncate">{project.name}</h3>
          <p className="text-[11px] font-mono text-muted-foreground/70 mb-3 tracking-wide">{project.code}</p>

          {/* Meta */}
          <div className="flex flex-col gap-1.5">
            {project.client && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0 opacity-50" /><span className="truncate">{project.client}</span>
              </div>
            )}
            {project.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0 opacity-50" /><span className="truncate">{project.location}</span>
              </div>
            )}
            {project.start_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 flex-shrink-0 opacity-50" /><span>{new Date(project.start_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Health progress bar */}
          {h && (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("health.title", { defaultValue: "Saúde" })}</span>
                <span className={cn("text-[11px] font-bold tabular-nums", h.health_score >= 80 ? "text-green-600" : h.health_score >= 60 ? "text-amber-600" : "text-destructive")}>
                  {h.health_score}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", hc?.barColor ?? "bg-primary")}
                  style={{ width: `${h.health_score}%` }}
                />
              </div>
            </div>
          )}

          {/* Mini KPIs */}
          {h && (h.total_nc_overdue > 0 || h.total_nc_open > 0 || h.total_tests_fail_30d > 0 || h.total_ppi_pending > 0 || h.total_documents_expired > 0 || h.activities_blocked > 0) && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
              <MiniKPI icon={AlertTriangle} value={h.total_nc_overdue} color="text-destructive bg-destructive/10" tooltip={t("health.ncOverdue")} />
              <MiniKPI icon={AlertTriangle} value={h.total_nc_open} color="text-amber-600 bg-amber-500/10" tooltip={t("health.ncOpen")} />
              <MiniKPI icon={FlaskConical} value={h.total_tests_fail_30d} color="text-destructive bg-destructive/10" tooltip={t("health.testsFail30d")} />
              <MiniKPI icon={ClipboardCheck} value={h.total_ppi_pending} color="text-primary bg-primary/10" tooltip={t("health.ppiPending")} />
              <MiniKPI icon={FileText} value={h.total_documents_expired} color="text-amber-600 bg-amber-500/10" tooltip={t("health.docsExpired")} />
              <MiniKPI icon={Ban} value={h.activities_blocked} color="text-destructive bg-destructive/10" tooltip={t("health.activitiesBlocked")} />
            </div>
          )}

          {/* Active indicator */}
          {isActive && (
            <div className="mt-3 pt-3 border-t border-primary/15 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {t("projects.activeLabel")}
              </span>
              <ArrowRight className="h-3 w-3 text-primary/50" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ── List View ───────────────────────────────────────────── */
  const renderList = () => (
    <Card className="border shadow-none overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">{t("projects.fields.name", { defaultValue: "Projeto" })}</TableHead>
            <TableHead>{t("projects.fields.client", { defaultValue: "Cliente" })}</TableHead>
            <TableHead>{t("projects.fields.location", { defaultValue: "Localização" })}</TableHead>
            <TableHead className="text-center w-[100px]">{t("health.title", { defaultValue: "Saúde" })}</TableHead>
            <TableHead className="text-center w-[80px]">{t("common.status", { defaultValue: "Estado" })}</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((project) => {
            const isActive = activeProject?.id === project.id;
            const h = getHealth(project.id);
            const hc = h ? HEALTH_CONFIG[h.health_status] : undefined;

            return (
              <TableRow
                key={project.id}
                className={cn(
                  "group cursor-pointer transition-colors",
                  isActive && "bg-primary/5"
                )}
                onClick={() => { handleSetActive(project); navigate("/"); }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
                      isActive ? "bg-primary text-primary-foreground" : "bg-primary/8"
                    )}>
                      <FolderKanban className={cn("h-3.5 w-3.5", !isActive && "text-primary")} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/60">{project.code}</p>
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{project.client ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{project.location ?? "—"}</TableCell>
                <TableCell className="text-center">
                  {h ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", hc?.barColor)} style={{ width: `${h.health_score}%` }} />
                      </div>
                      <span className={cn("text-[11px] font-bold tabular-nums", h.health_score >= 80 ? "text-green-600" : h.health_score >= 60 ? "text-amber-600" : "text-destructive")}>
                        {h.health_score}
                      </span>
                    </div>
                  ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className={cn("text-[10px]", project.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {t(`projects.status.${project.status}`)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ProjectActions project={project} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <PageHeader
          icon={FolderKanban}
          iconColor="hsl(215 55% 28%)"
          title={t("pages.projects.title")}
          subtitle={t("pages.projects.subtitle")}
          actions={
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />{t("projects.newProject")}
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* ── Summary KPIs ──────────────────────────────────────── */}
        {!loading && tab === "active" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryKPI icon={FolderKanban} label={t("projects.kpi.total", { defaultValue: "Projetos ativos" })} value={kpis.total} />
            <SummaryKPI icon={ShieldCheck} label={t("projects.kpi.avgHealth", { defaultValue: "Saúde média" })} value={kpis.avgHealth > 0 ? `${kpis.avgHealth}%` : "—"} accent={kpis.avgHealth >= 80 ? "bg-green-600" : kpis.avgHealth >= 60 ? "bg-amber-500" : "bg-destructive"} />
            <SummaryKPI icon={AlertTriangle} label={t("projects.kpi.ncOpen", { defaultValue: "NCs abertas" })} value={kpis.totalNcOpen} accent={kpis.totalNcOpen > 0 ? "bg-amber-500" : undefined} />
            <SummaryKPI icon={ClipboardCheck} label={t("projects.kpi.ppiPending", { defaultValue: "PPI pendentes" })} value={kpis.totalPpiPending} />
          </div>
        )}

        {/* ── Tabs + View toggle ────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
            <TabsList className="h-9">
              <TabsTrigger value="active" className="text-sm gap-2">
                {t("projects.tabs.active")}
                {!loading && <span className="rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5 font-semibold">{activeCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-sm gap-2">
                {t("projects.tabs.archived")}
                {!loading && archivedCount > 0 && <span className="rounded-full bg-muted text-muted-foreground text-xs px-1.5 py-0.5 font-semibold">{archivedCount}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            subtitleKey={tab === "active" ? "emptyState.projects.subtitleActive" : "emptyState.projects.subtitleArchived"}
            ctaKey={tab === "active" ? "projects.newProject" : undefined}
            onCta={tab === "active" ? openCreate : undefined}
          />
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(renderCard)}
          </div>
        ) : (
          renderList()
        )}

        <ProjectFormDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} onSuccess={refetch} />

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("common.deleteConfirmTitle", { defaultValue: "Confirmar eliminação" })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("projects.deleteConfirm", { defaultValue: "Tem a certeza que deseja eliminar o projeto \"{{name}}\"? Esta ação é irreversível.", name: deleteTarget?.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

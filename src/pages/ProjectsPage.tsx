import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { projectService } from "@/lib/services/projectService";
import type { Project } from "@/lib/services/projectService";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import {
  FolderKanban,
  MapPin,
  Calendar,
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Building,
  User,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
  completed: "bg-muted text-muted-foreground",
};

function ProjectCardSkeleton() {
  return (
    <Card className="border shadow-none">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { activeProject, setActiveProject } = useProject();
  const { data: projects, loading, error, refetch } = useProjects();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = projects.filter((p) =>
    tab === "active" ? p.status !== "archived" && p.status !== "inactive" : p.status === "archived"
  );

  const activeCount = projects.filter((p) => p.status !== "archived" && p.status !== "inactive").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  const openCreate = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleArchiveToggle = async (project: Project) => {
    setArchiving(project.id);
    try {
      if (project.status === "archived") {
        await projectService.unarchive(project.id);
        toast({ title: t("projects.toast.unarchived") });
      } else {
        await projectService.archive(project.id);
        toast({ title: t("projects.toast.archived") });
        // If active project was this one, clear it
        if (activeProject?.id === project.id) {
          const others = projects.filter(
            (p) => p.id !== project.id && p.status !== "archived"
          );
          if (others.length > 0) setActiveProject(others[0]);
        }
      }
      // Audit log
      const { auditService } = await import("@/lib/services/auditService");
      await auditService.log({
        projectId: project.id,
        entity: "projects",
        entityId: project.id,
        action: "STATUS_CHANGE",
        module: "projects",
        description: project.status === "archived" ? "Project reactivated" : "Project archived",
        diff: { from: project.status, to: project.status === "archived" ? "active" : "archived" },
      });
      refetch();
    } catch (err) {
      toast({
        title: t("projects.toast.error"),
        description: err instanceof Error ? err.message : t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setArchiving(null);
    }
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
        projectId: project.id,
        entity: "projects",
        entityId: project.id,
        action: "DELETE",
        module: "projects",
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("pages.projects.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pages.projects.subtitle")}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" />
          {t("projects.newProject")}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
        <TabsList className="h-9">
          <TabsTrigger value="active" className="text-sm gap-2">
            {t("projects.tabs.active")}
            {!loading && (
              <span className="rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5 font-semibold">
                {activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-sm gap-2">
            {t("projects.tabs.archived")}
            {!loading && archivedCount > 0 && (
              <span className="rounded-full bg-muted text-muted-foreground text-xs px-1.5 py-0.5 font-semibold">
                {archivedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          subtitleKey={
            tab === "active"
              ? "emptyState.projects.subtitleActive"
              : "emptyState.projects.subtitleArchived"
          }
          ctaKey={tab === "active" ? "projects.newProject" : undefined}
          onCta={tab === "active" ? openCreate : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const isActive = activeProject?.id === project.id;
            return (
              <Card
                key={project.id}
                className={cn(
                  "border shadow-none transition-all hover:shadow-sm relative group",
                  isActive && "border-primary/50 bg-primary/5"
                )}
              >
                <CardContent className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0",
                        isActive ? "bg-primary text-primary-foreground" : "bg-primary/10"
                      )}
                    >
                      <FolderKanban
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary-foreground" : "text-primary"
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", STATUS_BADGE[project.status] ?? "")}
                      >
                        {t(`projects.status.${project.status}`)}
                      </Badge>
                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {project.status !== "archived" && (
                            <DropdownMenuItem
                              onClick={() => handleSetActive(project)}
                              className="gap-2 text-sm"
                              disabled={isActive}
                            >
                              <FolderKanban className="h-3.5 w-3.5" />
                              {t("projects.actions.setActive")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openEdit(project)}
                            className="gap-2 text-sm"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleArchiveToggle(project)}
                            disabled={archiving === project.id}
                            className="gap-2 text-sm text-muted-foreground"
                          >
                            {project.status === "archived" ? (
                              <>
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                {t("projects.actions.unarchive")}
                              </>
                            ) : (
                              <>
                                <Archive className="h-3.5 w-3.5" />
                                {t("projects.actions.archive")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(project)}
                            className="gap-2 text-sm text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Name & Code */}
                  <h3 className="font-semibold text-foreground text-sm mb-0.5 truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground mb-3">{project.code}</p>

                  {/* Meta fields */}
                  <div className="flex flex-col gap-1.5">
                    {project.client && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{project.client}</span>
                      </div>
                    )}
                    {project.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    )}
                    {project.start_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>{new Date(project.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <span className="text-xs font-medium text-primary">
                        ● {t("projects.activeLabel")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSuccess={refetch}
      />

      {/* Delete confirmation */}
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
  );
}

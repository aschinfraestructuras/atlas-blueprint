import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { FolderKanban, MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  completed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { activeProject, setActiveProject } = useProject();
  const { data: projects, loading, error } = useProjects();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("pages.projects.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pages.projects.subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border shadow-none">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} subtitleKey="emptyState.projects.subtitle" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              onClick={() => setActiveProject(project)}
              className={cn(
                "border shadow-none cursor-pointer transition-all hover:shadow-sm",
                activeProject?.id === project.id && "border-primary/40 bg-primary/5"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                    <FolderKanban className="h-4 w-4 text-primary" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", STATUS_COLORS[project.status] ?? "")}
                  >
                    {t(`projects.status.${project.status}`)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1 truncate">
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{project.code}</p>
                <div className="flex flex-col gap-1">
                  {project.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

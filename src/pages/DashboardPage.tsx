import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useDocuments } from "@/hooks/useDocuments";
import { useTests } from "@/hooks/useTests";
import { useNonConformities } from "@/hooks/useNonConformities";
import {
  FolderKanban,
  FileText,
  FlaskConical,
  AlertTriangle,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle2,
  CircleDot,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { key: "newProject", url: "/projects", icon: FolderKanban },
  { key: "newDocument", url: "/documents", icon: FileText },
  { key: "newTest", url: "/tests", icon: FlaskConical },
  { key: "newNC", url: "/non-conformities", icon: AlertTriangle },
] as const;

function StatSkeleton() {
  return (
    <Card className="border bg-card shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const navigate = useNavigate();

  // Live queries
  const { data: allProjects, loading: projLoading } = useProjects();
  const { data: documents, loading: docLoading } = useDocuments();
  const { data: tests, loading: testLoading } = useTests();
  const { data: ncs, loading: ncLoading } = useNonConformities();

  const displayName = user?.email?.split("@")[0] ?? "—";

  // Computed metrics
  const activeProjectsCount = allProjects.filter((p) => p.status === "active").length;
  const pendingDocsCount = documents.filter((d) => d.status !== "approved").length;
  const pendingTestsCount = tests.filter((t) => t.status === "pending").length;
  const openNcsCount = ncs.filter((n) => n.status !== "closed").length;

  const STATS = [
    { key: "activeProjects", value: activeProjectsCount, icon: FolderKanban, loading: projLoading },
    { key: "openDocuments", value: pendingDocsCount, icon: FileText, loading: docLoading },
    { key: "pendingTests", value: pendingTestsCount, icon: FlaskConical, loading: testLoading },
    { key: "openNCs", value: openNcsCount, icon: AlertTriangle, loading: ncLoading },
  ];

  // Recent activity built from real data
  const recentDocs = documents.slice(0, 2).map((d) => ({
    label: d.title,
    sub: t("dashboard.activity.documentApproved"),
    icon: CheckCircle2,
    color: "text-primary",
    time: new Date(d.created_at).toLocaleDateString(),
  }));
  const recentNcs = ncs.slice(0, 2).map((n) => ({
    label: n.reference ?? n.description.slice(0, 40),
    sub: t("dashboard.activity.ncOpened"),
    icon: CircleDot,
    color: "text-destructive",
    time: new Date(n.created_at).toLocaleDateString(),
  }));
  const recentActivity = [...recentDocs, ...recentNcs].slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("dashboard.welcome")},{" "}
          <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeProject
            ? t("dashboard.subtitleProject", { project: activeProject.name })
            : t("dashboard.subtitle")}
        </p>
      </div>

      {/* No project selected warning */}
      {!activeProject && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t("dashboard.noProjectSelected")}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) =>
          stat.loading ? (
            <StatSkeleton key={stat.key} />
          ) : (
            <Card key={stat.key} className="border bg-card shadow-none hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t(`dashboard.stats.${stat.key}`)}
                    </p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent activity */}
        <Card className="lg:col-span-3 border shadow-none">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={cn("flex-shrink-0", item.color)}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-2 border shadow-none">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  className="justify-start gap-3 h-10 text-sm font-medium"
                  onClick={() => navigate(action.url)}
                >
                  <action.icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <Plus className="h-3 w-3 text-muted-foreground -ml-1 flex-shrink-0" />
                  {t(`dashboard.actions.${action.key}`)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

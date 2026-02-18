import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MOCK_STATS = [
  { key: "activeProjects", value: 12, icon: FolderKanban, trend: "+2" },
  { key: "openDocuments", value: 47, icon: FileText, trend: "+5" },
  { key: "pendingTests", value: 8, icon: FlaskConical, trend: "-1" },
  { key: "openNCs", value: 3, icon: AlertTriangle, trend: "neutral" },
];

const MOCK_ACTIVITY = [
  { key: "documentApproved", project: "Obra Norte A2", time: "2h", icon: CheckCircle2, color: "text-primary" },
  { key: "testCompleted", project: "Viaduto Sul", time: "4h", icon: CheckCircle2, color: "text-primary" },
  { key: "ncOpened", project: "Edifício Central", time: "5h", icon: CircleDot, color: "text-destructive" },
  { key: "projectCreated", project: "Ampliação Porto", time: "1d", icon: FolderKanban, color: "text-primary" },
  { key: "supplierAdded", project: "—", time: "2d", icon: TrendingUp, color: "text-muted-foreground" },
];

const QUICK_ACTIONS = [
  { key: "newProject", url: "/projects", icon: FolderKanban },
  { key: "newDocument", url: "/documents", icon: FileText },
  { key: "newTest", url: "/tests", icon: FlaskConical },
  { key: "newNC", url: "/non-conformities", icon: AlertTriangle },
] as const;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.email?.split("@")[0] ?? "—";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("dashboard.welcome")},{" "}
          <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOCK_STATS.map((stat) => (
          <Card key={stat.key} className="border bg-card shadow-none hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t(`dashboard.stats.${stat.key}`)}
                  </p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 mt-0.5">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              {stat.trend !== "neutral" && (
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    stat.trend.startsWith("+") ? "text-primary" : "text-destructive"
                  )}
                >
                  {stat.trend}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
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
            {MOCK_ACTIVITY.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
            ) : (
              <ul className="space-y-3">
                {MOCK_ACTIVITY.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={cn("flex-shrink-0", item.color)}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">
                        {t(`dashboard.activity.${item.key}`)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.project}</p>
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

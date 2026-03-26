import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, AlertTriangle, ClipboardCheck, Flame, Beaker, ArrowRight, Crosshair, CalendarClock } from "lucide-react";

interface TestStatus {
  ncOpen: number;
  ncMajorOpen: number;
  ppiInProgress: number;
  specimensOverdue: number;
  weldsUsPending: number;
  testsOverdue: number;
  emesExpiring: number;
  nextAuditDays: number | null;
  nextAuditDesc: string;
}

export function TestStatusCard() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [data, setData] = useState<TestStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    const pid = activeProject.id;
    setLoading(true);

    (async () => {
      try {
        const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

        const [ncRes, ncMajorRes, ppiRes, specRes, weldRes, testRes] = await Promise.all([
          supabase.from("non_conformities" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).neq("status", "closed").neq("status", "archived").eq("is_deleted", false),
          supabase.from("non_conformities" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).eq("severity", "major").neq("status", "closed").neq("status", "archived").eq("is_deleted", false),
          supabase.from("ppi_instances" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).eq("status", "in_progress").eq("is_deleted", false),
          supabase.from("concrete_specimens" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).is("strength_mpa", null).lt("mold_date", twentyEightDaysAgo),
          supabase.from("weld_records" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).eq("has_ut", false).lt("weld_date", sevenDaysAgo),
          supabase.from("test_results" as any).select("id", { count: "exact", head: true })
            .eq("project_id", pid).in("status", ["draft", "in_progress", "pending"]),
        ]);

        setData({
          ncOpen: ncRes.count ?? 0,
          ncMajorOpen: ncMajorRes.count ?? 0,
          ppiInProgress: ppiRes.count ?? 0,
          specimensOverdue: specRes.count ?? 0,
          weldsUsPending: weldRes.count ?? 0,
          testsOverdue: testRes.count ?? 0,
        });
      } catch (e) {
        console.error("[TestStatusCard]", e);
      } finally { setLoading(false); }
    })();
  }, [activeProject]);

  if (!activeProject) return null;

  const items = data ? [
    { label: t("dashboard.testStatus.ncOpen", { defaultValue: "NCs abertas" }), value: data.ncOpen, sub: `${data.ncMajorOpen} major`, icon: AlertTriangle, route: "/non-conformities", alert: data.ncOpen > 0 },
    { label: t("dashboard.testStatus.ppiInProgress", { defaultValue: "PPIs em progresso" }), value: data.ppiInProgress, icon: ClipboardCheck, route: "/ppi", alert: false },
    { label: t("dashboard.testStatus.specimensOverdue", { defaultValue: "Provetes 28d s/ resultado" }), value: data.specimensOverdue, icon: Beaker, route: "/tests/concrete", alert: data.specimensOverdue > 0 },
    { label: t("dashboard.testStatus.weldsUsPending", { defaultValue: "Soldaduras s/ US" }), value: data.weldsUsPending, icon: Flame, route: "/tests/welding", alert: data.weldsUsPending > 0 },
    { label: t("dashboard.testStatus.testsOverdue", { defaultValue: "Ensaios pendentes" }), value: data.testsOverdue, icon: FlaskConical, route: "/tests", alert: data.testsOverdue > 3 },
  ] : [];

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          {t("dashboard.testStatus.title", { defaultValue: "Estado dos Ensaios" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                onClick={() => navigate(item.route)}
              >
                <item.icon className={`h-3.5 w-3.5 flex-shrink-0 ${item.alert ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="text-sm flex-1">{item.label}</span>
                {item.sub && <span className="text-[10px] text-muted-foreground">{item.sub}</span>}
                <Badge variant={item.alert ? "destructive" : "secondary"} className="text-[10px] min-w-[24px] justify-center">
                  {item.value}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

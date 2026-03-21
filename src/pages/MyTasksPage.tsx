import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import {
  CalendarCheck, ClipboardCheck, FlaskConical, AlertTriangle,
  ChevronRight, Clock, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

interface MyPpi {
  id: string;
  code: string;
  status: string;
  work_item_name: string | null;
  disciplina: string | null;
  total_items: number;
  ok_items: number;
  hp_pending_count: number;
  updated_at: string;
}

interface MyTestDue {
  id: string;
  test_type: string;
  work_item_name: string | null;
  due_at_date: string;
  is_overdue: boolean;
}

interface MyNC {
  id: string;
  code: string;
  title: string;
  severity: string;
  status: string;
  deadline: string | null;
  is_overdue: boolean;
}

// ─── Page ───────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const [ppis, setPpis] = useState<MyPpi[]>([]);
  const [tests, setTests] = useState<MyTestDue[]>([]);
  const [ncs, setNcs] = useState<MyNC[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeProject || !user) { setLoading(false); return; }
    setLoading(true);

    try {
      // 1. PPIs
      const { data: ppiData } = await (supabase as any)
        .from("ppi_instances")
        .select("id, code, status, updated_at, work_item_id")
        .eq("project_id", activeProject.id)
        .eq("is_deleted", false)
        .not("status", "in", '("approved","archived")');

      const ppiResults: MyPpi[] = [];
      if (ppiData) {
        for (const inst of ppiData) {
          // Get items count
          const { count: totalItems } = await (supabase as any)
            .from("ppi_instance_items")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id);

          const { count: okItems } = await (supabase as any)
            .from("ppi_instance_items")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id)
            .eq("result", "ok");

          // HP pending
          const { count: hpPending } = await (supabase as any)
            .from("hp_notifications")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id)
            .eq("status", "pending");

          // Work item name
          let workItemName: string | null = null;
          let disciplina: string | null = null;
          if (inst.work_item_id) {
            const { data: wi } = await (supabase as any)
              .from("work_items")
              .select("sector, disciplina")
              .eq("id", inst.work_item_id)
              .single();
            if (wi) {
              workItemName = wi.sector;
              disciplina = wi.disciplina;
            }
          }

          ppiResults.push({
            id: inst.id,
            code: inst.code,
            status: inst.status,
            work_item_name: workItemName,
            disciplina,
            total_items: totalItems ?? 0,
            ok_items: okItems ?? 0,
            hp_pending_count: hpPending ?? 0,
            updated_at: inst.updated_at,
          });
        }
      }
      // Sort: HP pending first, then by date desc
      ppiResults.sort((a, b) => {
        if (a.hp_pending_count > 0 && b.hp_pending_count === 0) return -1;
        if (a.hp_pending_count === 0 && b.hp_pending_count > 0) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      setPpis(ppiResults);

      // 2. Test due items (next 7 days, no result yet)
      const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const { data: testData } = await (supabase as any)
        .from("test_due_items")
        .select("id, test_type, work_item_id, due_at_date")
        .eq("project_id", activeProject.id)
        .is("related_test_result_id", null)
        .lte("due_at_date", sevenDaysFromNow)
        .order("due_at_date", { ascending: true });

      const testResults: MyTestDue[] = [];
      if (testData) {
        for (const td of testData) {
          let wiName: string | null = null;
          if (td.work_item_id) {
            const { data: wi } = await (supabase as any)
              .from("work_items")
              .select("sector")
              .eq("id", td.work_item_id)
              .single();
            wiName = wi?.sector ?? null;
          }
          testResults.push({
            id: td.id,
            test_type: td.test_type ?? "—",
            work_item_name: wiName,
            due_at_date: td.due_at_date,
            is_overdue: td.due_at_date < today,
          });
        }
      }
      setTests(testResults);

      // 3. NCs assigned to current user (by email/name match in responsible)
      const { data: ncData } = await (supabase as any)
        .from("non_conformities")
        .select("id, code, title, severity, status, deadline")
        .eq("project_id", activeProject.id)
        .eq("is_deleted", false)
        .not("status", "in", '("closed","archived")');

      const ncResults: MyNC[] = (ncData ?? []).map((nc: any) => ({
        id: nc.id,
        code: nc.code,
        title: nc.title,
        severity: nc.severity ?? "minor",
        status: nc.status,
        deadline: nc.deadline,
        is_overdue: nc.deadline ? nc.deadline < today : false,
      }));
      setNcs(ncResults);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeProject, user]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => ({
    hpPending: ppis.reduce((sum, p) => sum + p.hp_pending_count, 0),
    testsOverdue: tests.filter(t => t.is_overdue).length,
    ncsCount: ncs.length,
  }), [ppis, tests, ncs]);

  if (!activeProject) {
    return (
      <div className="p-6">
        <PageHeader title={t("myTasks.title")} icon={CalendarCheck} />
        <EmptyState icon={CalendarCheck} titleKey="common.noData" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader title={t("myTasks.title")} icon={CalendarCheck} />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label={t("myTasks.hpPending")}
          value={kpis.hpPending}
          icon={Bell}
          alert={kpis.hpPending > 0}
        />
        <KpiCard
          label={t("myTasks.testsDue")}
          value={kpis.testsOverdue}
          icon={FlaskConical}
          alert={kpis.testsOverdue > 0}
        />
        <KpiCard
          label={t("myTasks.ncsAssigned")}
          value={kpis.ncsCount}
          icon={AlertTriangle}
          alert={kpis.ncsCount > 0}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Section 1: PPIs */}
          <Section title={t("myTasks.myPpis")} icon={ClipboardCheck} count={ppis.length}>
            {ppis.length === 0 ? (
              <EmptyState icon={ClipboardCheck} titleKey="common.noData" />
            ) : (
              <div className="space-y-2">
                {ppis.map(ppi => (
                  <Card
                    key={ppi.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/ppi/${ppi.id}`)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground">{ppi.code}</span>
                          {ppi.work_item_name && (
                            <span className="text-xs text-muted-foreground truncate">{ppi.work_item_name}</span>
                          )}
                          {ppi.disciplina && (
                            <Badge variant="outline" className="text-[10px]">{ppi.disciplina}</Badge>
                          )}
                        </div>
                        <Progress value={ppi.total_items > 0 ? (ppi.ok_items / ppi.total_items) * 100 : 0} className="h-1.5" />
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{ppi.ok_items}/{ppi.total_items} {t("common.conforming").toLowerCase()}</span>
                          {ppi.hp_pending_count > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {ppi.hp_pending_count} HP
                            </Badge>
                          )}
                          <span className="ml-auto">{new Date(ppi.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* Section 2: Tests Due */}
          <Section title={t("myTasks.pendingTests")} icon={FlaskConical} count={tests.length}>
            {tests.length === 0 ? (
              <EmptyState icon={FlaskConical} titleKey="common.noData" />
            ) : (
              <div className="space-y-2">
                {tests.map(td => (
                  <Card key={td.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <FlaskConical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{td.test_type}</span>
                          {td.work_item_name && (
                            <span className="text-xs text-muted-foreground truncate">· {td.work_item_name}</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs",
                          td.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"
                        )}>
                          {td.is_overdue && <Clock className="inline h-3 w-3 mr-0.5" />}
                          {new Date(td.due_at_date).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* Section 3: NCs */}
          <Section title={t("myTasks.myNcs")} icon={AlertTriangle} count={ncs.length}>
            {ncs.length === 0 ? (
              <EmptyState icon={AlertTriangle} titleKey="common.noData" />
            ) : (
              <div className="space-y-2">
                {ncs.map(nc => (
                  <Card
                    key={nc.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/non-conformities/${nc.id}`)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground">{nc.code}</span>
                          <span className="text-xs text-muted-foreground truncate">{nc.title}</span>
                          <SeverityBadge severity={nc.severity} />
                        </div>
                        {nc.deadline && (
                          <span className={cn(
                            "text-[10px]",
                            nc.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
                            {nc.is_overdue && "⚠ "}
                            {new Date(nc.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, alert }: {
  label: string; value: number; icon: React.ElementType; alert: boolean;
}) {
  return (
    <Card className={cn(alert && "border-destructive/30")}>
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={cn("h-4 w-4 flex-shrink-0", alert ? "text-destructive" : "text-muted-foreground")} />
        <div className="min-w-0">
          <p className={cn("text-lg font-bold", alert ? "text-destructive" : "text-foreground")}>{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, icon: Icon, count, children }: {
  title: string; icon: React.ElementType; count: number; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === "critical"
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : severity === "major"
      ? "bg-amber-500/10 text-amber-700 border-amber-400/30"
      : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={cn("text-[10px]", cls)}>{severity}</Badge>;
}

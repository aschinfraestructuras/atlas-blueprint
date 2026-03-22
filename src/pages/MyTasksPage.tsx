import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarCheck, ClipboardCheck, FlaskConical, AlertTriangle,
  ChevronRight, Clock, Bell, Filter, CheckCircle2, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
} from "recharts";

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

type StatusFilter = "all" | "pending" | "overdue";

// ─── Page ───────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const [ppis, setPpis] = useState<MyPpi[]>([]);
  const [tests, setTests] = useState<MyTestDue[]>([]);
  const [ncs, setNcs] = useState<MyNC[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

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
          const { count: totalItems } = await (supabase as any)
            .from("ppi_instance_items")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id);

          const { count: okItems } = await (supabase as any)
            .from("ppi_instance_items")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id)
            .eq("result", "ok");

          const { count: hpPending } = await (supabase as any)
            .from("hp_notifications")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", inst.id)
            .eq("status", "pending");

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
      ppiResults.sort((a, b) => {
        // HP pending first
        if (a.hp_pending_count > 0 && b.hp_pending_count === 0) return -1;
        if (a.hp_pending_count === 0 && b.hp_pending_count > 0) return 1;
        // Then by progress ascending (less complete first)
        const pctA = a.total_items > 0 ? a.ok_items / a.total_items : 0;
        const pctB = b.total_items > 0 ? b.ok_items / b.total_items : 0;
        return pctA - pctB;
      });
      setPpis(ppiResults);

      // 2. Test due items
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

      // 3. NCs
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

  // ─── Derived data ─────────────────────────────────────────

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    ppis.forEach(p => p.disciplina && set.add(p.disciplina));
    return Array.from(set).sort();
  }, [ppis]);

  const kpis = useMemo(() => ({
    hpPending: ppis.reduce((sum, p) => sum + p.hp_pending_count, 0),
    testsOverdue: tests.filter(t => t.is_overdue).length,
    testsTotal: tests.length,
    ncsCount: ncs.length,
    ncsOverdue: ncs.filter(n => n.is_overdue).length,
    ppiTotal: ppis.length,
    ppiCompleted: ppis.filter(p => p.total_items > 0 && p.ok_items === p.total_items).length,
  }), [ppis, tests, ncs]);

  const completionRate = useMemo(() => {
    const total = kpis.ppiTotal + kpis.testsTotal + kpis.ncsCount;
    if (total === 0) return 0;
    const done = kpis.ppiCompleted + (kpis.testsTotal - tests.length) + 0;
    return Math.round((kpis.ppiCompleted / Math.max(kpis.ppiTotal, 1)) * 100);
  }, [kpis, tests]);

  // Filter PPIs
  const filteredPpis = useMemo(() => {
    let result = ppis;
    if (disciplineFilter !== "all") {
      result = result.filter(p => p.disciplina === disciplineFilter);
    }
    if (statusFilter === "overdue") {
      result = result.filter(p => p.hp_pending_count > 0);
    } else if (statusFilter === "pending") {
      result = result.filter(p => p.total_items > 0 && p.ok_items < p.total_items);
    }
    return result;
  }, [ppis, statusFilter, disciplineFilter]);

  const filteredTests = useMemo(() => {
    if (statusFilter === "overdue") return tests.filter(t => t.is_overdue);
    return tests;
  }, [tests, statusFilter]);

  const filteredNcs = useMemo(() => {
    if (statusFilter === "overdue") return ncs.filter(n => n.is_overdue);
    return ncs;
  }, [ncs, statusFilter]);

  // ─── Chart data ───────────────────────────────────────────

  const pieData = useMemo(() => {
    const hp = kpis.hpPending;
    const testsDue = kpis.testsTotal;
    const ncCount = kpis.ncsCount;
    return [
      { name: "HP", value: hp, color: "hsl(var(--destructive))" },
      { name: t("myTasks.pendingTests"), value: testsDue, color: "hsl(38 85% 50%)" },
      { name: "NCs", value: ncCount, color: "hsl(var(--primary))" },
    ].filter(d => d.value > 0);
  }, [kpis, t]);

  const barData = useMemo(() => {
    const byDiscipline: Record<string, { name: string; ppi: number; tests: number; nc: number }> = {};
    ppis.forEach(p => {
      const d = p.disciplina || "—";
      if (!byDiscipline[d]) byDiscipline[d] = { name: d, ppi: 0, tests: 0, nc: 0 };
      byDiscipline[d].ppi++;
    });
    return Object.values(byDiscipline).slice(0, 6);
  }, [ppis]);

  if (!activeProject) {
    return (
      <div className="p-6">
        <PageHeader title={t("myTasks.title")} icon={CalendarCheck} />
        <EmptyState icon={CalendarCheck} titleKey="common.noData" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString(
    i18n.language === "es" ? "es-ES" : "pt-PT",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <PageHeader title={t("myTasks.title")} subtitle={t("myTasks.todayDate", { date: today })} icon={CalendarCheck} />

      {/* ── KPIs Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label={t("myTasks.hpPending")} value={kpis.hpPending} icon={Bell} alert={kpis.hpPending > 0} />
        <KpiCard label={t("myTasks.testsDue")} value={kpis.testsOverdue} icon={FlaskConical} alert={kpis.testsOverdue > 0} subtitle={`${kpis.testsTotal} ${t("myTasks.filterPending").toLowerCase()}`} />
        <KpiCard label={t("myTasks.ncsAssigned")} value={kpis.ncsCount} icon={AlertTriangle} alert={kpis.ncsOverdue > 0} subtitle={kpis.ncsOverdue > 0 ? `${kpis.ncsOverdue} ${t("myTasks.filterOverdue").toLowerCase()}` : undefined} />
        <KpiCard label={t("myTasks.completionRate")} value={`${completionRate}%`} icon={TrendingUp} alert={false} />
      </div>

      {/* ── Charts Row ────────────────────────────────────── */}
      {(pieData.length > 0 || barData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Distribution Donut */}
          {pieData.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("myTasks.summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-4">
                  <div className="w-[100px] h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={45} strokeWidth={0}>
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {pieData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground flex-1">{entry.name}</span>
                        <span className="font-bold tabular-nums text-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PPIs by Discipline */}
          {barData.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  PPIs / {t("common.discipline", { defaultValue: "Disciplina" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Bar dataKey="ppi" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t("common.filter", { defaultValue: "Filtro" })}</span>
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="h-7">
            <TabsTrigger value="all" className="text-[10px] px-2.5 h-5">{t("myTasks.filterAll")}</TabsTrigger>
            <TabsTrigger value="pending" className="text-[10px] px-2.5 h-5">{t("myTasks.filterPending")}</TabsTrigger>
            <TabsTrigger value="overdue" className="text-[10px] px-2.5 h-5">
              {t("myTasks.filterOverdue")}
              {(kpis.testsOverdue + kpis.ncsOverdue + kpis.hpPending) > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[8px] px-1 min-w-[14px] text-center">
                  {kpis.testsOverdue + kpis.ncsOverdue + kpis.hpPending}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {disciplines.length > 1 && (
          <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
            <SelectTrigger className="h-7 w-[140px] text-[10px]">
              <SelectValue placeholder={t("common.discipline", { defaultValue: "Disciplina" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("myTasks.filterAll")}</SelectItem>
              {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Section 1: PPIs */}
          <Section title={t("myTasks.myPpis")} icon={ClipboardCheck} count={filteredPpis.length}>
            {filteredPpis.length === 0 ? (
              <EmptyState icon={ClipboardCheck} titleKey="common.noData" />
            ) : (
              <div className="space-y-2">
                {filteredPpis.map(ppi => {
                  const pct = ppi.total_items > 0 ? Math.round((ppi.ok_items / ppi.total_items) * 100) : 0;
                  return (
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
                            <Badge variant="secondary" className="text-[10px] ml-auto">{pct}%</Badge>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground/50" />
                            <span>{ppi.ok_items}/{ppi.total_items}</span>
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
                  );
                })}
              </div>
            )}
          </Section>

          {/* Section 2: Tests Due */}
          <Section title={t("myTasks.pendingTests")} icon={FlaskConical} count={filteredTests.length}>
            {filteredTests.length === 0 ? (
              <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">{t("myTasks.noOverdue")}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTests.map(td => (
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
                          {td.is_overdue && ` — ${t("myTasks.filterOverdue")}`}
                        </span>
                      </div>
                      {td.is_overdue && (
                        <Badge variant="destructive" className="text-[10px]">{t("myTasks.filterOverdue")}</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* Section 3: NCs */}
          <Section title={t("myTasks.myNcs")} icon={AlertTriangle} count={filteredNcs.length}>
            {filteredNcs.length === 0 ? (
              <EmptyState icon={AlertTriangle} titleKey="common.noData" />
            ) : (
              <div className="space-y-2">
                {filteredNcs.map(nc => (
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
                            {nc.is_overdue && ` — ${t("myTasks.filterOverdue")}`}
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

function KpiCard({ label, value, icon: Icon, alert, subtitle }: {
  label: string; value: number | string; icon: React.ElementType; alert: boolean; subtitle?: string;
}) {
  return (
    <Card className={cn("border", alert ? "border-destructive/30" : "border-border")}>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0",
          alert ? "bg-destructive/10" : "bg-muted"
        )}>
          <Icon className={cn("h-4 w-4", alert ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <p className={cn("text-lg font-black tabular-nums leading-tight", alert ? "text-destructive" : "text-foreground")}>{value}</p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{label}</p>
          {subtitle && <p className="text-[9px] text-muted-foreground/60 truncate">{subtitle}</p>}
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

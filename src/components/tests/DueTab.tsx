import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTestDueItems } from "@/hooks/useTestDueItems";
import { testDueService } from "@/lib/services/testDueService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/hooks/use-toast";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Clock, Search, Filter, CalendarPlus, Play, Ban, RefreshCw,
  Loader2, AlertTriangle, CheckCircle2, XCircle, CalendarClock,
  ListChecks, Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DUE_STATUS_COLORS: Record<string, string> = {
  due: "bg-orange-500/10 text-orange-600",
  scheduled: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  done: "bg-primary/15 text-primary",
  overdue: "bg-destructive/10 text-destructive",
  waived: "bg-muted text-muted-foreground",
};

export function DueTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);

  // Waive dialog
  const [waiveId, setWaiveId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiving, setWaiving] = useState(false);

  // Schedule dialog
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const filters = filterStatus !== "all" ? { status: filterStatus } : undefined;
  const { data, loading, refetch } = useTestDueItems(filters);

  // Search filter
  const filtered = data.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const testName = (d.test_plan_rules as any)?.tests_catalog?.name ?? "";
    const testCode = (d.test_plan_rules as any)?.tests_catalog?.code ?? "";
    const wiSector = (d.work_items as any)?.sector ?? "";
    const actDesc = (d.planning_activities as any)?.description ?? "";
    return testName.toLowerCase().includes(q) || testCode.toLowerCase().includes(q)
      || wiSector.toLowerCase().includes(q) || actDesc.toLowerCase().includes(q)
      || (d.due_reason ?? "").toLowerCase().includes(q);
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const d7 = new Date(); d7.setDate(d7.getDate() + 7);

  // We need all items (unfiltered) for KPIs — use data only when filterStatus is "all"
  // For simplicity: compute from full dataset when no filter, else show "--"
  const allItems = data; // since we refetch with filters, we compute KPIs from what we have

  const totalDue = allItems.length;
  const overdue = allItems.filter(d => d.status === "overdue").length;
  const scheduled7d = allItems.filter(d =>
    d.status === "scheduled" && d.scheduled_for && new Date(d.scheduled_for) <= d7
  ).length;
  const pending = allItems.filter(d => ["due", "scheduled", "in_progress"].includes(d.status)).length;

  // For pass/fail 30d we'd need test results — approximate from done items
  const done30d = allItems.filter(d => d.status === "done" && d.related_test_result_id).length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeProject) return;
    setGenerating(true);
    try {
      const count = await testDueService.generateDueTests(activeProject.id);
      if (count > 0) {
        toast({ title: t("tests.due.generated"), description: t("tests.due.generatedCount", { count }) });
      } else {
        toast({ title: t("tests.due.generated"), description: t("tests.due.noGenerated") });
      }
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleId || !scheduleDate || !activeProject) return;
    setScheduling(true);
    try {
      await testDueService.schedule(scheduleId, activeProject.id, scheduleDate);
      toast({ title: t("tests.due.scheduled") });
      setScheduleId(null);
      setScheduleDate("");
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const handleStart = async (id: string) => {
    if (!activeProject) return;
    try {
      await testDueService.startTest(id, activeProject.id);
      toast({ title: t("tests.due.started") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleWaive = async () => {
    if (!waiveId || !waiveReason.trim()) return;
    setWaiving(true);
    try {
      await testDueService.waive(waiveId, waiveReason);
      toast({ title: t("tests.due.waived") });
      setWaiveId(null);
      setWaiveReason("");
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally {
      setWaiving(false);
    }
  };

  const DUE_STATUSES = ["due", "scheduled", "in_progress", "done", "overdue", "waived"];

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ModuleKPICard icon={ListChecks} label={t("tests.due.kpi.totalDue")} value={totalDue} />
        <ModuleKPICard icon={AlertTriangle} label={t("tests.due.kpi.overdue")} value={overdue}
          color={overdue > 0 ? "hsl(var(--destructive))" : undefined} />
        <ModuleKPICard icon={CalendarClock} label={t("tests.due.kpi.scheduled7d")} value={scheduled7d} />
        <ModuleKPICard icon={CheckCircle2} label={t("tests.due.kpi.pass30d")} value={done30d} />
        <ModuleKPICard icon={XCircle} label={t("tests.due.kpi.fail30d")} value={0} />
        <ModuleKPICard icon={Timer} label={t("tests.due.kpi.pending")} value={pending} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.results.filters.allStatuses")}</SelectItem>
            {DUE_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`tests.due.status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5 ml-auto" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("tests.due.generateBtn")}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : allItems.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t("tests.due.howToSchedule")}</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <Badge variant="secondary" className="mr-1.5 text-[10px]">1</Badge>
                {t("tests.due.step1")}
              </p>
              <p>
                <Badge variant="secondary" className="mr-1.5 text-[10px]">2</Badge>
                {t("tests.due.step2")}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              navigate("/tests?tab=plan");
            }}>
              {t("tests.due.goToPlans")} →
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Clock} subtitleKey="tests.due.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.test")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.context")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.reason")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.dueDate")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.lab")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.due.table.status")}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const rule = item.test_plan_rules as any;
                const catalog = rule?.tests_catalog;
                const wi = item.work_items as any;
                const act = item.planning_activities as any;
                const lab = item.suppliers as any;
                const canAct = ["due", "scheduled"].includes(item.status);

                return (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{catalog?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{catalog?.code ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {wi && <div>{wi.sector} — {wi.disciplina}</div>}
                      {act && <div>{act.description}{act.zone ? ` (${act.zone})` : ""}</div>}
                      {!wi && !act && "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t(`tests.due.reasons.${item.due_reason}`, { defaultValue: item.due_reason })}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.due_at_date ?? item.scheduled_for ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lab?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", DUE_STATUS_COLORS[item.status] ?? "")}>
                        {t(`tests.due.status.${item.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canAct && (
                        <div className="flex items-center gap-1">
                          {item.status === "due" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title={t("tests.due.schedule")}
                              onClick={() => { setScheduleId(item.id); setScheduleDate(""); }}>
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={t("tests.due.start")} onClick={() => handleStart(item.id)}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={t("tests.due.waive")}
                            onClick={() => { setWaiveId(item.id); setWaiveReason(""); }}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Waive Dialog */}
      <Dialog open={!!waiveId} onOpenChange={(o) => { if (!o) setWaiveId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("tests.due.waive")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("tests.due.waiveReason")}</Label>
            <Textarea value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)}
              placeholder={t("tests.due.waiveReasonPlaceholder")} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveId(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleWaive} disabled={!waiveReason.trim() || waiving}>
              {waiving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={!!scheduleId} onOpenChange={(o) => { if (!o) setScheduleId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("tests.due.schedule")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("common.date")}</Label>
            <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleId(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleSchedule} disabled={!scheduleDate || scheduling}>
              {scheduling && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

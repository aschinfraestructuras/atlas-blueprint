import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Construction, FlaskConical, AlertTriangle, Paperclip,
  Pencil, Calendar, MapPin, ClipboardCheck, Plus, Eye, FileDown, FileText,
  CheckCircle2, XCircle, Clock, Crosshair, Target, Map, ListTodo,
  ShieldCheck, ShieldAlert,
} from "lucide-react";
import {
  exportWorkItemTestsPdf,
  type TestExportLabels,
} from "@/lib/services/testExportService";
import { workItemService, formatPk, type WorkItem } from "@/lib/services/workItemService";
import { ppiService, type PpiInstanceStatus } from "@/lib/services/ppiService";
import { exportWorkItemConsolidatedPdf, type WorkItemForExport, type ConsolidatedExportData } from "@/lib/services/workItemExportService";
import { testService, type TestResult } from "@/lib/services/testService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { PPIInstanceFormDialog } from "@/components/ppi/PPIInstanceFormDialog";
import { TestResultFormDialog } from "@/components/tests/TestResultFormDialog";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { topographyRequestService, topographyControlService, type TopographyRequest, type TopographyControl } from "@/lib/services/topographyService";
import { surveyService, type SurveyRecord } from "@/lib/services/surveyService";
import { planningService, type Activity } from "@/lib/services/planningService";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned:     "outline",
  in_progress: "default",
  hold:        "outline",
  completed:   "secondary",
  approved:    "secondary",
  archived:    "outline",
  cancelled:   "destructive",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-xs">
      {t(`workItems.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ─── NC / Test status colors ──────────────────────────────────────────────────

const NC_STATUS_COLORS: Record<string, string> = {
  open:        "hsl(2, 60%, 44%)",
  in_progress: "hsl(33, 75%, 38%)",
  closed:      "hsl(158, 45%, 32%)",
};

const TEST_STATUS_COLORS: Record<string, string> = {
  draft:        "hsl(215, 15%, 65%)",
  pending:      "hsl(215, 15%, 65%)",
  in_progress:  "hsl(215, 70%, 50%)",
  completed:    "hsl(270, 60%, 55%)",
  approved:     "hsl(158, 45%, 32%)",
  archived:     "hsl(215, 15%, 65%)",
  pass:         "hsl(158, 45%, 32%)",
  fail:         "hsl(2, 60%, 44%)",
  inconclusive: "hsl(33, 75%, 38%)",
};

// ─── Pass/fail icon ───────────────────────────────────────────────────────────

function TestStatusIcon({ status, passFail }: { status: string; passFail?: string | null }) {
  const cls = "h-3.5 w-3.5 flex-shrink-0";
  const eff = passFail ?? status;
  if (eff === "approved" || eff === "pass") return <CheckCircle2 className={cls} style={{ color: "hsl(158, 45%, 32%)" }} />;
  if (eff === "fail")                       return <XCircle      className={cls} style={{ color: "hsl(2, 60%, 44%)" }} />;
  if (eff === "in_progress")               return <Clock        className={cls} style={{ color: "hsl(215, 70%, 50%)" }} />;
  return <FlaskConical className={cls} style={{ color: "hsl(215, 15%, 65%)" }} />;
}


// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-28 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

// ─── PPI list for a work item ─────────────────────────────────────────────────

type PpiRow = {
  id: string;
  code: string;
  status: PpiInstanceStatus;
  template_disciplina: string | null;
  template_code: string | null;
  updated_at: string;
};

function WorkItemPPITab({
  workItemId,
  projectId,
}: {
  workItemId: string;
  projectId: string;
}) {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const [ppiList,  setPpiList]  = useState<PpiRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await ppiService.listInstances(projectId, { work_item_id: workItemId });
      setPpiList(rows as PpiRow[]);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [workItemId, projectId]);

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("ppi.instances.title")}
            {ppiList.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                {ppiList.length}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" />
            {t("workItems.detail.ppiTab.createPPI")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : ppiList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <ClipboardCheck className="h-6 w-6 opacity-40" />
              <p className="text-sm">{t("workItems.detail.ppiTab.empty")}</p>
              <Button
                size="sm" variant="outline" className="gap-1.5 mt-1 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3 w-3" />
                {t("workItems.detail.ppiTab.createPPI")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ppiList.map((ppi) => (
                <li
                  key={ppi.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer group"
                  onClick={() => navigate(`/ppi/${ppi.id}`)}
                >
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-foreground">{ppi.code}</p>
                    {ppi.template_disciplina && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`ppi.disciplinas.${ppi.template_disciplina}`, { defaultValue: ppi.template_disciplina })}
                        {ppi.template_code && ` · ${ppi.template_code}`}
                      </p>
                    )}
                  </div>
                  <PPIStatusBadge status={ppi.status} />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); navigate(`/ppi/${ppi.id}`); }}
                    title={t("common.view")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PPIInstanceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        preselectedWorkItemId={workItemId}
        onSuccess={(id) => { load(); navigate(`/ppi/${id}`); }}
      />
    </>
  );
}

// ─── Tests tab for work item ──────────────────────────────────────────────────

function WorkItemTestsTab({
  workItemId,
  projectId,
  workItemSector,
  projectName,
}: {
  workItemId: string;
  projectId: string;
  workItemSector?: string;
  projectName?: string;
}) {
  const { t, i18n } = useTranslation();
  const [tests,     setTests]     = useState<TestResult[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,   setEditing]   = useState<TestResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testService.getByWorkItem(workItemId);
      setTests(data);
    } catch (err) {
      console.error("[WorkItemTestsTab] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [workItemId]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:    tests.length,
    approved: tests.filter((r) => r.status === "approved" || r.pass_fail === "pass").length,
    failed:   tests.filter((r) => r.pass_fail === "fail").length,
    pending:  tests.filter((r) => ["draft", "in_progress", "pending"].includes(r.status)).length,
  };

  const STAT_ITEMS = [
    { key: "total",    color: "text-foreground" },
    { key: "approved", color: "text-primary" },
    { key: "failed",   color: "text-destructive" },
    { key: "pending",  color: "text-muted-foreground" },
  ] as const;

  const handleExportWI = () => {
    if (tests.length === 0) return;
    const labels: TestExportLabels = {
      appName:            "Atlas QMS",
      reportTitle:        t("tests.export.reportTitle"),
      bulkReportTitle:    t("tests.export.bulkReportTitle"),
      wiSummaryTitle:     t("tests.export.wiSummaryTitle"),
      generatedOn:        t("tests.export.generatedOn"),
      project:            t("tests.export.project"),
      workItem:           t("tests.export.workItem"),
      date:               t("tests.export.date"),
      laboratory:         t("tests.export.laboratory"),
      reportNumber:       t("tests.export.reportNumber"),
      technician:         t("tests.export.technician"),
      testCode:           t("tests.export.testCode"),
      testName:           t("tests.export.testName"),
      discipline:         t("tests.export.discipline"),
      standards:          t("tests.export.standards"),
      method:             t("tests.export.method"),
      acceptanceCriteria: t("tests.export.acceptanceCriteria"),
      sampleRef:          t("tests.export.sampleRef"),
      location:           t("tests.export.location"),
      pkRange:            t("tests.export.pkRange"),
      status:             t("tests.export.status"),
      passFail:           t("tests.export.passFail"),
      notes:              t("tests.export.notes"),
      attachments:        t("tests.export.attachments"),
      results:            t("tests.export.results"),
      page:               t("tests.export.page"),
      of:                 t("tests.export.of"),
      approvalRate:       t("tests.export.approvalRate"),
      total:              t("tests.stats.total"),
      approved:           t("tests.stats.approved"),
      failed:             t("tests.stats.failed"),
      pending:            t("tests.stats.pending"),
      statuses: {
        draft:       t("tests.status.draft"),
        pending:     t("tests.status.pending"),
        in_progress: t("tests.status.in_progress"),
        completed:   t("tests.status.completed"),
        approved:    t("tests.status.approved"),
        archived:    t("tests.status.archived"),
      },
      passFailLabels: {
        pass:         t("tests.status.pass"),
        fail:         t("tests.status.fail"),
        inconclusive: t("tests.status.inconclusive"),
        na:           "N/A",
      },
    };
    exportWorkItemTestsPdf(
      tests, labels, i18n.language,
      projectName ?? "Atlas",
      workItemSector ?? workItemId,
    );
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t("workItems.detail.tabs.tests")}
              {tests.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                  {tests.length}
                </span>
              )}
            </CardTitle>
            {tests.length > 0 && STAT_ITEMS.map((s) => (
              <span
                key={s.key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold",
                  s.color,
                )}
              >
                {stats[s.key]}
                <span className="font-normal text-muted-foreground">
                  {t(`tests.workItemTab.stats.${s.key}`)}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {tests.length > 0 && (
              <Button
                size="sm" variant="ghost"
                className="gap-1.5 h-7 text-xs text-muted-foreground"
                onClick={handleExportWI}
                title={t("tests.workItemTab.exportSummary")}
              >
                <FileDown className="h-3 w-3" />
                {t("tests.workItemTab.exportSummary")}
              </Button>
            )}
            <Button
              size="sm" variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
            >
              <Plus className="h-3 w-3" />
              {t("tests.workItemTab.createTest")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <FlaskConical className="h-6 w-6 opacity-40" />
              <p className="text-sm">{t("tests.workItemTab.empty")}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 mt-1 text-xs"
                onClick={() => { setEditing(null); setDialogOpen(true); }}
              >
                <Plus className="h-3 w-3" />
                {t("tests.workItemTab.createTest")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tests.map((tr) => {
                const tc = tr.tests_catalog as any;
                const statusColor = TEST_STATUS_COLORS[tr.pass_fail ?? tr.status] ?? TEST_STATUS_COLORS.pending;
                return (
                  <li
                    key={tr.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer group"
                    onClick={() => { setEditing(tr); setDialogOpen(true); }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                      style={{ background: `${statusColor}18` }}
                    >
                      <TestStatusIcon status={tr.status} passFail={tr.pass_fail} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tc?.name ?? t("tests.unknownTest")}
                        {tc?.code && (
                          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground font-normal">
                            {tc.code}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        {new Date(tr.date).toLocaleDateString()}
                        {tr.sample_ref && (
                          <><span>·</span><span>Ref: {tr.sample_ref}</span></>
                        )}
                        {tr.location && (
                          <><span>·</span><MapPin className="h-3 w-3 flex-shrink-0" /><span>{tr.location}</span></>
                        )}
                        {tr.report_number && (
                          <><span>·</span><span className="font-mono">{tr.report_number}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tr.pass_fail && (
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] py-0",
                            tr.pass_fail === "pass"         ? "bg-primary/10 text-primary" :
                            tr.pass_fail === "fail"         ? "bg-destructive/10 text-destructive" :
                            "bg-orange-500/10 text-orange-600",
                          )}
                        >
                          {t(`tests.status.${tr.pass_fail}`, { defaultValue: tr.pass_fail })}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] py-0">
                        {t(`tests.status.${tr.status}`, { defaultValue: tr.status })}
                      </Badge>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setEditing(tr); setDialogOpen(true); }}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <TestResultFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testResult={editing}
        preselectedWorkItemId={workItemId}
        onSuccess={load}
      />
    </>
  );
}

// ─── Planning tab ─────────────────────────────────────────────────────────────

function WorkItemPlanningTab({ workItemId, projectId }: { workItemId: string; projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const all = await planningService.getActivities(projectId);
        setActivities(all.filter(a => a.work_item_id === workItemId));
      } catch { /* */ } finally { setLoading(false); }
    }
    load();
  }, [workItemId, projectId]);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("planning.activities", { defaultValue: "Atividades" })}
          {activities.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">{activities.length}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <ListTodo className="h-6 w-6 opacity-40" />
            <p className="text-sm">{t("planning.noActivities", { defaultValue: "Sem atividades ligadas." })}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activities.map(a => (
              <li
                key={a.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer"
                onClick={() => navigate(`/planning/activities/${a.id}`)}
              >
                <ListTodo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {a.zone && <span>{a.zone}</span>}
                    {a.planned_start && <><Calendar className="h-3 w-3" /><span>{a.planned_start}</span></>}
                    <span>{a.progress_pct}%</span>
                  </div>
                </div>
                <Badge variant={a.status === "completed" ? "secondary" : "outline"} className="text-xs">
                  {t(`planning.statuses.${a.status}`, { defaultValue: a.status })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Topography tab ───────────────────────────────────────────────────────────

function WorkItemTopoTab({ workItemId, projectId }: { workItemId: string; projectId: string }) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<TopographyRequest[]>([]);
  const [controls, setControls] = useState<TopographyControl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [reqData, ctrlData] = await Promise.all([
          topographyRequestService.getByProject(projectId),
          topographyControlService.getByProject(projectId),
        ]);
        setRequests(reqData.filter(r => r.work_item_id === workItemId));
        setControls(ctrlData.filter(c => c.work_item_id === workItemId));
      } catch { /* */ } finally { setLoading(false); }
    }
    load();
  }, [workItemId, projectId]);

  const total = requests.length + controls.length;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("topography.title")}
          {total > 0 && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">{total}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Crosshair className="h-6 w-6 opacity-40" />
            <p className="text-sm">{t("topography.noLinked", { defaultValue: "Sem registos topográficos ligados a esta atividade." })}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <FileText className="inline h-3 w-3 mr-1" />{t("topography.requests")} ({requests.length})
                </p>
                <ul className="space-y-1">
                  {requests.map(r => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span>{r.request_type} — {r.description.substring(0, 60)}</span>
                      <Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-xs">{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {controls.length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Target className="inline h-3 w-3 mr-1" />{t("topography.controls")} ({controls.length})
                </p>
                <ul className="space-y-1">
                  {controls.map(c => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span>{c.element} — {c.zone ?? "—"}</span>
                      <Badge variant={c.result === "conforme" ? "default" : "destructive"} className="text-xs">
                        {c.result === "conforme" ? "Conforme" : "Não conforme"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkItemDetailPage() {
  const { t, i18n }       = useTranslation();
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { activeProject } = useProject();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/work-items", { replace: true });
    }
  }, [id]);

  const [item,       setItem]       = useState<WorkItem | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [editOpen,   setEditOpen]   = useState(false);
  const [ncs,        setNcs]        = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(true);

  // State for consolidated export data
  const [ppiList, setPpiList] = useState<any[]>([]);
  const [testsList, setTestsList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [topoRequests, setTopoRequests] = useState<any[]>([]);
  const [topoControls, setTopoControls] = useState<any[]>([]);

  async function handleExportPdf() {
    if (!item || !activeProject) return;
    const locale = i18n.language ?? "pt";
    const wi: WorkItemForExport = {
      ...item,
      disciplina_label: t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina }),
      status_label:     t(`workItems.status.${item.status}`,          { defaultValue: item.status }),
      ppi_count:  ppiList.length,
      nc_count:   ncs.length,
      test_count: testsList.length,
    };

    // Fetch all related data for consolidated export
    const [ppiData, testsData, actData, reqData, ctrlData] = await Promise.all([
      ppiService.listInstances(activeProject.id, { work_item_id: item.id }).catch(() => []),
      testService.getByWorkItem(item.id).catch(() => []),
      planningService.getActivities(activeProject.id).then(all => all.filter(a => a.work_item_id === item.id)).catch(() => []),
      topographyRequestService.getByProject(activeProject.id).then(all => all.filter(r => r.work_item_id === item.id)).catch(() => []),
      topographyControlService.getByProject(activeProject.id).then(all => all.filter(c => c.work_item_id === item.id)).catch(() => []),
    ]);

    wi.ppi_count = ppiData.length;
    wi.test_count = testsData.length;

    const consolidated: ConsolidatedExportData = {
      ppis: ppiData.map((p: any) => ({ code: p.code, status: p.status, disciplina: p.template_disciplina ?? "—" })),
      tests: testsData.map((tr: any) => ({
        name: (tr.tests_catalog as any)?.name ?? "—",
        code: (tr.tests_catalog as any)?.code ?? "",
        status: tr.status,
        passFail: tr.pass_fail ?? "—",
        date: tr.date,
      })),
      ncs: ncs.map((nc: any) => ({
        code: nc.code ?? nc.reference ?? "—",
        description: nc.description?.substring(0, 80) ?? "",
        severity: nc.severity,
        status: nc.status,
      })),
      activities: actData.map((a: any) => ({
        description: a.description,
        status: a.status,
        progress: a.progress_pct,
        zone: a.zone ?? "—",
      })),
      topoRequests: reqData.map((r: any) => ({
        type: r.request_type,
        description: r.description?.substring(0, 60) ?? "",
        status: r.status,
      })),
      topoControls: ctrlData.map((c: any) => ({
        element: c.element,
        zone: c.zone ?? "—",
        result: c.result,
        deviation: c.deviation ?? "—",
      })),
    };

    exportWorkItemConsolidatedPdf(wi, {
      appName:     "Atlas QMS",
      reportTitle: t("workItems.export.reportTitle"),
      generatedOn: t("workItems.export.generatedOn"),
      project:     t("workItems.export.fields.sector"),
      sector:      t("workItems.export.fields.sector"),
      discipline:  t("workItems.export.fields.discipline"),
      obra:        t("workItems.export.fields.obra"),
      lote:        t("workItems.export.fields.lote"),
      elemento:    t("workItems.export.fields.elemento"),
      parte:       t("workItems.export.fields.parte"),
      pk:          t("workItems.export.fields.pk"),
      status:      t("workItems.export.fields.status"),
      createdAt:   t("workItems.export.fields.createdAt"),
      ncs:         t("workItems.export.fields.ncs"),
      tests:       t("workItems.export.fields.tests"),
      ppis:        t("workItems.export.fields.ppis"),
    }, locale, activeProject.name, consolidated);
  }

  async function loadItem() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await workItemService.getById(id);
      setItem(data);
    } catch {
      toast({ title: t("workItems.detail.loadError"), variant: "destructive" });
      navigate("/work-items");
    } finally {
      setLoading(false);
    }
  }

  async function loadRelated() {
    if (!id) return;
    setSubLoading(true);
    try {
      const { data: ncData } = await supabase
        .from("non_conformities")
        .select("*")
        .eq("work_item_id", id)
        .order("created_at", { ascending: false });
      setNcs(ncData ?? []);
    } catch {
      // non-blocking
    } finally {
      setSubLoading(false);
    }
  }

  useEffect(() => {
    loadItem();
    loadRelated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* ── Back + Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/work-items")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("workItems.detail.breadcrumb")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Construction className="h-5 w-5 text-muted-foreground" />
              {item.sector}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={item.status} />
              <span className="text-xs text-muted-foreground">
                {t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
            <FileDown className="h-3.5 w-3.5" /> {t("common.exportPdf", { defaultValue: "Exportar PDF" })}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> {t("workItems.detail.edit")}
          </Button>
        </div>
      </div>

      {/* ── Detail card ──────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("workItems.detail.generalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label={t("workItems.detail.sector")}     value={item.sector} />
            <InfoRow label={t("workItems.detail.discipline")} value={t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })} />
            <InfoRow label={t("workItems.detail.obra")}       value={item.obra} />
            <InfoRow label={t("workItems.detail.lote")}       value={item.lote} />
          </div>
          <div>
            <InfoRow label={t("workItems.detail.element")} value={item.elemento} />
            <InfoRow label={t("workItems.detail.parte")}   value={item.parte} />
            <InfoRow
              label={t("workItems.detail.pk")}
              value={
                <span className="font-mono text-xs">
                  {formatPk(item.pk_inicio, item.pk_fim)}
                </span>
              }
            />
            <InfoRow
              label={t("workItems.detail.createdAt")}
              value={new Date(item.created_at).toLocaleDateString(undefined, {
                day: "2-digit", month: "short", year: "numeric",
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Readiness card ───────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardContent className="px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {item.readiness_status === "blocked" ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            <span className={cn(
              "text-sm font-bold",
              item.readiness_status === "blocked" ? "text-destructive" : "text-primary",
            )}>
              {t(`workItems.readiness.${item.readiness_status ?? "not_ready"}`)}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {item.has_open_nc && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {t("workItems.readiness.openNc")}
              </span>
            )}
            {item.has_pending_ppi && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <ClipboardCheck className="h-3 w-3" />
                {t("workItems.readiness.pendingPpi")}
              </span>
            )}
            {item.has_pending_tests && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                <FlaskConical className="h-3 w-3" />
                {t("workItems.readiness.pendingTests")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ppi">
        <TabsList>
          <TabsTrigger value="ppi" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.ppi")}
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.tests")}
          </TabsTrigger>
          <TabsTrigger value="ncs" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.ncs")}
            {ncs.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-bold text-destructive">
                {ncs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("documents.linkedPanel.title")}
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.planning", { defaultValue: "Planeamento" })}
          </TabsTrigger>
          <TabsTrigger value="topography" className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" />
            {t("topography.title")}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.attachments")}
          </TabsTrigger>
        </TabsList>

        {/* PPI tab */}
        <TabsContent value="ppi" className="mt-4">
          <WorkItemPPITab workItemId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* Tests tab */}
        <TabsContent value="tests" className="mt-4">
          <WorkItemTestsTab workItemId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* NCs tab */}
        <TabsContent value="ncs" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {subLoading ? (
                <div className="p-5 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : ncs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <AlertTriangle className="h-6 w-6 opacity-40" />
                  <p className="text-sm">{t("workItems.detail.emptyNcs")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {ncs.map((nc) => (
                    <li key={nc.id} className="flex items-start gap-3 px-5 py-3">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: `${NC_STATUS_COLORS[nc.status] ?? "#888"}18` }}
                      >
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          style={{ color: NC_STATUS_COLORS[nc.status] ?? "#888" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{nc.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {nc.reference && (
                            <span className="text-[10px] font-mono text-muted-foreground">#{nc.reference}</span>
                          )}
                          {nc.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(nc.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant={nc.severity === "critical" || nc.severity === "high" ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {t(`nc.status.${nc.status}`, { defaultValue: nc.status })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4">
          <LinkedDocumentsPanel entityType="work_item" entityId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* Planning tab */}
        <TabsContent value="planning" className="mt-4">
          <WorkItemPlanningTab workItemId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* Topography tab */}
        <TabsContent value="topography" className="mt-4">
          <WorkItemTopoTab workItemId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* Attachments tab */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="work_items"
            entityId={item.id}
            projectId={activeProject?.id ?? ""}
          />
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
      <WorkItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
        onSuccess={() => { loadItem(); }}
      />
    </div>
  );
}

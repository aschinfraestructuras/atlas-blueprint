import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { testService } from "@/lib/services/testService";
import type { TestCatalogEntry, TestResult } from "@/lib/services/testService";
import {
  exportTestResultPdf,
  exportTestResultsBulkPdf,
  type TestExportLabels,
} from "@/lib/services/testExportService";
import { exportBeCampoPdf } from "@/lib/services/beCampoExportService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/hooks/use-toast";
import {
  FlaskConical, Plus, Pencil, Search, Filter, Archive, Copy, Trash2,
  CheckCircle2, XCircle, Clock, AlertCircle, BookOpen, FileDown,
  Loader2, AlertTriangle, PieChart as PieChartIcon, BarChart3,
  Layers, Gauge, Mountain, Flame,
} from "lucide-react";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { CatalogFormDialog } from "@/components/tests/CatalogFormDialog";
import { TestResultFormDialog } from "@/components/tests/TestResultFormDialog";
import { cn } from "@/lib/utils";
import { TEST_DISCIPLINES } from "@/lib/services/testService";
import { supabase } from "@/integrations/supabase/client";
import { DueTab } from "@/components/tests/DueTab";
import { PlanTab } from "@/components/tests/PlanTab";
import { ConcreteTab } from "@/components/tests/ConcreteTab";
import { CompactionTab } from "@/components/tests/CompactionTab";
import { SoilsTab } from "@/components/tests/SoilsTab";
import { WeldTab } from "@/components/tests/WeldTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:        "bg-muted text-muted-foreground",
  pending:      "bg-muted text-muted-foreground",
  in_progress:  "bg-blue-500/10 text-blue-600",
  completed:    "bg-violet-500/10 text-violet-600",
  approved:     "bg-primary/15 text-primary",
  archived:     "bg-muted/60 text-muted-foreground",
  pass:         "bg-primary/15 text-primary",
  fail:         "bg-destructive/10 text-destructive",
  inconclusive: "bg-orange-500/10 text-orange-600",
};

function StatusIcon({ status }: { status: string }) {
  const cls = "h-3.5 w-3.5 flex-shrink-0";
  if (status === "approved" || status === "pass") return <CheckCircle2 className={cls} />;
  if (status === "fail")                          return <XCircle      className={cls} />;
  if (status === "in_progress")                   return <Clock        className={cls} />;
  if (status === "completed")                     return <CheckCircle2 className={cls} />;
  return <AlertCircle className={cls} />;
}

// ─── Build export labels from i18n ────────────────────────────────────────────

function useExportLabels(): TestExportLabels {
  const { t } = useTranslation();
  return {
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
      draft:        t("tests.status.draft"),
      pending:      t("tests.status.pending"),
      in_progress:  t("tests.status.in_progress"),
      completed:    t("tests.status.completed"),
      approved:     t("tests.status.approved"),
      archived:     t("tests.status.archived"),
    },
    passFailLabels: {
      pass:         t("tests.status.pass"),
      fail:         t("tests.status.fail"),
      inconclusive: t("tests.status.inconclusive"),
      na:           "N/A",
    },
  };
}

// ─── Catalog tab ──────────────────────────────────────────────────────────────

function CatalogTab() {
  const { t }             = useTranslation();
  const { activeProject } = useProject();
  const [catalog, setCatalog]           = useState<TestCatalogEntry[]>([]);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState("");
  const [filterDisc, setFilterDisc]     = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editing, setEditing]           = useState<TestCatalogEntry | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await testService.getCatalogByProject(activeProject.id, showInactive);
      setCatalog(data);
    } catch (err) {
      console.error("[CatalogTab] load error:", err);
    } finally { setLoading(false); }
  }, [activeProject, showInactive]);

  useEffect(() => { load(); }, [load]);

  const filtered = catalog.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) ||
      (c.standards ?? []).some((s) => s.toLowerCase().includes(q));
    const matchDisc = filterDisc === "all" || c.disciplina === filterDisc;
    return matchSearch && matchDisc;
  });

  const handleArchive = async (entry: TestCatalogEntry) => {
    if (!activeProject) return;
    try {
      await testService.archiveCatalogEntry(entry.id, activeProject.id, !entry.active);
      toast({ title: entry.active ? t("tests.catalog.toast.archived") : t("tests.catalog.toast.activated") });
      load();
    } catch (err) {
      console.error("[handleArchive]", err);
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleClone = async (entry: TestCatalogEntry) => {
    if (!activeProject) return;
    try {
      await testService.cloneCatalogEntry(entry.id, activeProject.id);
      toast({ title: t("tests.catalog.toast.cloned") });
      load();
    } catch (err) {
      console.error("[handleClone]", err);
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tests.catalog.searchPlaceholder")}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterDisc} onValueChange={setFilterDisc}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.catalog.filters.allDisciplines")}</SelectItem>
            {TEST_DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm" className="h-8 text-xs gap-1.5"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? t("tests.catalog.filters.hideInactive") : t("tests.catalog.filters.showInactive")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 ml-auto"
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("tests.catalog.newEntry")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} subtitleKey="tests.catalog.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.disciplina")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.standards")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.unit")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id} className={cn("hover:bg-muted/20 transition-colors", !entry.active && "opacity-50")}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">{entry.code}</TableCell>
                  <TableCell className="text-sm text-foreground font-medium max-w-[200px]">
                    <div className="truncate">{entry.name}</div>
                    {entry.acceptance_criteria && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{entry.acceptance_criteria}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t(`ppi.disciplinas.${entry.disciplina}`, { defaultValue: entry.disciplina })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(entry.standards ?? []).slice(0, 2).map((s) => (
                        <Badge key={s} variant="outline" className="font-mono text-[10px] py-0">{s}</Badge>
                      ))}
                      {(entry.standards ?? []).length > 2 && (
                        <Badge variant="outline" className="text-[10px] py-0">+{(entry.standards ?? []).length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{entry.unit ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", entry.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      {entry.active ? t("tests.catalog.status.active") : t("tests.catalog.status.archived")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={t("common.edit")}
                        onClick={() => { setEditing(entry); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={t("tests.catalog.clone")} onClick={() => handleClone(entry)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={entry.active ? t("tests.catalog.archive") : t("tests.catalog.activate")}
                        onClick={() => handleArchive(entry)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CatalogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        onSuccess={load}
      />
    </div>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────────

function ResultsTab() {
  const { t, i18n }       = useTranslation();
  const { activeProject } = useProject();
  const exportLabels      = useExportLabels();
  const { logoUrl, logoBase64 } = useProjectLogo();

  const [results, setResults]           = useState<TestResult[]>([]);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDisc, setFilterDisc]     = useState("all");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editing, setEditing]           = useState<TestResult | null>(null);
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await testService.getByProject(
        activeProject.id,
        filterStatus !== "all" ? { status: filterStatus } : undefined,
      );
      setResults(data);
      setSelected(new Set()); // clear selection on reload
    } catch (err) {
      console.error("[ResultsTab] load error:", err);
    } finally { setLoading(false); }
  }, [activeProject, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = results.filter((r) => {
    const q = search.toLowerCase();
    const tc = r.tests_catalog as any;
    const matchSearch = !q
      || (r.code ?? "").toLowerCase().includes(q)
      || (tc?.name ?? "").toLowerCase().includes(q)
      || (tc?.code ?? "").toLowerCase().includes(q)
      || (r.sample_ref ?? "").toLowerCase().includes(q)
      || (r.location ?? "").toLowerCase().includes(q);
    const matchDisc = filterDisc === "all" || (tc?.disciplina ?? "") === filterDisc;
    return matchSearch && matchDisc;
  });

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const allFilteredIds = filtered.map((r) => r.id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected   = allFilteredIds.some((id) => selected.has(id));

  const toggleAll = () => {
    setSelected(allSelected
      ? new Set()
      : new Set(allFilteredIds),
    );
  };

  // ── Export handlers ────────────────────────────────────────────────────────

  const handleExportSingle = (r: TestResult) => {
    const wi = (r.work_items as any)?.sector as string | undefined;
    exportTestResultPdf(r, exportLabels, i18n.language, activeProject?.name ?? "Atlas", wi, logoBase64 || logoUrl);
  };

  const handleExportBulk = () => {
    const toExport = filtered.filter((r) => selected.has(r.id));
    if (toExport.length === 0) {
      toast({ title: t("tests.export.noSelection"), variant: "destructive" });
      return;
    }
    exportTestResultsBulkPdf(toExport, exportLabels, i18n.language, activeProject?.name ?? "Atlas", logoBase64 || logoUrl);
  };

  const WORKFLOW_STATUSES = ["draft", "in_progress", "submitted", "reviewed", "approved", "archived"];
  const RESULT_STATUSES = ["pass", "fail", "inconclusive", "na"];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tests.results.searchPlaceholder")}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.results.filters.allStatuses")}</SelectItem>
            {WORKFLOW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`tests.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
            {RESULT_STATUSES.map((s) => (
              <SelectItem key={`r-${s}`} value={`result:${s}`}>{t(`tests.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDisc} onValueChange={setFilterDisc}>
          <SelectTrigger className="h-8 w-[155px] text-sm">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.results.filters.allDisciplines")}</SelectItem>
            {TEST_DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export bulk — only when something selected */}
        {someSelected && (
          <Button
            size="sm" variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportBulk}
          >
            <FileDown className="h-3.5 w-3.5" />
            {t("tests.export.exportBulk")}
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
              {allFilteredIds.filter((id) => selected.has(id)).length}
            </span>
          </Button>
        )}

        <Button size="sm" className="h-8 gap-1.5 ml-auto"
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("tests.results.newResult")}
        </Button>
      </div>

      {/* KPI Row + Charts */}
      {results.length > 0 && (() => {
        const total = results.length;
        const pending = results.filter(r => ["draft","in_progress","submitted"].includes(r.status_workflow)).length;
        const approved = results.filter(r => r.status_workflow === "approved" || r.result_status === "pass").length;
        const failed = results.filter(r => r.result_status === "fail").length;
        const inconclusive = results.filter(r => r.result_status === "inconclusive").length;
        const linkedToNC = results.filter(r => (r as any).nc_id != null).length;
        const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;

        // Distribution by discipline
        const discMap: Record<string, number> = {};
        results.forEach(r => {
          const tc = r.tests_catalog as any;
          const disc = tc?.disciplina ?? "geral";
          discMap[disc] = (discMap[disc] ?? 0) + 1;
        });
        const discData = Object.entries(discMap)
          .map(([k, v]) => ({ label: t(`ppi.disciplinas.${k}`, { defaultValue: k }), value: v }))
          .sort((a, b) => b.value - a.value);

        // Pass/fail by month (last 6 months)
        const monthData: { label: string; pass: number; fail: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString(undefined, { month: 'short' });
          const monthResults = results.filter(r => r.date.startsWith(key));
          monthData.push({
            label,
            pass: monthResults.filter(r => r.result_status === "pass").length,
            fail: monthResults.filter(r => r.result_status === "fail").length,
          });
        }

        return (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <ModuleKPICard label={t("moduleKpi.total")} value={total} icon={FlaskConical} />
              <ModuleKPICard label={t("moduleKpi.pending")} value={pending} icon={Clock} />
              <ModuleKPICard label={t("moduleKpi.approved")} value={approved} icon={CheckCircle2} color="hsl(var(--primary))" />
              <ModuleKPICard label={t("moduleKpi.fail30d")} value={failed} icon={XCircle} color={failed > 0 ? "hsl(var(--destructive))" : undefined} />
              <ModuleKPICard label={t("moduleKpi.inconclusive")} value={inconclusive} icon={AlertCircle} />
              <ModuleKPICard label={t("moduleKpi.linkedToNC")} value={linkedToNC} icon={AlertTriangle} />
              <ModuleKPICard label={t("moduleKpi.failureRate")} value={`${failRate}%`} icon={FlaskConical} color={failRate > 20 ? "hsl(var(--destructive))" : undefined} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border shadow-none">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />{t("moduleKpi.testsPerMonth")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={monthData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                      <Tooltip />
                      <Bar dataKey="pass" name={t("tests.status.pass")} fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="fail" name={t("tests.status.fail")} fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border shadow-none">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-3.5 w-3.5" />{t("moduleKpi.byDisciplina")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {(() => {
                    const entries = discData.slice(0, 8);
                    const maxVal = Math.max(...entries.map(e => e.value), 1);
                    const COLORS = [
                      "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
                      "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent-foreground))",
                      "hsl(var(--muted-foreground))", "hsl(var(--chart-1))",
                    ];
                    return (
                      <div className="space-y-2">
                        {entries.map((d, i) => (
                          <div key={d.label} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 truncate text-right">{d.label}</span>
                            <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums text-foreground w-8 text-right">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </>
        );
      })()}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FlaskConical} subtitleKey="tests.results.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {/* Select-all checkbox */}
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                    className="border-border"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.test")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.sampleRef")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.location")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const tc = r.tests_catalog as any;
                const isChecked = selected.has(r.id);
                return (
                  <TableRow
                    key={r.id}
                    className={cn("hover:bg-muted/20 transition-colors", isChecked && "bg-primary/5")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleOne(r.id)}
                        aria-label={`Selecionar ${r.code ?? r.id}`}
                        className="border-border"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate max-w-[180px]">{tc?.name ?? t("tests.unknownTest")}</div>
                          {tc?.code && <div className="text-[10px] font-mono text-muted-foreground">{tc.code}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.sample_ref ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.location ?? (r.pk_inicio != null ? `PK ${r.pk_inicio}` : "—")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className={cn("text-xs gap-1", STATUS_COLORS[r.status_workflow] ?? "")}>
                          <StatusIcon status={r.status_workflow} />
                          {t(`tests.status.${r.status_workflow}`, { defaultValue: r.status_workflow })}
                        </Badge>
                        {r.result_status && (
                          <Badge variant="outline" className={cn("text-[10px] py-0 gap-0.5",
                            r.result_status === "pass" ? "border-primary/40 text-primary" :
                            r.result_status === "fail" ? "border-destructive/40 text-destructive" :
                            r.result_status === "na" ? "border-border text-muted-foreground" :
                            "border-orange-400/40 text-orange-600",
                          )}>
                            {t(`tests.status.${r.result_status}`, { defaultValue: r.result_status })}
                            {r.result_status === "fail" && (r as any).nc_id && (
                              <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />
                            )}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {(r as any).be_campo_code && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Exportar BE-CAMPO"
                            onClick={() => exportBeCampoPdf(r as any, activeProject?.name ?? "Projeto")}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          title={t("tests.export.exportSingle")}
                          onClick={() => handleExportSingle(r)}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={t("common.edit")}
                          onClick={() => { setEditing(r); setDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title={t("common.delete")}
                          onClick={async () => {
                            if (!activeProject) return;
                            try {
                              await testService.archiveResult(r.id, activeProject.id);
                              toast({ title: t("tests.results.toast.archived") });
                              load();
                            } catch (err) {
                              const info = classifySupabaseError(err);
                              toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
                            }
                          }}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TestResultFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testResult={editing}
        onSuccess={load}
      />
    </div>
  );
}

// ─── Demo data seed ───────────────────────────────────────────────────────────

async function seedDemoData(projectId: string, t: (k: string) => string) {
  const existing = await testService.getCatalogByProject(projectId, true);
  if (existing.length >= 5) {
    toast({ title: t("tests.demo.alreadyExists") });
    return;
  }

  const catalogDefs = [
    { code: "TST-SOIL-DENS", name: "Densidade In Situ (Cápsula)", disciplina: "terras", standards: ["ASTM D2937","NP 143"], unit: "%", frequency: "1 por cada 2.000 m²", acceptance_criteria: "Grau compactação ≥ 95% SPD" },
    { code: "TST-SOIL-PROC", name: "Proctor Modificado", disciplina: "terras", standards: ["ASTM D1557","NP 143"], unit: "g/cm³", frequency: "1 por cada 2.000 m³", acceptance_criteria: "Ref. para controlo de compactação" },
    { code: "TST-SOIL-CBR",  name: "CBR de Laboratório", disciplina: "terras", standards: ["NP 143","ASTM D1883"], unit: "%", frequency: "1 por cada lote", acceptance_criteria: "CBR ≥ valor projeto" },
    { code: "TST-CONC-COMP", name: "Resistência à Compressão — Betão", disciplina: "betao", standards: ["EN 12390-3","NP EN 206"], unit: "MPa", frequency: "1 série por cada 100 m³", acceptance_criteria: "fck ≥ classe especificada" },
    { code: "TST-CONC-ABAT", name: "Abaixamento (Slump Test)", disciplina: "betao", standards: ["EN 12350-2"], unit: "mm", frequency: "1 por carga de betão", acceptance_criteria: "S2: 50–90 mm, S3: 100–150 mm" },
    { code: "TST-BITU-MARS", name: "Ensaio de Marshall", disciplina: "firmes", standards: ["EN 12697-34"], unit: "kN", frequency: "1 por lote de mistura", acceptance_criteria: "Estabilidade ≥ 8 kN, Fluência 2–4 mm" },
    { code: "TST-BITU-ITSR", name: "ITSR — Sensibilidade à Água", disciplina: "firmes", standards: ["EN 12697-12"], unit: "%", frequency: "1 por tipo de mistura", acceptance_criteria: "ITSR ≥ 80%" },
    { code: "TST-BITU-CORE", name: "Extração de Carotes — Espessura", disciplina: "firmes", standards: ["EN 12697-27"], unit: "mm", frequency: "1 por km por camada", acceptance_criteria: "Espessura ≥ projeto – 5 mm" },
    { code: "TST-WELD-VIS",  name: "Inspeção Visual de Soldadura", disciplina: "estruturas", standards: ["EN ISO 17637"], unit: "—", frequency: "100% juntas estruturais", acceptance_criteria: "Sem defeitos visíveis classes B/C" },
    { code: "TST-COAT-DFT",  name: "Espessura de Revestimento (DFT)", disciplina: "estruturas", standards: ["ISO 19840","SSPC-PA 2"], unit: "µm", frequency: "5 medições por m²", acceptance_criteria: "DFT ≥ NDFT do sistema" },
  ];

  const created: TestCatalogEntry[] = [];
  for (const def of catalogDefs) {
    try {
      const entry = await testService.createCatalogEntry({ project_id: projectId, ...def });
      created.push(entry);
    } catch (err) {
      console.warn("[seedDemoData] catalog skip:", (err as Error).message);
    }
  }

  if (created.length === 0) {
    toast({ title: t("tests.demo.alreadyExists") });
    return;
  }

  const samples = [
    { idx: 0, sample_ref: "DS-KM12-01", location: "Km 12+200", status: "approved", pass_fail: "pass",  pk_inicio: 12200, pk_fim: 12200, report_number: "LAB-2026-0101" },
    { idx: 0, sample_ref: "DS-KM12-02", location: "Km 12+400", status: "approved", pass_fail: "pass",  pk_inicio: 12400, pk_fim: 12400, report_number: "LAB-2026-0102" },
    { idx: 1, sample_ref: "PR-KM12-01", location: "Km 12+000", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0103" },
    { idx: 1, sample_ref: "PR-KM15-01", location: "Km 15+000", status: "in_progress", report_number: "LAB-2026-0104" },
    { idx: 2, sample_ref: "CBR-LOTE1",  location: "Lote 1",    status: "completed", pass_fail: "pass",  report_number: "LAB-2026-0105" },
    { idx: 3, sample_ref: "BT-C30-001", location: "Viga V1",   status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0106" },
    { idx: 3, sample_ref: "BT-C30-002", location: "Viga V2",   status: "approved", pass_fail: "fail",  report_number: "LAB-2026-0107" },
    { idx: 3, sample_ref: "BT-C30-003", location: "Laje L1",   status: "in_progress", report_number: "LAB-2026-0108" },
    { idx: 4, sample_ref: "AB-L001",    location: "Entrega 1",  status: "approved", pass_fail: "pass" },
    { idx: 4, sample_ref: "AB-L002",    location: "Entrega 2",  status: "approved", pass_fail: "pass" },
    { idx: 4, sample_ref: "AB-L003",    location: "Entrega 3",  status: "draft" },
    { idx: 5, sample_ref: "MAC-AC16-K1",location: "Km 10+000", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0112" },
    { idx: 5, sample_ref: "MAC-AC16-K2",location: "Km 11+000", status: "completed", pass_fail: "inconclusive", report_number: "LAB-2026-0113" },
    { idx: 6, sample_ref: "ITSR-L1",    location: "Lote A",     status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0114" },
    { idx: 7, sample_ref: "CORE-KM10", location: "Km 10+200", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0115" },
    { idx: 7, sample_ref: "CORE-KM11", location: "Km 11+400", status: "approved", pass_fail: "fail",  report_number: "LAB-2026-0116" },
    { idx: 8, sample_ref: "WLD-J001",  location: "Viga V3-J1", status: "approved", pass_fail: "pass" },
    { idx: 8, sample_ref: "WLD-J002",  location: "Viga V3-J2", status: "in_progress" },
    { idx: 9, sample_ref: "DFT-V3-A",  location: "Viga V3 face A", status: "approved", pass_fail: "pass", report_number: "LAB-2026-0119" },
    { idx: 9, sample_ref: "DFT-V3-B",  location: "Viga V3 face B", status: "draft" },
  ];

  let count = 0;
  for (const s of samples) {
    const cat = created[s.idx];
    if (!cat) continue;
    try {
      await supabase.from("test_results").insert({
        project_id:    projectId,
        test_id:       cat.id,
        date:          new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split("T")[0],
        status:        s.status,
        pass_fail:     (s as any).pass_fail ?? null,
        sample_ref:    s.sample_ref,
        location:      s.location,
        pk_inicio:     (s as any).pk_inicio ?? null,
        pk_fim:        (s as any).pk_fim ?? null,
        report_number: (s as any).report_number ?? null,
        result_payload:{},
      });
      count++;
    } catch (err) {
      console.warn("[seedDemoData] result skip:", err);
    }
  }

  toast({ title: `${t("tests.demo.created")}: ${created.length} ${t("tests.demo.catalogEntries")}, ${count} ${t("tests.demo.results")}` });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TestsPage() {
  const { t }             = useTranslation();
  const { activeProject } = useProject();

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-muted-foreground" />
            {t("pages.tests.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pages.tests.subtitle")}</p>
        </div>
      </div>

      {/* Tabs — core + control modules grouped */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto gap-1 p-1 inline-flex w-max min-w-full sm:w-auto">
            <TabsTrigger value="due" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t("tests.tabs.due")}</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
              <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t("tests.tabs.results")}</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t("tests.tabs.plan")}</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t("tests.tabs.catalog")}</span>
            </TabsTrigger>
            <TabsTrigger value="controls" className="gap-1.5 text-xs sm:text-sm">
              <Gauge className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t("tests.tabs.controls", "Controlo")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="due" className="mt-5">
          <DueTab />
        </TabsContent>
        <TabsContent value="results" className="mt-5">
          <ResultsTab />
        </TabsContent>
        <TabsContent value="plan" className="mt-5">
          <PlanTab />
        </TabsContent>
        <TabsContent value="catalog" className="mt-5">
          <CatalogTab />
        </TabsContent>
        <TabsContent value="controls" className="mt-5">
          <ControlModulesTabs projectId={activeProject?.id ?? ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Nested control-modules sub-tabs ──────────────────────────────────────── */

function ControlModulesTabs({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [sub, setSub] = useState("concrete");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "concrete", icon: Layers, label: t("nav.concrete") },
          { value: "compaction", icon: Gauge, label: t("nav.compaction") },
          { value: "soils", icon: Mountain, label: t("nav.soils") },
          { value: "welding", icon: Flame, label: t("nav.welding") },
        ].map(({ value, icon: Icon, label }) => (
          <Button
            key={value}
            size="sm"
            variant={sub === value ? "default" : "outline"}
            onClick={() => setSub(value)}
            className="gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {sub === "concrete" && <ConcreteTab projectId={projectId} />}
      {sub === "compaction" && <CompactionTab projectId={projectId} />}
      {sub === "soils" && <SoilsTab projectId={projectId} />}
      {sub === "welding" && <WeldTab projectId={projectId} />}
    </div>
  );
}

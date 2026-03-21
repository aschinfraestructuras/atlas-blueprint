/**
 * ReadinessPanel — Readiness overview for all Work Items in the active project.
 * Shows a table with PPI/Tests/NCs status, semaphore, KPIs, filters, and export.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, FlaskConical, ClipboardCheck,
  FileDown, Search, Loader2,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useReportMeta } from "@/hooks/useReportMeta";
import { formatPk, type WorkItem } from "@/lib/services/workItemService";
import { generateListPdf, buildReportFilename } from "@/lib/services/reportService";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WiReadiness {
  wi: WorkItem;
  ppiStatus: "approved" | "in_progress" | "none";
  ppiPct: number;
  testsConform: number;
  testsTotal: number;
  testsHasFail: boolean;
  ncsOpen: number;
  semaphore: "green" | "yellow" | "red";
  semaphoreLabel: string;
}

const DISCIPLINE_CODES = [
  "geral", "terras", "firmes", "betao", "drenagem",
  "estruturas", "ferrovia", "instalacoes", "outros",
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ReadinessPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: workItems, loading: wiLoading } = useWorkItems();
  const { logoBase64 } = useProjectLogo();
  const reportMeta = useReportMeta();

  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterSemaphore, setFilterSemaphore] = useState("all");

  // Fetch PPI, Tests, NCs data in bulk
  const [ppiMap, setPpiMap] = useState<Map<string, { status: string; okCount: number; total: number }>>(new Map());
  const [testMap, setTestMap] = useState<Map<string, { conform: number; total: number; hasFail: boolean }>>(new Map());
  const [ncMap, setNcMap] = useState<Map<string, number>>(new Map());
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!activeProject || workItems.length === 0) { setSubLoading(false); return; }
    setSubLoading(true);

    const fetchData = async () => {
      const ppiRes = await (supabase
        .from("ppi_instances")
        .select("id, work_item_id, status")
        .eq("project_id", activeProject.id)
        .eq("is_deleted", false) as any);
      const ppiItemsRes = await (supabase
        .from("ppi_instance_items")
        .select("instance_id, result")
        .eq("project_id", activeProject.id) as any);
      const testRes = await (supabase
        .from("test_results")
        .select("work_item_id, pass_fail, status")
        .eq("project_id", activeProject.id)
        .not("work_item_id", "is", null) as any);
      const ncRes = await (supabase
        .from("non_conformities")
        .select("work_item_id, status")
        .eq("project_id", activeProject.id)
        .eq("is_deleted", false)
        .not("work_item_id", "is", null)
        .not("status", "in", '("closed","archived")') as any);

      // PPI map
      const pm = new Map<string, { status: string; okCount: number; total: number }>();
      const ppiInstances = ppiRes.data ?? [];
      const ppiItems = ppiItemsRes.data ?? [];
      const itemsByInstance = new Map<string, { ok: number; total: number }>();
      for (const item of ppiItems) {
        const cur = itemsByInstance.get(item.instance_id) ?? { ok: 0, total: 0 };
        cur.total++;
        if (item.result === "pass") cur.ok++;
        itemsByInstance.set(item.instance_id, cur);
      }
      for (const ppi of ppiInstances) {
        const wiId = ppi.work_item_id;
        if (!wiId) continue;
        const items = itemsByInstance.get(ppi.id) ?? { ok: 0, total: 0 };
        const existing = pm.get(wiId);
        if (!existing || ppi.status === "approved" || (ppi.status !== "approved" && existing.status !== "approved")) {
          pm.set(wiId, { status: ppi.status, okCount: (existing?.okCount ?? 0) + items.ok, total: (existing?.total ?? 0) + items.total });
        }
      }
      setPpiMap(pm);

      // Tests map
      const tm = new Map<string, { conform: number; total: number; hasFail: boolean }>();
      for (const tr of (testRes.data ?? [])) {
        const wiId = tr.work_item_id;
        if (!wiId) continue;
        const cur = tm.get(wiId) ?? { conform: 0, total: 0, hasFail: false };
        cur.total++;
        if (tr.pass_fail === "pass" || tr.status === "approved") cur.conform++;
        if (tr.pass_fail === "fail") cur.hasFail = true;
        tm.set(wiId, cur);
      }
      setTestMap(tm);

      // NC map
      const nm = new Map<string, number>();
      for (const nc of (ncRes.data ?? [])) {
        const wiId = nc.work_item_id;
        if (!wiId) continue;
        nm.set(wiId, (nm.get(wiId) ?? 0) + 1);
      }
      setNcMap(nm);
    };
    fetchData().finally(() => setSubLoading(false));
  }, [activeProject, workItems]);

  // Build readiness rows
  const rows: WiReadiness[] = useMemo(() => {
    return workItems.map((wi) => {
      const ppi = ppiMap.get(wi.id);
      const tests = testMap.get(wi.id);
      const ncsOpen = ncMap.get(wi.id) ?? 0;

      const ppiStatus: "approved" | "in_progress" | "none" = ppi
        ? (ppi.status === "approved" ? "approved" : "in_progress")
        : "none";
      const ppiPct = ppi && ppi.total > 0 ? Math.round((ppi.okCount / ppi.total) * 100) : 0;
      const testsConform = tests?.conform ?? 0;
      const testsTotal = tests?.total ?? 0;
      const testsHasFail = tests?.hasFail ?? false;

      let semaphore: "green" | "yellow" | "red";
      let semaphoreLabel: string;
      if (ncsOpen > 0 || testsHasFail) {
        semaphore = "red";
        semaphoreLabel = t("workItems.readiness.blocked");
      } else if (ppiStatus === "approved" && testsConform === testsTotal && testsTotal > 0) {
        semaphore = "green";
        semaphoreLabel = t("workItems.readiness.ready");
      } else {
        semaphore = "yellow";
        semaphoreLabel = t("workItems.readiness.inProgress");
      }

      return { wi, ppiStatus, ppiPct, testsConform, testsTotal, testsHasFail, ncsOpen, semaphore, semaphoreLabel };
    });
  }, [workItems, ppiMap, testMap, ncMap, t]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.wi.sector.toLowerCase().includes(q) ||
        r.wi.disciplina.toLowerCase().includes(q) ||
        (r.wi.obra ?? "").toLowerCase().includes(q)
      );
    }
    if (filterDiscipline !== "all") result = result.filter(r => r.wi.disciplina === filterDiscipline);
    if (filterSemaphore !== "all") result = result.filter(r => r.semaphore === filterSemaphore);

    // Sort: red first, yellow, green
    const order = { red: 0, yellow: 1, green: 2 };
    return [...result].sort((a, b) => order[a.semaphore] - order[b.semaphore]);
  }, [rows, search, filterDiscipline, filterSemaphore]);

  // KPIs
  const kpis = useMemo(() => {
    const ready = rows.filter(r => r.semaphore === "green").length;
    const blocked = rows.filter(r => r.semaphore === "red").length;
    const noPpi = rows.filter(r => r.ppiStatus === "none").length;
    return { ready, blocked, noPpi, total: rows.length };
  }, [rows]);

  const handleExport = useCallback(() => {
    if (!activeProject || filtered.length === 0) return;
    const columns = [
      t("workItems.table.sector"),
      t("workItems.table.discipline"),
      "PK",
      "PPI",
      t("workItems.detail.tabs.tests"),
      "NCs",
      t("workItems.readiness.tab"),
    ];
    const tableRows = filtered.map(r => [
      r.wi.sector,
      t(`workItems.disciplines.${r.wi.disciplina}`, { defaultValue: r.wi.disciplina }),
      formatPk(r.wi.pk_inicio, r.wi.pk_fim),
      r.ppiStatus === "approved" ? t("workItems.readiness.ready") : r.ppiStatus === "in_progress" ? `${r.ppiPct}%` : "—",
      r.testsTotal > 0 ? `${r.testsConform}/${r.testsTotal}` : "—",
      r.ncsOpen > 0 ? String(r.ncsOpen) : "0",
      r.semaphoreLabel,
    ]);

    generateListPdf({
      reportTitle: t("workItems.readiness.export"),
      labels: { appName: "Atlas QMS", reportTitle: t("workItems.readiness.export"), generatedOn: t("workItems.export.generatedOn") },
      meta: reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: i18n.language },
      columns,
      rows: tableRows,
      footerRef: `${filtered.length} elementos`,
      filename: buildReportFilename("READINESS", activeProject.code, "report"),
      logoBase64,
    });
  }, [filtered, activeProject, t, i18n.language, reportMeta, logoBase64]);

  const loading = wiLoading || subLoading;

  const semaphoreIcon = (s: "green" | "yellow" | "red", label: string) => {
    const colors = {
      green: "text-green-600 dark:text-green-400",
      yellow: "text-amber-500 dark:text-amber-400",
      red: "text-destructive",
    };
    const bg = {
      green: "bg-green-500/10",
      yellow: "bg-amber-500/10",
      red: "bg-destructive/10",
    };
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", bg[s], colors[s])}>
              {s === "green" ? <ShieldCheck className="h-3 w-3" /> : s === "red" ? <ShieldAlert className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {s === "green" && t("workItems.readiness.readyTooltip", { defaultValue: "PPI aprovado + ensaios conformes + 0 NCs abertas" })}
            {s === "yellow" && t("workItems.readiness.inProgressTooltip", { defaultValue: "PPI em curso ou ensaios pendentes, sem NCs" })}
            {s === "red" && t("workItems.readiness.blockedTooltip", { defaultValue: "NCs abertas ou ensaio não conforme" })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.ready}</div>
          <div className="text-xs text-muted-foreground">{t("workItems.readiness.ready")} / {kpis.total}</div>
          <Progress value={kpis.total > 0 ? (kpis.ready / kpis.total) * 100 : 0} className="h-1.5 mt-2 [&>div]:bg-green-500" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center">
          <div className={cn("text-2xl font-bold", kpis.blocked > 0 ? "text-destructive" : "text-muted-foreground")}>{kpis.blocked}</div>
          <div className="text-xs text-muted-foreground">{t("workItems.readiness.blocked")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center">
          <div className="text-2xl font-bold text-muted-foreground">{kpis.noPpi}</div>
          <div className="text-xs text-muted-foreground">{t("workItems.readiness.noPpi")}</div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder={t("workItems.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 bg-background text-sm" />
        </div>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[170px] h-8 bg-background text-sm">
            <SelectValue placeholder={t("workItems.filters.allDisciplines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workItems.filters.allDisciplines")}</SelectItem>
            {DISCIPLINE_CODES.map(c => <SelectItem key={c} value={c}>{t(`workItems.disciplines.${c}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSemaphore} onValueChange={setFilterSemaphore}>
          <SelectTrigger className="w-[160px] h-8 bg-background text-sm">
            <SelectValue placeholder={t("workItems.readiness.tab")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workItems.readiness.tab")}</SelectItem>
            <SelectItem value="green">{t("workItems.readiness.ready")}</SelectItem>
            <SelectItem value="yellow">{t("workItems.readiness.inProgress")}</SelectItem>
            <SelectItem value="red">{t("workItems.readiness.blocked")}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs ml-auto" onClick={handleExport} disabled={filtered.length === 0}>
          <FileDown className="h-3.5 w-3.5" />
          {t("workItems.readiness.export")}
        </Button>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ShieldCheck className="h-8 w-8 opacity-30" />
          <p className="text-sm">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.sector")}</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.table.discipline")}</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">PK</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">PPI</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.detail.tabs.tests")}</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">NCs</TableHead>
                <TableHead className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{t("workItems.readiness.tab")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, idx) => (
                <TableRow
                  key={r.wi.id}
                  className={cn("cursor-pointer hover:bg-primary/[0.028]", idx % 2 === 1 && "bg-muted/[0.018]")}
                  onClick={() => navigate(`/work-items/${r.wi.id}`)}
                >
                  <TableCell className="text-sm font-medium">{r.wi.sector}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t(`workItems.disciplines.${r.wi.disciplina}`, { defaultValue: r.wi.disciplina })}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatPk(r.wi.pk_inicio, r.wi.pk_fim)}
                  </TableCell>
                  <TableCell>
                    {r.ppiStatus === "approved" ? (
                      <Badge variant="default" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{t("workItems.readiness.ready")}</Badge>
                    ) : r.ppiStatus === "in_progress" ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600">{r.ppiPct}%</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.testsTotal > 0 ? (
                      <span className={cn("text-xs font-medium",
                        r.testsHasFail ? "text-destructive" :
                        r.testsConform === r.testsTotal ? "text-green-600 dark:text-green-400" :
                        "text-muted-foreground"
                      )}>
                        {r.testsConform}/{r.testsTotal}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.ncsOpen > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">{r.ncsOpen}</Badge>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400">{t("workItems.readiness.noneOpen", { defaultValue: "0" })}</span>
                    )}
                  </TableCell>
                  <TableCell>{semaphoreIcon(r.semaphore, r.semaphoreLabel)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

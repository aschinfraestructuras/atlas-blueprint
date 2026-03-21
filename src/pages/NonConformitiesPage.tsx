import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNonConformities } from "@/hooks/useNonConformities";
import { ncService } from "@/lib/services/ncService";

import { exportNCBulkPdf, type NCExportLabels } from "@/lib/services/ncExportService";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportToCSV, generateListPdf, buildReportFilename } from "@/lib/services/reportService";
import { exportLNC } from "@/lib/services/sgqListExportService";
import { useReportMeta } from "@/hooks/useReportMeta";
import type { NonConformity } from "@/lib/services/ncService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { getNCTransitions } from "@/lib/stateMachines";
import {
  AlertTriangle, Calendar, Plus, Pencil, ChevronDown, Trash2,
  Eye, Loader2, Database, Search, X, CheckSquare, Square, FileDown,
  Clock, CheckCircle2, FlaskConical, ClipboardCheck, Timer,
  PieChart,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { cn } from "@/lib/utils";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Dot colour for severity ──────────────────────────────────────────────────
const SEVERITY_DOT: Record<string, string> = {
  minor:    "hsl(215 15% 55%)",
  major:    "hsl(var(--primary))",
  critical: "hsl(var(--destructive))",
  low:      "hsl(215 15% 55%)",
  medium:   "hsl(var(--primary))",
  high:     "hsl(var(--destructive))",
};

const SEVERITY_COLORS: Record<string, string> = {
  minor:    "bg-muted text-muted-foreground",
  major:    "bg-primary/10 text-primary",
  critical: "bg-destructive/10 text-destructive",
  low:      "bg-muted text-muted-foreground",
  medium:   "bg-primary/10 text-primary",
  high:     "bg-destructive/10 text-destructive",
};

// ─── Status: dot + pill ──────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  draft:                "hsl(215 18% 60%)",
  open:                 "hsl(var(--destructive))",
  in_progress:          "hsl(var(--primary))",
  pending_verification: "hsl(38 85% 44%)",
  closed:               "hsl(158 45% 36%)",
  archived:             "hsl(215 15% 55%)",
};

const STATUS_BG: Record<string, string> = {
  draft:                "bg-muted/60 text-muted-foreground",
  open:                 "bg-destructive/10 text-destructive",
  in_progress:          "bg-primary/10 text-primary",
  pending_verification: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  closed:               "bg-green-500/10 text-green-700 dark:text-green-400",
  archived:             "bg-muted text-muted-foreground",
};

function NCStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium",
      STATUS_BG[status] ?? "bg-muted text-muted-foreground",
    )}>
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ background: STATUS_DOT[status] ?? "hsl(215 15% 55%)" }}
      />
      {t(`nc.status.${status}`, { defaultValue: status })}
    </span>
  );
}



// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NonConformitiesPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: ncs, loading, error, refetch } = useNonConformities();
  const reportMeta = useReportMeta();
  const { canCreate, canEdit, canValidate } = usePermissions();
  const { logoBase64 } = useProjectLogo();
  // Filters
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterClassification, setFilterClassification] = useState("all");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNC, setEditingNC]   = useState<NonConformity | null>(null);

  // NC prefill from test result fail
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("prefill") === "true") {
      setEditingNC(null);
      setDialogOpen(true);
      // Clear params so it doesn't re-open on navigation
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Transition
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());


  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!activeProject) return [];
    return ncs.filter(nc => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (nc.code ?? "").toLowerCase().includes(q) ||
        (nc.title ?? "").toLowerCase().includes(q) ||
        nc.description.toLowerCase().includes(q) ||
        (nc.responsible ?? "").toLowerCase().includes(q) ||
        (nc.reference ?? "").toLowerCase().includes(q);
      const matchesStatus   = filterStatus === "all"   || nc.status === filterStatus;
      const matchesSeverity = filterSeverity === "all" || nc.severity === filterSeverity;
      const matchesOrigin   = filterOrigin === "all"   || nc.origin === filterOrigin;
      const matchesCategory = filterCategory === "all" || nc.category === filterCategory;
      const matchesClassification = filterClassification === "all" || (nc as any).classification === filterClassification;
      const matchesDiscipline = filterDiscipline === "all" || (nc as any).discipline === filterDiscipline;
      const detectedAt = nc.detected_at ?? nc.created_at;
      const matchesFrom = !dateFrom || detectedAt >= dateFrom;
      const matchesTo   = !dateTo   || detectedAt <= dateTo;
      return matchesSearch && matchesStatus && matchesSeverity && matchesOrigin && matchesCategory && matchesClassification && matchesDiscipline && matchesFrom && matchesTo;
    });
  }, [ncs, search, filterStatus, filterSeverity, filterOrigin, filterCategory, filterClassification, filterDiscipline, dateFrom, dateTo, activeProject]);

  const hasFilters = search || filterStatus !== "all" || filterSeverity !== "all" ||
    filterOrigin !== "all" || filterCategory !== "all" || filterClassification !== "all" || filterDiscipline !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterSeverity("all");
    setFilterOrigin("all"); setFilterCategory("all"); setFilterClassification("all"); setFilterDiscipline("all"); setDateFrom(""); setDateTo("");
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleNew  = () => { setEditingNC(null); setDialogOpen(true); };
  const handleEdit = (nc: NonConformity) => { setEditingNC(nc); setDialogOpen(true); };

  const handleTransition = async (nc: NonConformity, toStatus: string) => {
    setTransitioningId(nc.id);
    try {
      await ncService.updateStatus(nc.id, toStatus);
      toast({ title: t("nc.toast.statusChanged", { status: t(`nc.status.${toStatus}`) }) });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setTransitioningId(null);
    }
  };

  // Bulk selection helpers
  const allSelected = filtered.length > 0 && filtered.every(nc => selected.has(nc.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(nc => nc.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkTransition = async (toStatus: string) => {
    const ids = [...selected];
    let ok = 0;
    for (const id of ids) {
      const nc = ncs.find(n => n.id === id);
      if (!nc) continue;
      const allowed: string[] = getNCTransitions(nc.status);
      if (!allowed.includes(toStatus)) continue;
      try { await ncService.updateStatus(id, toStatus); ok++; } catch { /* skip */ }
    }
    toast({ title: t("nc.toast.bulkStatusChanged", { count: ok }) });
    setSelected(new Set());
    refetch();
  };

  // ── Bulk PDF export ──────────────────────────────────────────────────────────
  const handleBulkExport = useCallback(async () => {
    const items = filtered.filter(nc => selected.size === 0 || selected.has(nc.id));
    if (items.length === 0) return;
    const labels: NCExportLabels = {
      appName: "Atlas QMS",
      reportTitle: t("nc.export.reportTitle", { defaultValue: "Relatório de Não Conformidade" }),
      bulkTitle: t("nc.export.bulkTitle", { defaultValue: "Relatório NC Consolidado" }),
      wiSummaryTitle: t("nc.export.wiSummaryTitle", { defaultValue: "Resumo NC por Work Item" }),
      generatedOn: t("nc.export.generatedOn", { defaultValue: "Gerado em" }),
      page: t("nc.export.page", { defaultValue: "Página" }),
      of: t("nc.export.of", { defaultValue: "de" }),
      code: t("nc.table.code"), title: t("nc.form.title"), description: t("nc.form.description"),
      severity: t("nc.table.severity"), category: t("nc.form.category"), origin: t("nc.table.origin"),
      status: t("common.status"), responsible: t("nc.table.responsible"), assignedTo: t("nc.detail.assignedTo"),
      detectedAt: t("nc.form.detectedAt"), dueDate: t("nc.table.dueDate"), closureDate: t("nc.detail.closureDate"),
      reference: t("nc.table.reference"), workItem: t("nc.detail.workItem"),
      capaTitle: t("nc.form.tabs.capa"), correction: t("nc.form.correction"), rootCause: t("nc.form.rootCause"),
      correctiveAction: t("nc.form.correctiveAction"), preventiveAction: t("nc.form.preventiveAction"),
      verificationMethod: t("nc.form.verificationMethod"), verificationResult: t("nc.form.verificationResult"),
      verifiedBy: t("nc.detail.verifiedBy"), verifiedAt: t("nc.detail.verifiedAt"),
      wiSector: t("workItems.detail.sector", { defaultValue: "Sector" }),
      wiBySeverity: t("nc.export.wiBySeverity", { defaultValue: "Por Gravidade" }),
      wiByStatus: t("nc.export.wiByStatus", { defaultValue: "Por Estado" }),
      wiOpenNcs: t("nc.export.wiOpenNcs", { defaultValue: "NCs em Aberto" }),
      severity_minor: t("nc.severity.minor"), severity_major: t("nc.severity.major"), severity_critical: t("nc.severity.critical"),
      status_draft: t("nc.status.draft"), status_open: t("nc.status.open"), status_in_progress: t("nc.status.in_progress"),
      status_pending_verification: t("nc.status.pending_verification"), status_closed: t("nc.status.closed"), status_archived: t("nc.status.archived"),
      origin_manual: t("nc.origin.manual"), origin_ppi: t("nc.origin.ppi"), origin_test: t("nc.origin.test"),
      origin_document: t("nc.origin.document"), origin_audit: t("nc.origin.audit"),
    };
    try {
      await exportNCBulkPdf(items, labels, activeProject?.name ?? "Atlas", logoBase64);
    } catch {
      toast({ title: t("nc.export.noData", { defaultValue: "Erro ao exportar" }), variant: "destructive" });
    }
  }, [filtered, selected, t, activeProject]);


  // ─── Guard ──────────────────────────────────────────────────────────────────

  // ─── KPI computations ────────────────────────────────────────────
  const now = new Date();
  const d30ago = new Date(now); d30ago.setDate(d30ago.getDate() - 30);
  const d30str = d30ago.toISOString().slice(0, 10);

  const openNcs = ncs.filter(nc => !["closed", "archived"].includes(nc.status));
  const overdueNcs = openNcs.filter(nc => nc.due_date && nc.due_date < now.toISOString().slice(0, 10));
  const closed30d = ncs.filter(nc => nc.status === "closed" && nc.closure_date && nc.closure_date >= d30str);
  const majorNcs = ncs.filter(nc => nc.severity === "major" || nc.severity === "high");
  const minorNcs = ncs.filter(nc => nc.severity === "minor" || nc.severity === "low");
  const linkedTests = ncs.filter(nc => nc.test_result_id);
  const linkedPPI = ncs.filter(nc => nc.ppi_instance_id);

  // Aging chart data
  const agingData = useMemo(() => {
    const bins = { "0-30": 0, "30-60": 0, "60+": 0 };
    openNcs.forEach(nc => {
      const detected = new Date(nc.detected_at ?? nc.created_at);
      const days = Math.floor((now.getTime() - detected.getTime()) / 86400000);
      if (days <= 30) bins["0-30"]++;
      else if (days <= 60) bins["30-60"]++;
      else bins["60+"]++;
    });
    return [
      { label: t("moduleKpi.aging0_30"), value: bins["0-30"] },
      { label: t("moduleKpi.aging30_60"), value: bins["30-60"] },
      { label: t("moduleKpi.aging60plus"), value: bins["60+"] },
    ];
  }, [ncs, activeProject, t]);

  // Root cause distribution
  const rootCauseData = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach(nc => {
      if (nc.category) map[nc.category] = (map[nc.category] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([k, v]) => ({ label: t(`nc.category.${k}`, { defaultValue: k }), value: v }))
      .sort((a, b) => b.value - a.value);
  }, [ncs, t]);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        module={t("pages.nonConformities.module", { defaultValue: "Qualidade" })}
        title={t("pages.nonConformities.title")}
        subtitle={t("pages.nonConformities.subtitle")}
        icon={AlertTriangle}
        iconColor="hsl(2, 60%, 44%)"
        actions={
          <>
            <ReportExportMenu
              disabled={filtered.length === 0}
              options={[
                { label: t("report.pdfList", { defaultValue: "PDF — Lista" }), icon: "pdf", action: handleBulkExport },
                { label: "Exportar LNC", icon: "pdf", action: async () => {
                  if (!reportMeta) return;
                  await exportLNC(filtered as any, reportMeta);
                }},
                { label: t("report.csvList", { defaultValue: "CSV — Lista" }), icon: "csv", action: () => {
                  if (!activeProject) return;
                  const headers = [t("nc.table.code"), t("nc.form.title"), t("nc.table.severity"), t("common.status"), t("nc.form.detectedAt"), t("nc.table.dueDate")];
                  const rows = filtered.map(nc => [
                    nc.code ?? "", nc.title ?? "", t(`nc.severity.${nc.severity}`), t(`nc.status.${nc.status}`),
                    nc.detected_at ?? "", nc.due_date ?? "",
                  ]);
                  exportToCSV(headers, rows, buildReportFilename("NC", activeProject.code, "list", "csv"));
                }},
              ]}
            />
            {canCreate && (
              <Button onClick={handleNew} size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("nc.newNC")}
              </Button>
            )}
          </>
        }
      />

      {/* ── KPI Row ──────────────────────────────────────────── */}
      {!loading && ncs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <ModuleKPICard label={t("moduleKpi.open")} value={openNcs.length} icon={AlertTriangle} color="hsl(var(--destructive))" />
          <ModuleKPICard label={t("moduleKpi.overdue")} value={overdueNcs.length} icon={Clock} color={overdueNcs.length > 0 ? "hsl(var(--destructive))" : undefined} />
          <ModuleKPICard label={t("moduleKpi.closed30d")} value={closed30d.length} icon={CheckCircle2} color="hsl(158 45% 36%)" />
          <ModuleKPICard label={t("moduleKpi.major")} value={majorNcs.length} icon={AlertTriangle} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("moduleKpi.minor")} value={minorNcs.length} icon={AlertTriangle} />
          <ModuleKPICard label={t("moduleKpi.linkedToTests")} value={linkedTests.length} icon={FlaskConical} />
          <ModuleKPICard label={t("moduleKpi.linkedToPPI")} value={linkedPPI.length} icon={ClipboardCheck} />
        </div>
      )}

      {/* ── Charts Row ──────────────────────────────────────── */}
      {!loading && openNcs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border shadow-none">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />{t("moduleKpi.ncAgingChart")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={agingData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5" />{t("moduleKpi.byDisciplina", { defaultValue: "Por Categoria" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {(() => {
                const entries = rootCauseData.slice(0, 8);
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
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <FilterBar>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("nc.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-52 pl-8 text-sm bg-background"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-44 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allStatuses")}</SelectItem>
            {["draft","open","in_progress","pending_verification","closed","archived"].map(s => (
              <SelectItem key={s} value={s}>{t(`nc.status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="h-8 w-36 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allSeverities")}</SelectItem>
            {["minor","major","critical"].map(s => (
              <SelectItem key={s} value={s}>{t(`nc.severity.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger className="h-8 w-36 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allOrigins")}</SelectItem>
            {["manual","ppi","test","document","audit"].map(o => (
              <SelectItem key={o} value={o}>{t(`nc.origin.${o}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allCategories")}</SelectItem>
            {["qualidade","seguranca","ambiente","producao","outros"].map(c => (
              <SelectItem key={c} value={c}>{t(`nc.category.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterClassification} onValueChange={setFilterClassification}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allClassifications")}</SelectItem>
            {["maior","menor","observacao"].map(c => (
              <SelectItem key={c} value={c}>{t(`nc.classification.${c}`)}</SelectItem>
            ))}
            <SelectItem value="C">{t("nc.classificationCE.C", { defaultValue: "C — Correção" })}</SelectItem>
            <SelectItem value="AC">{t("nc.classificationCE.AC", { defaultValue: "AC — Ação Corretiva" })}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("nc.filters.allDisciplines")}</SelectItem>
            {["terras","betao","ferrovia","catenaria","st","drenagem","estruturas","via","geotecnia","eletrica","sinalizacao","passagens_nivel","edificios","outros"].map(d => (
              <SelectItem key={d} value={d}>{t(`nc.discipline.${d}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-8 w-36 text-sm bg-background" title={t("nc.filters.from")} />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-8 w-36 text-sm bg-background" title={t("nc.filters.to")} />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />{t("nc.filters.clear")}
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} {t("nc.filters.results")}
        </span>
      </FilterBar>


      {/* ── Bulk action bar ──────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium text-primary">
            {t("nc.bulk.selected", { count: selected.size })}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                {t("nc.bulk.changeStatus")} <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {["open","in_progress","pending_verification","closed","archived"].map(s => (
                <DropdownMenuItem key={s} onClick={() => handleBulkTransition(s)}>
                  {t(`nc.status.${s}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleBulkExport}>
            <FileDown className="h-3 w-3" />
            {t("nc.export.exportBulk", { defaultValue: "Exportar PDF" })}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            {t("nc.bulk.clear")}
          </Button>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} subtitleKey="emptyState.nonConformities.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">

                <TableHead className="w-10 px-3">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {allSelected
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />}
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">
                  {t("nc.table.code")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.title")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                  {t("nc.table.origin")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  {t("nc.form.classification")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  {t("nc.table.severity")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44">
                  {t("common.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  {t("nc.table.responsible")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  {t("nc.table.dueDate")}
                </TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(nc => {
                const transitions = getNCTransitions(nc.status);
                const isTransitioning = transitioningId === nc.id;
                const isSelected = selected.has(nc.id);
                const isOverdue = nc.due_date &&
                  new Date(nc.due_date) < new Date() &&
                  nc.status !== "closed" && nc.status !== "archived";

                return (
                  <TableRow
                    key={nc.id}
                    className={cn(
                      "cursor-pointer group transition-colors duration-100",
                      "hover:bg-primary/[0.028]",
                      isSelected && "bg-primary/5 hover:bg-primary/[0.06]",
                    )}
                    onClick={() => navigate(`/non-conformities/${nc.id}`)}
                  >

                    {/* Checkbox */}
                    <TableCell className="px-3" onClick={e => { e.stopPropagation(); toggleOne(nc.id); }}>
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>

                    {/* Código */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {nc.code ?? nc.reference ?? "—"}
                    </TableCell>

                    {/* Título */}
                    <TableCell className="text-sm text-foreground max-w-[240px]">
                      {nc.title ? (
                        <>
                          <p className="truncate font-medium">{nc.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{nc.description}</p>
                        </>
                      ) : (
                        <p className="truncate">{nc.description}</p>
                      )}
                    </TableCell>

                    {/* Origem */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {t(`nc.origin.${nc.origin}`, { defaultValue: nc.origin })}
                      </span>
                    </TableCell>

                    {/* Classificação */}
                    <TableCell>
                      {(nc as any).classification ? (
                        <Badge variant="secondary" className={cn("text-xs",
                          (nc as any).classification === "maior" ? "bg-destructive/10 text-destructive" :
                          (nc as any).classification === "menor" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                          "bg-primary/10 text-primary"
                        )}>
                          {t(`nc.classification.${(nc as any).classification}`, { defaultValue: (nc as any).classification })}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>

                    {/* Severidade */}
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border border-transparent",
                        SEVERITY_COLORS[nc.severity] ?? "bg-muted text-muted-foreground",
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ background: SEVERITY_DOT[nc.severity] ?? "hsl(215 15% 55%)" }} />
                        {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
                      </span>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <NCStatusBadge status={nc.status} />
                    </TableCell>


                    {/* Responsável */}
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                      {nc.responsible ?? "—"}
                    </TableCell>

                    {/* Prazo */}
                    <TableCell className={cn("text-sm", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                      {nc.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(nc.due_date + "T00:00:00").toLocaleDateString()}
                        </div>
                      ) : "—"}
                    </TableCell>

                    {/* Ações — visíveis só no hover da linha */}
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/non-conformities/${nc.id}`)}
                          title={t("common.view")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(nc)}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {transitions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7"
                                disabled={isTransitioning}
                                title={t("nc.transitions.label")}
                              >
                                {isTransitioning
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <ChevronDown className="h-3.5 w-3.5" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                                {t("nc.transitions.label")}
                              </div>
                              <DropdownMenuSeparator />
                              {transitions.map(s => (
                                <DropdownMenuItem key={s} onClick={() => handleTransition(nc, s)}>
                                  {t(`nc.transitions.${s}`, { defaultValue: s })}
                                </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await ncService.updateStatus(nc.id, "archived");
                                toast({ title: t("nc.toast.statusChanged", { status: t("nc.status.archived") }) });
                                refetch();
                              } catch (err) {
                                const info = classifySupabaseError(err, t);
                                toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
                              }
                            }}
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ── Dialog ──────────────────────────────────────────────────────── */}
      <NCFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nc={editingNC}
        onSuccess={refetch}
      />
    </div>
  );
}

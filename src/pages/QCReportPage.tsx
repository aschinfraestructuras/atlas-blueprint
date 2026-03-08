import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/components/ui/filter-bar";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { EmptyState } from "@/components/EmptyState";
import {
  FileText, Loader2, BarChart3, AlertTriangle, CheckCircle2,
  Clock, FlaskConical, ClipboardCheck, TrendingUp, TrendingDown,
  FileDown, RefreshCw, Package, ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auditService } from "@/lib/services/auditService";
import {
  generatePdfDocument,
  printHtml,
  buildReportFilename,
  fmtDate,
  type ReportMeta,
  type ReportLabels,
} from "@/lib/services/reportService";
import { toast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

type ReportScope = "full" | "executive" | "by_chapter" | "by_subcontractor";

interface QCData {
  // From RPC
  testsPass: number; testsFail: number; testsPending: number;
  ncsOpen: number; ncsClosed: number;
  docsApproved: number; docsInReview: number;
  expiringTotal: number;
  criticalNcs: any[]; failedTests: any[]; expiredCals: any[];
  // Client-side enrichments
  allNcs: any[]; allTests: any[]; allPpi: any[]; allMaterials: any[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function QCReportPage() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const reportMeta = useReportMeta();
  const { data: workItems } = useWorkItems();
  const { data: subcontractors } = useSubcontractors();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");
  const [reportScope, setReportScope] = useState<ReportScope>("full");
  const [filterWorkItem, setFilterWorkItem] = useState("all");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterSubcontractor, setFilterSubcontractor] = useState("all");

  // ── Data state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QCData | null>(null);

  const DISCIPLINES = ["geral", "estruturas", "geotecnia", "hidraulica", "estradas", "ambiente", "seguranca", "eletrica", "mecanica"];
  const SEVERITIES = ["minor", "major", "critical"];

  // ── Helper to get WI label ─────────────────────────────────────────────────
  const wiLabel = (wi: any) => `${wi.sector} ${wi.obra ? `· ${wi.obra}` : ""} ${wi.elemento ? `· ${wi.elemento}` : ""}`.trim().slice(0, 50);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const pid = activeProject.id;

      // 1. RPC call for summary
      const { data: summary, error: summaryError } = await (supabase as any).rpc(
        "fn_qc_report_summary",
        { p_project_id: pid, p_start_date: startDate, p_end_date: endDate }
      );
      if (summaryError) throw summaryError;

      // 2. Parallel client-side queries for enrichments
      const [ncsRes, testsRes, ppiRes, matsRes] = await Promise.all([
        supabase.from("non_conformities")
          .select("id, code, title, severity, status, category, discipline, detected_at, due_date, closure_date, work_item_id, subcontractor_id, supplier_id, origin")
          .eq("project_id", pid).eq("is_deleted", false)
          .gte("detected_at", startDate).lte("detected_at", endDate),
        supabase.from("test_results")
          .select("id, code, status, result_status, date, work_item_id, supplier_id, pass_fail, test_id")
          .eq("project_id", pid)
          .gte("date", startDate).lte("date", endDate),
        supabase.from("ppi_instances")
          .select("id, code, status, work_item_id, inspection_date, created_at")
          .eq("project_id", pid)
          .gte("inspection_date", startDate).lte("inspection_date", endDate),
        supabase.from("materials")
          .select("id, code, name, pame_status, approval_status, category")
          .eq("project_id", pid).eq("is_deleted", false),
      ]);

      setData({
        testsPass: summary.tests_pass ?? 0,
        testsFail: summary.tests_fail ?? 0,
        testsPending: summary.tests_pending ?? 0,
        ncsOpen: summary.nc_open ?? 0,
        ncsClosed: summary.nc_closed_period ?? 0,
        docsApproved: summary.docs_approved ?? 0,
        docsInReview: summary.docs_review ?? 0,
        expiringTotal: summary.expiring_total ?? 0,
        criticalNcs: summary.critical_ncs ?? [],
        failedTests: summary.failed_tests ?? [],
        expiredCals: summary.expired_cals ?? [],
        allNcs: ncsRes.data ?? [],
        allTests: testsRes.data ?? [],
        allPpi: ppiRes.data ?? [],
        allMaterials: matsRes.data ?? [],
      });

      toast({ title: t("qcReport.toast.dataLoaded", { defaultValue: "Dados carregados com sucesso." }) });
    } catch (err) {
      console.error("[QCReport] fetch error:", err);
      toast({ title: t("qcReport.toast.error", { defaultValue: "Erro ao carregar dados." }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeProject, startDate, endDate, t]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!data) return null;

    let ncs = [...data.allNcs];
    let tests = [...data.allTests];
    let ppi = [...data.allPpi];

    if (filterWorkItem !== "all") {
      ncs = ncs.filter(nc => nc.work_item_id === filterWorkItem);
      tests = tests.filter(t => t.work_item_id === filterWorkItem);
      ppi = ppi.filter(p => p.work_item_id === filterWorkItem);
    }
    if (filterDiscipline !== "all") {
      ncs = ncs.filter(nc => nc.discipline === filterDiscipline);
    }
    if (filterSeverity !== "all") {
      ncs = ncs.filter(nc => nc.severity === filterSeverity);
    }
    if (filterSubcontractor !== "all") {
      ncs = ncs.filter(nc => nc.subcontractor_id === filterSubcontractor);
    }

    // Compute stats
    const ncsByStatus: Record<string, number> = {};
    const ncsBySeverity: Record<string, number> = {};
    const ncsByCategory: Record<string, number> = {};
    ncs.forEach(nc => {
      ncsByStatus[nc.status] = (ncsByStatus[nc.status] ?? 0) + 1;
      ncsBySeverity[nc.severity] = (ncsBySeverity[nc.severity] ?? 0) + 1;
      if (nc.category) ncsByCategory[nc.category] = (ncsByCategory[nc.category] ?? 0) + 1;
    });

    const testsPass = tests.filter(t => t.result_status === "pass" || t.pass_fail === "pass").length;
    const testsFail = tests.filter(t => t.result_status === "fail" || t.pass_fail === "fail").length;
    const testsPending = tests.filter(t => ["draft", "pending", "in_progress"].includes(t.status)).length;

    const ppiApproved = ppi.filter(p => p.status === "approved").length;
    const ppiTotal = ppi.length;

    const overdueNcs = ncs.filter(nc =>
      !["closed", "archived"].includes(nc.status) && nc.due_date && nc.due_date < new Date().toISOString().slice(0, 10)
    );

    // By work item grouping
    const wiMap: Record<string, { name: string; ncs: number; tests: number; ppi: number; ncOpen: number }> = {};
    workItems.forEach(wi => {
      const wiNcs = ncs.filter(nc => nc.work_item_id === wi.id);
      const wiTests = tests.filter(t => t.work_item_id === wi.id);
      const wiPpi = ppi.filter(p => p.work_item_id === wi.id);
      if (wiNcs.length || wiTests.length || wiPpi.length) {
        wiMap[wi.id] = {
          name: wiLabel(wi),
          ncs: wiNcs.length,
          tests: wiTests.length,
          ppi: wiPpi.length,
          ncOpen: wiNcs.filter(nc => !["closed", "archived"].includes(nc.status)).length,
        };
      }
    });

    // Pending materials
    const pendingMats = data.allMaterials.filter(m =>
      m.pame_status === "pending" || m.approval_status === "pending"
    );

    return {
      ncs, tests, ppi, overdueNcs, pendingMats,
      ncsByStatus, ncsBySeverity, ncsByCategory,
      testsPass, testsFail, testsPending,
      ppiApproved, ppiTotal,
      wiMap,
      conformityRate: tests.length > 0 ? Math.round((testsPass / tests.length) * 100) : 0,
    };
  }, [data, filterWorkItem, filterDiscipline, filterSeverity, filterSubcontractor, workItems]);

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    if (!data || !filtered || !activeProject || !reportMeta) return;
    setLoading(true);
    try {
      const locale = i18n.language;
      const h = (key: string) => t(`qcReport.pdfHeaders.${key}`);
      const tStatus = (s: string) => t(`qcReport.pdfStatus.${s}`, { defaultValue: s });

      const kpiRow = (label: string, value: string | number) =>
        `<div class="atlas-info-row"><span class="atlas-info-lbl">${label}</span><span class="atlas-info-val">${value}</span></div>`;

      const barHtml = (label: string, value: number, max: number, color: string) => {
        const pct = max > 0 ? Math.round((value / max) * 100) : 0;
        return `<div style="margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px;">
            <span>${label}</span><span style="font-weight:700;">${value}</span>
          </div>
          <div style="background:#E5E7EB;border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:${color};height:100%;width:${pct}%;border-radius:4px;transition:width 0.3s;"></div>
          </div>
        </div>`;
      };

      // ── KPI Section ────────────────────────────────────────────
      const totalTests = filtered.tests.length;
      let bodyHtml = `
        <div class="atlas-info-grid" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
          ${kpiRow(t("qcReport.kpi.testPass"), filtered.testsPass)}
          ${kpiRow(t("qcReport.kpi.testFail"), filtered.testsFail)}
          ${kpiRow(t("qcReport.kpi.testPending"), filtered.testsPending)}
          ${kpiRow(t("qcReport.kpi.conformityRate", { defaultValue: "Taxa Conformidade" }), `${filtered.conformityRate}%`)}
          ${kpiRow(t("qcReport.kpi.ncOpen"), filtered.ncs.filter(nc => !["closed", "archived"].includes(nc.status)).length)}
          ${kpiRow(t("qcReport.kpi.ncClosed"), filtered.ncs.filter(nc => nc.status === "closed").length)}
          ${kpiRow(t("qcReport.kpi.overdue", { defaultValue: "NCs em Atraso" }), filtered.overdueNcs.length)}
          ${kpiRow(t("qcReport.kpi.ppi", { defaultValue: "PPI Aprovados" }), `${filtered.ppiApproved}/${filtered.ppiTotal}`)}
          ${kpiRow(t("qcReport.kpi.docsApproved"), data.docsApproved)}
          ${kpiRow(t("qcReport.kpi.docsReview"), data.docsInReview)}
          ${kpiRow(t("qcReport.kpi.expiring"), data.expiringTotal)}
          ${kpiRow(t("qcReport.kpi.period"), `${fmtDate(startDate, locale)} — ${fmtDate(endDate, locale)}`)}
        </div>
      `;

      // ── Visual Charts (HTML bars) ──────────────────────────────
      if (reportScope !== "executive") {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.ncDistribution", { defaultValue: "Distribuição de NCs" })}</div>`;
        bodyHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">`;

        // By severity
        bodyHtml += `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B7280;margin-bottom:8px;">${t("qcReport.chart.bySeverity", { defaultValue: "Por Gravidade" })}</div>
          ${barHtml(t("nc.severity.minor", { defaultValue: "Minor" }), filtered.ncsBySeverity["minor"] ?? 0, filtered.ncs.length, "#6B7280")}
          ${barHtml(t("nc.severity.major", { defaultValue: "Major" }), filtered.ncsBySeverity["major"] ?? 0, filtered.ncs.length, "#2F4F75")}
          ${barHtml(t("nc.severity.critical", { defaultValue: "Critical" }), filtered.ncsBySeverity["critical"] ?? 0, filtered.ncs.length, "#DC2626")}
          ${barHtml(t("nc.severity.low", { defaultValue: "Low" }), filtered.ncsBySeverity["low"] ?? 0, filtered.ncs.length, "#9CA3AF")}
          ${barHtml(t("nc.severity.medium", { defaultValue: "Medium" }), filtered.ncsBySeverity["medium"] ?? 0, filtered.ncs.length, "#D97706")}
          ${barHtml(t("nc.severity.high", { defaultValue: "High" }), filtered.ncsBySeverity["high"] ?? 0, filtered.ncs.length, "#DC2626")}
        </div>`;

        // By status
        bodyHtml += `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B7280;margin-bottom:8px;">${t("qcReport.chart.byStatus", { defaultValue: "Por Estado" })}</div>
          ${Object.entries(filtered.ncsByStatus).sort((a, b) => b[1] - a[1]).map(([s, v]) =>
            barHtml(tStatus(s), v, filtered.ncs.length, s === "open" ? "#DC2626" : s === "closed" ? "#16A34A" : "#2F4F75")
          ).join("")}
        </div>`;

        bodyHtml += `</div>`;

        // Tests conformity bar
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.testConformity", { defaultValue: "Conformidade de Ensaios" })}</div>`;
        bodyHtml += `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;margin-bottom:14px;">
          ${barHtml(t("qcReport.kpi.testPass"), filtered.testsPass, totalTests, "#16A34A")}
          ${barHtml(t("qcReport.kpi.testFail"), filtered.testsFail, totalTests, "#DC2626")}
          ${barHtml(t("qcReport.kpi.testPending"), filtered.testsPending, totalTests, "#D97706")}
        </div>`;
      }

      // ── NCs em Atraso ──────────────────────────────────────────
      if (filtered.overdueNcs.length > 0) {
        bodyHtml += `<div class="atlas-section" style="color:#DC2626;">${t("qcReport.sections.overdueNcs", { defaultValue: "NCs em Atraso" })} (${filtered.overdueNcs.length})</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${h("title")}</th><th>${h("severity")}</th><th>${h("dueDate", )}</th><th>${h("status")}</th></tr></thead>
          <tbody>${filtered.overdueNcs.map(nc => `<tr>
            <td>${nc.code ?? "—"}</td><td>${nc.title ?? "—"}</td>
            <td>${tStatus(nc.severity)}</td><td style="color:#DC2626;font-weight:700;">${fmtDate(nc.due_date, locale)}</td>
            <td>${tStatus(nc.status)}</td>
          </tr>`).join("")}</tbody>
        </table>`;
      }

      // ── Critical NCs ───────────────────────────────────────────
      if (data.criticalNcs.length > 0 && reportScope !== "executive") {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.criticalNc")}</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${h("title")}</th><th>${h("severity")}</th><th>${h("status")}</th><th>${h("date")}</th></tr></thead>
          <tbody>${data.criticalNcs.map((n: any) => `<tr><td>${n.code ?? "—"}</td><td>${n.title ?? "—"}</td><td>${tStatus(n.severity)}</td><td>${tStatus(n.status)}</td><td>${fmtDate(n.detected_at, locale)}</td></tr>`).join("")}</tbody>
        </table>`;
      }

      // ── By Work Item / Sector ──────────────────────────────────
      const wiEntries = Object.entries(filtered.wiMap);
      if (wiEntries.length > 0 && reportScope !== "executive") {
        bodyHtml += `<div class="page-break"></div>`;
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.byWorkItem", { defaultValue: "Resumo por Capítulo / Work Item" })}</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${t("workItems.table.code", { defaultValue: "Work Item" })}</th><th>NCs</th><th>${t("qcReport.chart.ncOpen", { defaultValue: "NC Abertas" })}</th><th>${t("tests.title", { defaultValue: "Ensaios" })}</th><th>PPI</th></tr></thead>
          <tbody>${wiEntries.map(([, wi]) => `<tr>
            <td>${wi.name}</td><td>${wi.ncs}</td>
            <td style="${wi.ncOpen > 0 ? "color:#DC2626;font-weight:700;" : ""}">${wi.ncOpen}</td>
            <td>${wi.tests}</td><td>${wi.ppi}</td>
          </tr>`).join("")}</tbody>
        </table>`;
      }

      // ── NC By Category ─────────────────────────────────────────
      const catEntries = Object.entries(filtered.ncsByCategory);
      if (catEntries.length > 0 && reportScope !== "executive") {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.byCategory", { defaultValue: "NCs por Categoria" })}</div>`;
        bodyHtml += `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;margin-bottom:14px;">
          ${catEntries.sort((a, b) => b[1] - a[1]).map(([cat, count]) =>
            barHtml(t(`nc.category.${cat}`, { defaultValue: cat }), count, filtered.ncs.length, "#2F4F75")
          ).join("")}
        </div>`;
      }

      // ── Failed Tests ───────────────────────────────────────────
      if (data.failedTests.length > 0 && reportScope !== "executive") {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.failedTests")}</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${h("report")}</th><th>${h("date")}</th><th>${h("status")}</th></tr></thead>
          <tbody>${data.failedTests.map((tt: any) => `<tr><td>${tt.code ?? "—"}</td><td>${tt.report_number ?? "—"}</td><td>${fmtDate(tt.test_date, locale)}</td><td>${tStatus(tt.status)}</td></tr>`).join("")}</tbody>
        </table>`;
      }

      // ── Pending Materials ──────────────────────────────────────
      if (filtered.pendingMats.length > 0) {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.pendingMaterials", { defaultValue: "Materiais Pendentes de Aprovação" })}</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${t("common.name")}</th><th>${t("common.status")}</th></tr></thead>
          <tbody>${filtered.pendingMats.map(m => `<tr><td>${m.code}</td><td>${m.name}</td><td>${m.pame_status ?? m.approval_status ?? "—"}</td></tr>`).join("")}</tbody>
        </table>`;
      }

      // ── Expired Calibrations ───────────────────────────────────
      if (data.expiredCals.length > 0 && reportScope !== "executive") {
        bodyHtml += `<div class="atlas-section">${t("qcReport.sections.expiredCals")}</div>`;
        bodyHtml += `<table class="atlas-table">
          <thead><tr><th>${h("certificate")}</th><th>${h("validUntil")}</th><th>${h("status")}</th></tr></thead>
          <tbody>${data.expiredCals.map((c: any) => `<tr><td>${c.certificate_number ?? "—"}</td><td>${fmtDate(c.valid_until, locale)}</td><td>${tStatus(c.status)}</td></tr>`).join("")}</tbody>
        </table>`;
      }

      // ── Signature ──────────────────────────────────────────────
      const contentStr = JSON.stringify({ filtered: filtered.ncs.length, startDate, endDate });
      const checksum = Array.from(new TextEncoder().encode(contentStr)).reduce((a, b) => ((a << 5) - a + b) | 0, 0).toString(16);

      bodyHtml += `
        <div style="margin-top:24px;padding-top:16px;border-top:2px solid #2F4F75;">
          <p style="font-size:10px;font-weight:700;color:#2F4F75;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">${t("qcReport.signature.title")}</p>
          <div class="atlas-info-grid" style="grid-template-columns:1fr 1fr 1fr;">
            ${kpiRow(t("qcReport.signature.name"), user?.email ?? "—")}
            ${kpiRow(t("qcReport.signature.timestamp"), new Date().toISOString())}
            ${kpiRow(t("qcReport.signature.checksum"), checksum)}
          </div>
        </div>
      `;

      // ── Build PDF ──────────────────────────────────────────────
      const scopeLabel = reportScope === "executive" ? "Executivo" : reportScope === "by_chapter" ? "Capitulo" : reportScope === "by_subcontractor" ? "Subempreiteiro" : "Completo";
      const labels: ReportLabels = {
        appName: "Atlas",
        reportTitle: `${t("qcReport.pdfTitle")} — ${scopeLabel}`,
        generatedOn: t("report.generatedOn"),
      };

      const filename = buildReportFilename("QC", activeProject.code, `${reportType}_${reportScope}`, "pdf");
      const html = generatePdfDocument({
        title: labels.reportTitle,
        labels,
        meta: reportMeta!,
        bodyHtml,
        footerRef: `QC-${activeProject.code}-${startDate}-${endDate}`,
      });

      printHtml(html, filename);

      await auditService.log({
        projectId: activeProject.id,
        entity: "report",
        action: "EXPORT",
        module: "reports",
        description: `QC report (${reportScope}/${reportType}) for ${startDate} to ${endDate}`,
      });

      toast({ title: t("qcReport.toast.generated", { defaultValue: "Relatório QC gerado com sucesso." }) });
    } catch (err) {
      console.error("[QCReport] error:", err);
      toast({ title: t("qcReport.toast.error", { defaultValue: "Erro ao gerar relatório." }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [data, filtered, activeProject, reportMeta, reportScope, reportType, startDate, endDate, i18n.language, t, user, filterWorkItem]);

  // ── Active filter badges ───────────────────────────────────────────────────
  const activeFilters = [
    filterWorkItem !== "all" && `WI: ${workItems.find(w => w.id === filterWorkItem)?.sector ?? filterWorkItem}`,
    filterDiscipline !== "all" && `Disc: ${filterDiscipline}`,
    filterSeverity !== "all" && `Sev: ${filterSeverity}`,
    filterSubcontractor !== "all" && `Sub: ${subcontractors.find(s => s.id === filterSubcontractor)?.name ?? filterSubcontractor}`,
  ].filter(Boolean);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        module={t("qcReport.module", { defaultValue: "Relatórios" })}
        title={t("qcReport.title", { defaultValue: "Relatório QC PRO" })}
        subtitle={t("qcReport.subtitle", { defaultValue: "Gerar relatório de controlo de qualidade com análise detalhada por sector, disciplina e tendências" })}
        icon={BarChart3}
        iconColor="hsl(var(--primary))"
      />

      {/* ── Filters Card ─────────────────────────────────────────── */}
      <Card className="border-0 bg-card shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t("qcReport.params", { defaultValue: "Parâmetros do Relatório" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Dates + Type + Scope */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.startDate", { defaultValue: "Data Início" })}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.endDate", { defaultValue: "Data Fim" })}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.type", { defaultValue: "Período" })}</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("qcReport.weekly", { defaultValue: "Semanal" })}</SelectItem>
                  <SelectItem value="monthly">{t("qcReport.monthly", { defaultValue: "Mensal" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.scope", { defaultValue: "Tipo de Relatório" })}</Label>
              <Select value={reportScope} onValueChange={(v: any) => setReportScope(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{t("qcReport.scope.full", { defaultValue: "Completo" })}</SelectItem>
                  <SelectItem value="executive">{t("qcReport.scope.executive", { defaultValue: "Executivo" })}</SelectItem>
                  <SelectItem value="by_chapter">{t("qcReport.scope.chapter", { defaultValue: "Por Capítulo" })}</SelectItem>
                  <SelectItem value="by_subcontractor">{t("qcReport.scope.subcontractor", { defaultValue: "Por Subempreiteiro" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Advanced filters */}
          <FilterBar>
            <Select value={filterWorkItem} onValueChange={setFilterWorkItem}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder="Work Item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", { defaultValue: "Todos" })} Work Items</SelectItem>
                {workItems.map(wi => (
                  <SelectItem key={wi.id} value={wi.id}>{wiLabel(wi)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", { defaultValue: "Todas" })} Disciplinas</SelectItem>
                {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{t(`documents.disciplinas.${d}`, { defaultValue: d })}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Gravidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", { defaultValue: "Todas" })} Gravidades</SelectItem>
                {SEVERITIES.map(s => <SelectItem key={s} value={s}>{t(`nc.severity.${s}`, { defaultValue: s })}</SelectItem>)}
              </SelectContent>
            </Select>
            {subcontractors.length > 0 && (
              <Select value={filterSubcontractor} onValueChange={setFilterSubcontractor}>
                <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder="Subempreiteiro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", { defaultValue: "Todos" })} Subempreiteiros</SelectItem>
                  {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </FilterBar>

          {/* Active filter badges */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{t("qcReport.activeFilters", { defaultValue: "Filtros ativos:" })}</span>
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={fetchData} disabled={loading} variant="outline" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("qcReport.loadData", { defaultValue: "Carregar Dados" })}
            </Button>
            <Button onClick={generateReport} disabled={loading || !data} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {t("qcReport.generate", { defaultValue: "Gerar PDF" })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Preview ──────────────────────────────────────────── */}
      {filtered && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t("qcReport.tabs.overview", { defaultValue: "Resumo" })}</TabsTrigger>
            <TabsTrigger value="ncs">{t("qcReport.tabs.ncs", { defaultValue: "NCs" })} ({filtered.ncs.length})</TabsTrigger>
            <TabsTrigger value="tests">{t("qcReport.tabs.tests", { defaultValue: "Ensaios" })} ({filtered.tests.length})</TabsTrigger>
            <TabsTrigger value="sectors">{t("qcReport.tabs.sectors", { defaultValue: "Sectores" })} ({Object.keys(filtered.wiMap).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <ModuleKPICard label={t("qcReport.kpi.ncOpen")} value={filtered.ncs.filter(nc => !["closed", "archived"].includes(nc.status)).length} icon={AlertTriangle} color="hsl(var(--destructive))" />
              <ModuleKPICard label={t("qcReport.kpi.overdue", { defaultValue: "Em Atraso" })} value={filtered.overdueNcs.length} icon={Clock} color={filtered.overdueNcs.length > 0 ? "hsl(var(--destructive))" : undefined} />
              <ModuleKPICard label={t("qcReport.kpi.testPass")} value={filtered.testsPass} icon={CheckCircle2} color="hsl(158 45% 36%)" />
              <ModuleKPICard label={t("qcReport.kpi.testFail")} value={filtered.testsFail} icon={FlaskConical} color={filtered.testsFail > 0 ? "hsl(var(--destructive))" : undefined} />
              <ModuleKPICard label={t("qcReport.kpi.conformityRate", { defaultValue: "Conformidade" })} value={`${filtered.conformityRate}%`} icon={filtered.conformityRate >= 90 ? TrendingUp : TrendingDown} color={filtered.conformityRate >= 90 ? "hsl(158 45% 36%)" : "hsl(var(--destructive))"} />
              <ModuleKPICard label={t("qcReport.kpi.ppi", { defaultValue: "PPI" })} value={`${filtered.ppiApproved}/${filtered.ppiTotal}`} icon={ClipboardCheck} />
            </div>

            {/* Alerts */}
            {(filtered.overdueNcs.length > 0 || filtered.testsFail > 0 || filtered.pendingMats.length > 0) && (
              <div className="mt-4 space-y-2">
                {filtered.overdueNcs.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{filtered.overdueNcs.length} NC(s) em atraso — requerem ação imediata</span>
                  </div>
                )}
                {filtered.testsFail > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                    <FlaskConical className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{filtered.testsFail} ensaio(s) não conforme(s) no período</span>
                  </div>
                )}
                {filtered.pendingMats.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary">
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{filtered.pendingMats.length} material(is) pendentes de aprovação</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ncs">
            <Card className="border-0 bg-card shadow-card">
              <CardContent className="p-0">
                {filtered.ncs.length === 0 ? (
                  <EmptyState titleKey="common.noData" icon={AlertTriangle} />
                ) : (
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Código</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Título</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Gravidade</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Estado</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.ncs.map(nc => {
                          const overdue = !["closed", "archived"].includes(nc.status) && nc.due_date && nc.due_date < new Date().toISOString().slice(0, 10);
                          return (
                            <tr key={nc.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-mono text-xs">{nc.code ?? "—"}</td>
                              <td className="p-3 max-w-[200px] truncate">{nc.title ?? "—"}</td>
                              <td className="p-3">
                                <Badge variant="secondary" className={`text-xs ${nc.severity === "critical" || nc.severity === "high" ? "bg-destructive/10 text-destructive" : nc.severity === "major" || nc.severity === "medium" ? "bg-primary/10 text-primary" : ""}`}>
                                  {nc.severity}
                                </Badge>
                              </td>
                              <td className="p-3 text-xs">{nc.status}</td>
                              <td className={`p-3 text-xs ${overdue ? "text-destructive font-semibold" : ""}`}>{nc.due_date ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <Card className="border-0 bg-card shadow-card">
              <CardContent className="p-0">
                {filtered.tests.length === 0 ? (
                  <EmptyState titleKey="common.noData" icon={FlaskConical} />
                ) : (
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Código</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Data</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Workflow</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.tests.map(test => (
                          <tr key={test.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono text-xs">{test.code ?? "—"}</td>
                            <td className="p-3 text-xs">{test.date ?? "—"}</td>
                            <td className="p-3 text-xs">{test.status}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className={`text-xs ${
                                (test.result_status === "fail" || test.pass_fail === "fail") ? "bg-destructive/10 text-destructive" :
                                (test.result_status === "pass" || test.pass_fail === "pass") ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""
                              }`}>
                                {test.result_status ?? test.pass_fail ?? "—"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectors">
            <Card className="border-0 bg-card shadow-card">
              <CardContent className="p-0">
                {Object.keys(filtered.wiMap).length === 0 ? (
                  <EmptyState titleKey="common.noData" icon={FileText} />
                ) : (
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Work Item</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">NCs</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">NC Abertas</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Ensaios</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">PPI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(filtered.wiMap).map(([id, wi]) => (
                          <tr key={id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-xs font-medium">{wi.name}</td>
                            <td className="p-3 text-xs">{wi.ncs}</td>
                            <td className={`p-3 text-xs ${wi.ncOpen > 0 ? "text-destructive font-semibold" : ""}`}>{wi.ncOpen}</td>
                            <td className="p-3 text-xs">{wi.tests}</td>
                            <td className="p-3 text-xs">{wi.ppi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── No data yet prompt ────────────────────────────────────── */}
      {!data && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">{t("qcReport.noData.title", { defaultValue: "Selecione os parâmetros e carregue os dados" })}</p>
            <p className="text-xs text-muted-foreground">{t("qcReport.noData.subtitle", { defaultValue: "Os dados serão mostrados aqui para pré-visualização antes de gerar o PDF" })}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

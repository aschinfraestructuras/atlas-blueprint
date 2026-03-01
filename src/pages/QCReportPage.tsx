import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
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

export default function QCReportPage() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");

  if (!activeProject) return <NoProjectBanner />;

  async function generateReport() {
    if (!activeProject) return;
    setLoading(true);
    try {
      const pid = activeProject.id;
      const locale = i18n.language;

      // Fetch data in parallel
      const [ncRes, testRes, docsRes, calRes, suppDocRes, subDocRes] = await Promise.all([
        supabase.from("non_conformities").select("id, code, title, severity, status, detected_at, due_date").eq("project_id", pid),
        supabase.from("test_results" as any).select("id, code, status, pass_fail, test_date, report_number").eq("project_id", pid),
        supabase.from("documents").select("id, title, code, status, doc_type, updated_at").eq("project_id", pid).eq("is_deleted", false),
        supabase.from("equipment_calibrations").select("id, certificate_number, valid_until, status").eq("project_id", pid),
        supabase.from("supplier_documents").select("id, doc_type, valid_to, status").eq("project_id", pid),
        supabase.from("subcontractor_documents").select("id, doc_type, valid_to, status").eq("project_id", pid),
      ]);

      const ncs = ncRes.data ?? [];
      const tests = testRes.data ?? [];
      const docs = docsRes.data ?? [];
      const cals = calRes.data ?? [];
      const suppDocs = suppDocRes.data ?? [];
      const subDocs = subDocRes.data ?? [];

      // Filter by period
      const inPeriod = (dateStr: string | null) => {
        if (!dateStr) return false;
        const d = dateStr.slice(0, 10);
        return d >= startDate && d <= endDate;
      };

      const periodNcs = ncs.filter(n => inPeriod(n.detected_at));
      const periodTests = tests.filter((t: any) => inPeriod(t.test_date));

      // KPIs
      const testsPass = periodTests.filter((t: any) => t.pass_fail === "pass").length;
      const testsFail = periodTests.filter((t: any) => t.pass_fail === "fail").length;
      const testsPending = periodTests.filter((t: any) => !["pass", "fail"].includes(t.pass_fail ?? "")).length;
      const ncsOpen = ncs.filter(n => ["open", "in_progress"].includes(n.status)).length;
      const ncsClosed = periodNcs.filter(n => ["closed", "verified"].includes(n.status)).length;
      const docsApproved = docs.filter(d => d.status === "approved").length;
      const docsInReview = docs.filter(d => d.status === "in_review").length;

      const today = new Date();
      const thirtyDays = new Date(today); thirtyDays.setDate(thirtyDays.getDate() + 30);
      const expiringCals = cals.filter(c => new Date(c.valid_until) <= thirtyDays && new Date(c.valid_until) >= today).length;
      const expiringSuppDocs = suppDocs.filter(d => d.valid_to && new Date(d.valid_to) <= thirtyDays && new Date(d.valid_to) >= today).length;
      const expiringSubDocs = subDocs.filter(d => d.valid_to && new Date(d.valid_to) <= thirtyDays && new Date(d.valid_to) >= today).length;

      // Critical NCs (top 10)
      const criticalNcs = ncs
        .filter(n => ["open", "in_progress"].includes(n.status))
        .sort((a, b) => {
          const sev: Record<string, number> = { critical: 0, major: 1, high: 2, medium: 3, minor: 4, low: 5 };
          return (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
        })
        .slice(0, 10);

      // Failed tests
      const failedTests = periodTests.filter((t: any) => t.pass_fail === "fail").slice(0, 10);

      // Expired calibrations
      const expiredCals = cals.filter(c => new Date(c.valid_until) < today).slice(0, 10);

      // Generate simple checksum
      const contentStr = JSON.stringify({ periodNcs: periodNcs.length, periodTests: periodTests.length, ncsOpen, startDate, endDate });
      const checksum = Array.from(new TextEncoder().encode(contentStr)).reduce((a, b) => ((a << 5) - a + b) | 0, 0).toString(16);

      const meta: ReportMeta = {
        projectName: activeProject.name,
        projectCode: activeProject.code,
        locale,
        generatedBy: user?.email ?? "—",
      };
      const labels: ReportLabels = {
        appName: "Atlas",
        reportTitle: t("qcReport.pdfTitle"),
        generatedOn: t("report.generatedOn"),
      };

      // Translate status values
      const tStatus = (s: string) => t(`qcReport.pdfStatus.${s}`, { defaultValue: s });
      const h = (key: string) => t(`qcReport.pdfHeaders.${key}`);

      const kpiRow = (label: string, value: string | number) =>
        `<div class="atlas-info-row"><span class="atlas-info-lbl">${label}</span><span class="atlas-info-val">${value}</span></div>`;

      const bodyHtml = `
        <div class="atlas-info-grid" style="grid-template-columns: 1fr 1fr 1fr;">
          ${kpiRow(t("qcReport.kpi.testPass"), testsPass)}
          ${kpiRow(t("qcReport.kpi.testFail"), testsFail)}
          ${kpiRow(t("qcReport.kpi.testPending"), testsPending)}
          ${kpiRow(t("qcReport.kpi.ncOpen"), ncsOpen)}
          ${kpiRow(t("qcReport.kpi.ncClosed"), ncsClosed)}
          ${kpiRow(t("qcReport.kpi.docsApproved"), docsApproved)}
          ${kpiRow(t("qcReport.kpi.docsReview"), docsInReview)}
          ${kpiRow(t("qcReport.kpi.expiring"), expiringCals + expiringSuppDocs + expiringSubDocs)}
          ${kpiRow(t("qcReport.kpi.period"), `${fmtDate(startDate, locale)} — ${fmtDate(endDate, locale)}`)}
        </div>

        <div class="atlas-section">${t("qcReport.sections.criticalNc")}</div>
        <table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${h("title")}</th><th>${h("severity")}</th><th>${h("status")}</th><th>${h("date")}</th></tr></thead>
          <tbody>${criticalNcs.map(n => `<tr><td>${n.code ?? "—"}</td><td>${n.title ?? "—"}</td><td>${tStatus(n.severity)}</td><td>${tStatus(n.status)}</td><td>${fmtDate(n.detected_at, locale)}</td></tr>`).join("") || `<tr><td colspan="5" style="text-align:center;color:#999;">—</td></tr>`}</tbody>
        </table>

        <div class="atlas-section">${t("qcReport.sections.failedTests")}</div>
        <table class="atlas-table">
          <thead><tr><th>${h("code")}</th><th>${h("report")}</th><th>${h("date")}</th><th>${h("status")}</th></tr></thead>
          <tbody>${failedTests.map((t: any) => `<tr><td>${t.code ?? "—"}</td><td>${t.report_number ?? "—"}</td><td>${fmtDate(t.test_date, locale)}</td><td>${tStatus(t.status)}</td></tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#999;">—</td></tr>`}</tbody>
        </table>

        <div class="atlas-section">${t("qcReport.sections.expiredCals")}</div>
        <table class="atlas-table">
          <thead><tr><th>${h("certificate")}</th><th>${h("validUntil")}</th><th>${h("status")}</th></tr></thead>
          <tbody>${expiredCals.map(c => `<tr><td>${c.certificate_number ?? "—"}</td><td>${fmtDate(c.valid_until, locale)}</td><td>${tStatus(c.status)}</td></tr>`).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;">—</td></tr>`}</tbody>
        </table>

        <div style="margin-top:24px;padding-top:16px;border-top:2px solid #2F4F75;">
          <p style="font-size:10px;font-weight:700;color:#2F4F75;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">${t("qcReport.signature.title")}</p>
          <div class="atlas-info-grid" style="grid-template-columns:1fr 1fr 1fr;">
            ${kpiRow(t("qcReport.signature.name"), user?.email ?? "—")}
            ${kpiRow(t("qcReport.signature.timestamp"), new Date().toISOString())}
            ${kpiRow(t("qcReport.signature.checksum"), checksum)}
          </div>
        </div>
      `;

      const filename = buildReportFilename("QC", activeProject.code, reportType, "pdf");
      const html = generatePdfDocument({
        title: labels.reportTitle,
        labels,
        meta,
        bodyHtml,
        footerRef: `QC-${activeProject.code}-${startDate}-${endDate}`,
      });

      printHtml(html, filename);

      // Audit log
      await auditService.log({
        projectId: pid,
        entity: "report",
        action: "EXPORT",
        module: "reports",
        description: `QC report exported (${reportType}) for period ${startDate} to ${endDate}`,
      });

      toast({ title: t("qcReport.toast.generated", { defaultValue: "Relatório QC gerado com sucesso." }) });
    } catch (err) {
      console.error("[QCReport] error:", err);
      toast({ title: t("qcReport.toast.error", { defaultValue: "Erro ao gerar relatório." }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        module={t("qcReport.module", { defaultValue: "Relatórios" })}
        title={t("qcReport.title", { defaultValue: "Relatório QC" })}
        subtitle={t("qcReport.subtitle", { defaultValue: "Gerar relatório de controlo de qualidade semanal ou mensal" })}
        icon={FileText}
        iconColor="hsl(var(--module-documents))"
      />

      <Card className="border-0 bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("qcReport.params", { defaultValue: "Parâmetros do Relatório" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.startDate", { defaultValue: "Data Início" })}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.endDate", { defaultValue: "Data Fim" })}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("qcReport.type", { defaultValue: "Tipo" })}</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("qcReport.weekly", { defaultValue: "Semanal" })}</SelectItem>
                  <SelectItem value="monthly">{t("qcReport.monthly", { defaultValue: "Mensal" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateReport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {t("qcReport.generate", { defaultValue: "Gerar PDF" })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { projectInfoStripHtml, fullPdfHeader, type PdfProjectInfo } from "./pdfProjectHeader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface MonthlyReport {
  id: string;
  project_id: string;
  code: string;
  reference_month: string;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  accepted_at: string | null;
  kpi_tests_pass_rate: number | null;
  kpi_nc_open: number | null;
  kpi_nc_closed_month: number | null;
  kpi_hp_approved: number | null;
  kpi_hp_total: number | null;
  kpi_mat_approved: number | null;
  kpi_mat_pending: number | null;
  kpi_ppi_completed: number | null;
  kpi_emes_expiring: number | null;
  observations: string | null;
  corrective_actions: string | null;
  next_month_plan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportInput {
  project_id: string;
  reference_month: string; // YYYY-MM-01
}

// ── Helpers ──────────────────────────────────────────────────────

/** Calculate the 5th working day of a month (Mon-Fri). */
export function getFifthWorkingDay(year: number, month: number): Date {
  let workingDays = 0;
  const d = new Date(year, month - 1, 1);
  while (workingDays < 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
    if (workingDays < 5) d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Get the deadline for a given reference_month (5th working day of the *following* month). */
export function getDeadlineForMonth(refMonth: string): Date {
  const d = new Date(refMonth);
  const nextMonth = d.getMonth() + 2; // +1 for next month, +1 because Date months are 0-indexed
  const year = nextMonth > 12 ? d.getFullYear() + 1 : d.getFullYear();
  const month = nextMonth > 12 ? nextMonth - 12 : nextMonth;
  return getFifthWorkingDay(year, month);
}

/** Check if a report was submitted on time. */
export function isOnTime(report: MonthlyReport): boolean | null {
  if (!report.submitted_at) return null;
  const deadline = getDeadlineForMonth(report.reference_month);
  return new Date(report.submitted_at) <= deadline;
}

// ── KPI Snapshot Fetcher ─────────────────────────────────────────

// ─── Tipo para dados detalhados de ensaios ────────────────────────────────────
export interface TestsDataForMonth {
  concreteBatches: number;
  concreteLots: number;
  concreteConform: number;
  weldsTotal: number;
  weldsWithUT: number;
  soilsTotal: number;
  soilsConform: number;
  compactionTotal: number;
  compactionConform: number;
}

// ─── Busca dados reais de ensaios para o mês de referência ───────────────────
export async function fetchTestsDataForMonth(
  projectId: string,
  referenceMonth: string, // "YYYY-MM-01"
): Promise<TestsDataForMonth> {
  const d = new Date(referenceMonth);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end   = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const [cbRes, clRes, wrRes, ssRes, czRes] = await Promise.allSettled([
    // Betão — amassadas no mês
    db.from("concrete_batches")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("batch_date", start).lte("batch_date", end),
    // Betão — lotes no mês
    db.from("concrete_lots")
      .select("id,status", { count: "exact" })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .gte("date_start", start).lte("date_start", end),
    // Soldaduras no mês
    db.from("weld_records")
      .select("id,has_ut")
      .eq("project_id", projectId)
      .gte("weld_date", start).lte("weld_date", end),
    // Solos — amostras no mês
    db.from("soil_samples")
      .select("id,overall_result")
      .eq("project_id", projectId)
      .gte("sample_date", start).lte("sample_date", end),
    // Compactação — zonas no mês
    db.from("compaction_zones")
      .select("id,overall_result")
      .eq("project_id", projectId)
      .gte("test_date", start).lte("test_date", end),
  ]);

  const cb  = cbRes.status  === "fulfilled" ? cbRes.value  : { count: 0, data: null };
  const cl  = clRes.status  === "fulfilled" ? clRes.value  : { data: [] };
  const wr  = wrRes.status  === "fulfilled" ? wrRes.value  : { data: [] };
  const ss  = ssRes.status  === "fulfilled" ? ssRes.value  : { data: [] };
  const cz  = czRes.status  === "fulfilled" ? czRes.value  : { data: [] };

  const lots: any[]  = cl.data ?? [];
  const welds: any[] = wr.data ?? [];
  const soils: any[] = ss.data ?? [];
  const zones: any[] = cz.data ?? [];

  return {
    concreteBatches: cb.count ?? 0,
    concreteLots:    lots.length,
    concreteConform: lots.filter((l: any) => l.status === "conform" || l.status === "pass" || l.status === "approved").length,
    weldsTotal:      welds.length,
    weldsWithUT:     welds.filter((w: any) => w.has_ut === true).length,
    soilsTotal:      soils.length,
    soilsConform:    soils.filter((s: any) => s.overall_result === "pass" || s.overall_result === "conforme").length,
    compactionTotal: zones.length,
    compactionConform: zones.filter((z: any) => z.overall_result === "pass" || z.overall_result === "conforme").length,
  };
}

// ─── Gera texto narrativo automático a partir da BD ──────────────────────────
export async function generateNarrativeTexts(
  projectId: string,
  referenceMonth: string,
): Promise<{ production: string; tests: string; training: string }> {
  const d = new Date(referenceMonth);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end   = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const [wiRes, trRes, ncRes, testsRes] = await Promise.allSettled([
    // Frentes activas no mês (via partes diárias)
    db.from("daily_reports")
      .select("work_item_id, work_items(sector, disciplina)")
      .eq("project_id", projectId)
      .gte("report_date", start).lte("report_date", end)
      .eq("is_deleted", false),
    // Sessões de formação no mês
    db.from("training_sessions")
      .select("title, session_date, attendee_count, session_type")
      .eq("project_id", projectId)
      .gte("session_date", start).lte("session_date", end),
    // NCs abertas e encerradas
    db.from("non_conformities")
      .select("code, status, title")
      .eq("project_id", projectId)
      .eq("is_deleted", false),
    // Ensaios realizados no mês
    db.from("test_results")
      .select("id, result_status, tests_catalog(name)")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .gte("date", start).lte("date", end),
  ]);

  // Produção
  let productionText = "";
  if (wiRes.status === "fulfilled" && wiRes.value.data?.length) {
    const disciplinas = new Set<string>();
    wiRes.value.data.forEach((r: any) => {
      const d = r.work_items?.disciplina ?? r.work_items?.sector;
      if (d) disciplinas.add(d);
    });
    const partes = wiRes.value.data.length;
    productionText = `Mês com ${partes} parte(s) diária(s) registada(s). Disciplinas activas: ${Array.from(disciplinas).join(", ") || "N/D"}.`;
  } else {
    productionText = "Sem partes diárias registadas no mês.";
  }

  // Ensaios
  let testsText = "";
  if (testsRes.status === "fulfilled" && testsRes.value.data?.length) {
    const rows: any[] = testsRes.value.data;
    const total = rows.length;
    const pass  = rows.filter((r: any) => r.result_status === "pass").length;
    const fail  = rows.filter((r: any) => r.result_status === "fail").length;
    const pend  = total - pass - fail;
    const pct   = total > 0 ? Math.round((pass / total) * 100) : 0;
    testsText = `${total} ensaio(s) realizado(s) no mês: ${pass} conformes, ${fail} não conformes, ${pend} pendentes. Taxa de conformidade: ${pct}%.`;
  } else {
    testsText = "Sem ensaios registados no mês.";
  }

  // Formações
  let trainingText = "";
  if (trRes.status === "fulfilled" && trRes.value.data?.length) {
    const rows: any[] = trRes.value.data;
    const totalAttendees = rows.reduce((s: number, r: any) => s + (r.attendee_count ?? 0), 0);
    const titles = rows.map((r: any) => r.title).join("; ");
    trainingText = `${rows.length} sessão(ões) de formação: ${titles}. Total de formandos: ${totalAttendees}.`;
  } else {
    trainingText = "Sem sessões de formação no mês.";
  }

  return {
    production: productionText,
    tests: testsText,
    training: trainingText,
  };
}

async function fetchKpiSnapshot(projectId: string, refMonth: string) {
  const monthStart = refMonth; // YYYY-MM-01
  const nextMonth = new Date(refMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);
  const today = new Date().toISOString().split("T")[0];
  const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [
    ncOpenRes, ncClosedRes,
    testsPassRes, testsTotalRes,
    hpApprovedRes, hpTotalRes,
    matApprovedRes, matPendingRes,
    ppiCompletedRes, emesRes,
  ] = await Promise.all([
    db.from("non_conformities").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).neq("status", "closed").neq("status", "archived").eq("is_deleted", false),
    db.from("non_conformities").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("status", "closed").eq("is_deleted", false).gte("closure_date", monthStart).lt("closure_date", monthEnd),
    db.from("test_results").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("is_deleted", false).in("pass_fail", ["pass", "conform"]),
    db.from("test_results").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("is_deleted", false),
    db.from("hp_notifications").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("status", "confirmed"),
    db.from("hp_notifications").select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    db.from("materials").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("is_deleted", false).not("pame_code", "is", null).eq("pame_status", "approved"),
    db.from("materials").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("is_deleted", false).not("pame_code", "is", null).eq("pame_status", "pending"),
    db.from("ppi_instances").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("status", "approved").eq("is_deleted", false),
    db.from("topography_equipment").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("status", "active").gte("calibration_valid_until", today).lte("calibration_valid_until", in30d),
  ]);

  const totalTests = testsTotalRes.count ?? 0;
  const passTests = testsPassRes.count ?? 0;
  const passRate = totalTests > 0 ? Math.round((passTests / totalTests) * 10000) / 100 : null;

  return {
    kpi_tests_pass_rate: passRate,
    kpi_nc_open: ncOpenRes.count ?? 0,
    kpi_nc_closed_month: ncClosedRes.count ?? 0,
    kpi_hp_approved: hpApprovedRes.count ?? 0,
    kpi_hp_total: hpTotalRes.count ?? 0,
    kpi_mat_approved: matApprovedRes.count ?? 0,
    kpi_mat_pending: matPendingRes.count ?? 0,
    kpi_ppi_completed: ppiCompletedRes.count ?? 0,
    kpi_emes_expiring: emesRes.count ?? 0,
  };
}

// ── Service ──────────────────────────────────────────────────────

export const monthlyReportService = {
  async createDraft(projectId: string, referenceMonth: string): Promise<MonthlyReport> {
    const { data: code, error: codeErr } = await db.rpc("fn_next_rmsgq_code", {
      p_project_id: projectId,
    });
    if (codeErr) throw codeErr;

    const { data: { user } } = await supabase.auth.getUser();
    const kpis = await fetchKpiSnapshot(projectId, referenceMonth);

    const { data, error } = await db
      .from("monthly_quality_reports")
      .insert({
        project_id: projectId,
        code,
        reference_month: referenceMonth,
        created_by: user?.id ?? null,
        ...kpis,
      })
      .select()
      .single();
    if (error) throw error;
    return data as MonthlyReport;
  },

  async listByProject(projectId: string): Promise<MonthlyReport[]> {
    const { data, error } = await db
      .from("monthly_quality_reports")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("reference_month", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MonthlyReport[];
  },

  async getById(id: string): Promise<MonthlyReport> {
    const { data, error } = await db
      .from("monthly_quality_reports")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as MonthlyReport;
  },

  async update(id: string, fields: Partial<Pick<MonthlyReport, "observations" | "corrective_actions" | "next_month_plan">>): Promise<void> {
    const { error } = await db
      .from("monthly_quality_reports")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async submit(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await db
      .from("monthly_quality_reports")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteDraft(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    // Primeiro verificar se o relatório existe e não está já apagado
    const { data: existing } = await db
      .from("monthly_quality_reports")
      .select("id, status")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();
    if (!existing) throw new Error("Relatório não encontrado ou já foi eliminado.");
    const { error } = await db
      .from("monthly_quality_reports")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  exportPdf(
    report: MonthlyReport,
    projectName: string,
    logoBase64?: string | null,
    projectMeta?: PdfProjectInfo | null,
    testsData?: { concreteBatches: number; concreteLots: number; concreteConform: number; weldsTotal: number; weldsWithUT: number; soilsTotal: number; soilsConform: number; compactionTotal: number; compactionConform: number } | null,
  ) {
    const refDate = new Date(report.reference_month);
    const monthLabel = refDate.toLocaleDateString("pt-PT", { year: "numeric", month: "long" });
    const deadline = getDeadlineForMonth(report.reference_month);
    const onTime = isOnTime(report);
    const onTimeLabel = onTime === null ? "—" : onTime ? "✅ Sim" : "❌ Não";

    const kpiRows = [
      { label: "Taxa de conformidade de ensaios", meta: "≥ 95%", value: report.kpi_tests_pass_rate !== null ? `${report.kpi_tests_pass_rate}%` : "—", ok: report.kpi_tests_pass_rate !== null && report.kpi_tests_pass_rate >= 95 },
      { label: "HPs com aprovação escrita", meta: "100%", value: report.kpi_hp_total ? `${report.kpi_hp_approved}/${report.kpi_hp_total}` : "—", ok: report.kpi_hp_total ? report.kpi_hp_approved === report.kpi_hp_total : true },
      { label: "NCs encerradas no prazo", meta: "100%", value: `${report.kpi_nc_closed_month ?? 0} encerradas`, ok: (report.kpi_nc_open ?? 0) === 0 },
      { label: "Materiais aprovados (PAME)", meta: "—", value: `${report.kpi_mat_approved ?? 0} aprovados / ${report.kpi_mat_pending ?? 0} pendentes`, ok: (report.kpi_mat_pending ?? 0) === 0 },
      { label: "PPIs concluídos", meta: "—", value: `${report.kpi_ppi_completed ?? 0}`, ok: true },
      { label: "EMEs com calibração a expirar", meta: "0", value: `${report.kpi_emes_expiring ?? 0}`, ok: (report.kpi_emes_expiring ?? 0) === 0 },
    ];

    const kpiHtml = kpiRows.map(r => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.label}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${r.meta}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:700;">${r.value}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${r.ok ? "✅" : "⚠️"}</td>
      </tr>
    `).join("");

    const textSection = (title: string, content: string | null) => content ? `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">${title}</div>
        <div style="border:1px solid #d1d5db;padding:10px;white-space:pre-wrap;min-height:40px;font-size:11px;">${content}</div>
      </div>
    ` : "";

    const headerHtml = fullPdfHeader(
      logoBase64 ?? null,
      projectName,
      report.code,
      "0",
      new Date().toLocaleDateString("pt-PT"),
      projectMeta?.contractor ?? "—",
      projectMeta?.client ?? "—",
      projectMeta,
    );

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${report.code} — Relatório Mensal SGQ</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; padding: 20px; }
  @page { size: A4 portrait; margin: 15mm; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head><body>
  ${headerHtml}

  <div style="padding:20px;">
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;font-weight:700;width:180px;border:1px solid #d1d5db;background:#f3f4f6;">Mês de referência</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-transform:capitalize;">${monthLabel}</td>
        <td style="padding:6px 8px;font-weight:700;width:140px;border:1px solid #d1d5db;background:#f3f4f6;">Prazo de entrega</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${deadline.toLocaleDateString("pt-PT")}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Data de submissão</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.submitted_at ? new Date(report.submitted_at).toLocaleDateString("pt-PT") : "—"}</td>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Entregue dentro do prazo?</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${onTimeLabel}</td>
      </tr>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">1 — Indicadores de Qualidade (KPIs)</div>
    <table style="margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Indicador</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:80px;">Meta</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:140px;">Valor</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:50px;">Status</th>
        </tr>
      </thead>
      <tbody>${kpiHtml}</tbody>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">2 — Não Conformidades</div>
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">NCs em aberto</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_nc_open ?? 0}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">NCs encerradas no mês</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_nc_closed_month ?? 0}</td>
      </tr>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">3 — Ensaios</div>
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">Taxa de conformidade</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_tests_pass_rate !== null ? report.kpi_tests_pass_rate + "%" : "—"}</td>
      </tr>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">4 — Materiais (PAME)</div>
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">Aprovados</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_mat_approved ?? 0}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">Pendentes</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_mat_pending ?? 0}</td>
      </tr>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">5 — Hold Points (HPs)</div>
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">Notificados</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_hp_total ?? 0}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;background:#f3f4f6;">Confirmados</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${report.kpi_hp_approved ?? 0}</td>
      </tr>
    </table>

    ${(() => {
      if (!testsData) return "";
      const td = testsData;
      const concreteRate = td.concreteLots > 0 ? Math.round((td.concreteConform / td.concreteLots) * 100) : 0;
      const soilRate = td.soilsTotal > 0 ? Math.round((td.soilsConform / td.soilsTotal) * 100) : 0;
      const compRate = td.compactionTotal > 0 ? Math.round((td.compactionConform / td.compactionTotal) * 100) : 0;
      return `
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">6 — Ensaios e Controlo de Qualidade</div>
        <table style="margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Módulo</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;">Total</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;">Conformes</th>
            <th style="padding:6px 8px;border:1px solid #d1d5db;">%</th>
          </tr>
          <tr>
            <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">Betão (amassadas/lotes)</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.concreteBatches} / ${td.concreteLots}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.concreteConform}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:700;">${concreteRate}%</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">Soldaduras</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.weldsTotal}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.weldsWithUT} com US</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:700;">${td.weldsTotal > 0 ? Math.round((td.weldsWithUT / td.weldsTotal) * 100) : 0}%</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">Solos</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.soilsTotal}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.soilsConform}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:700;">${soilRate}%</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">Compactação</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.compactionTotal}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${td.compactionConform}</td>
            <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:700;">${compRate}%</td>
          </tr>
        </table>
      `;
    })()}

    ${textSection("7 — Observações", report.observations)}
    ${textSection("8 — Acções Correctivas", report.corrective_actions)}
    ${textSection("9 — Plano para o Próximo Mês", report.next_month_plan)}

    <div style="display:flex;justify-content:space-between;margin-top:40px;">
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Elaborado por (GQ)</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Aprovado por (DO)</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;padding:8px;">
    Atlas QMS · CE Cláusula 35.ª §11 · Gerado em ${new Date().toLocaleString("pt-PT")}
  </div>
</body></html>`;

    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  },
};

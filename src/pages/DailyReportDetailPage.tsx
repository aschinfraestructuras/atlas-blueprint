import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Send, CheckCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useReportMeta } from "@/hooks/useReportMeta";
import {
  dailyReportService,
  type DailyReport, type LabourRow, type EquipmentRow, type MaterialRow, type RmmRow, type WasteRow,
} from "@/lib/services/dailyReportService";
import {
  generatePdfDocument, printHtml, infoGridHtml, buildReportFilename,
  type ReportLabels,
} from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  validated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const meta = useReportMeta();

  const [report, setReport] = useState<DailyReport | null>(null);
  const [labour, setLabour] = useState<LabourRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [rmm, setRmm] = useState<RmmRow[]>([]);
  const [waste, setWaste] = useState<WasteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [dr, lb, eq, mt, rm, ws] = await Promise.all([
        dailyReportService.getById(id),
        dailyReportService.getLabour(id),
        dailyReportService.getEquipment(id),
        dailyReportService.getMaterials(id),
        dailyReportService.getRmm(id),
        dailyReportService.getWaste(id),
      ]);
      setReport(dr); setLabour(lb); setEquipment(eq); setMaterials(mt); setRmm(rm); setWaste(ws);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // ── Quick add helpers ───────────────────────────────────────────────────
  const addLabourRow = async () => {
    if (!id) return;
    await dailyReportService.addLabour({ daily_report_id: id, category: "Servente", name: null, time_start: null, time_end: null, hours_worked: null });
    setLabour(await dailyReportService.getLabour(id));
  };
  const addEquipmentRow = async () => {
    if (!id) return;
    await dailyReportService.addEquipment({ daily_report_id: id, designation: "Equipamento", type: null, serial_number: null, sound_power_db: null, hours_worked: null });
    setEquipment(await dailyReportService.getEquipment(id));
  };
  const addMaterialRow = async () => {
    if (!id) return;
    await dailyReportService.addMaterial({ daily_report_id: id, nomenclature: "Material", quantity: null, unit: null, lot_number: null });
    setMaterials(await dailyReportService.getMaterials(id));
  };
  const addRmmRow = async () => {
    if (!id) return;
    await dailyReportService.addRmm({ daily_report_id: id, designation: "Instrumento", internal_code: null });
    setRmm(await dailyReportService.getRmm(id));
  };
  const addWasteRow = async () => {
    if (!id) return;
    await dailyReportService.addWaste({ daily_report_id: id, type: "Resíduo", packaging_type: null, quantity: null, unit: null, preliminary_storage: null, final_destination: null });
    setWaste(await dailyReportService.getWaste(id));
  };

  const deleteRow = async (table: string, rowId: string) => {
    if (!id) return;
    switch (table) {
      case "labour": await dailyReportService.deleteLabour(rowId); setLabour(await dailyReportService.getLabour(id)); break;
      case "equipment": await dailyReportService.deleteEquipment(rowId); setEquipment(await dailyReportService.getEquipment(id)); break;
      case "materials": await dailyReportService.deleteMaterial(rowId); setMaterials(await dailyReportService.getMaterials(id)); break;
      case "rmm": await dailyReportService.deleteRmm(rowId); setRmm(await dailyReportService.getRmm(id)); break;
      case "waste": await dailyReportService.deleteWaste(rowId); setWaste(await dailyReportService.getWaste(id)); break;
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!id) return;
    await dailyReportService.submit(id);
    toast({ title: t("dailyReports.toast.submitted") });
    reload();
  };
  const handleValidate = async () => {
    if (!id) return;
    await dailyReportService.validate(id);
    toast({ title: t("dailyReports.toast.validated") });
    reload();
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPdf = () => {
    if (!report || !meta) return;
    const labels: ReportLabels = { appName: "ATLAS QMS", reportTitle: "PARTE DIÁRIA DE OBRA — IP.MOD.102", generatedOn: t("common.date") };

    const sectionHtml = (title: string, content: string) =>
      `<div class="atlas-section">${title}</div>${content}`;

    const tableHtml = (headers: string[], rows: string[][]) =>
      `<table class="atlas-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

    const body = [
      sectionHtml(t("dailyReports.sections.identification"), infoGridHtml([
        [t("dailyReports.fields.reportNumber"), report.report_number],
        [t("dailyReports.fields.reportDate"), report.report_date],
        [t("dailyReports.fields.weather"), report.weather ?? "—"],
        ["Temp.", `${report.temperature_min ?? "—"}°C / ${report.temperature_max ?? "—"}°C`],
        [t("dailyReports.fields.foremanName"), report.foreman_name ?? "—"],
        [t("dailyReports.fields.contractorRep"), report.contractor_rep ?? "—"],
      ])),
      sectionHtml(t("dailyReports.sections.works"), `<p style="padding:6px 0;">${report.observations ?? "—"}</p>`),
      sectionHtml(t("dailyReports.sections.labour"), tableHtml(
        [t("dailyReports.labour.category"), t("dailyReports.labour.name"), t("dailyReports.labour.timeStart"), t("dailyReports.labour.timeEnd"), t("dailyReports.labour.hours")],
        labour.map(r => [r.category, r.name ?? "", r.time_start ?? "", r.time_end ?? "", String(r.hours_worked ?? "")])
      )),
      sectionHtml(t("dailyReports.sections.equipment"), tableHtml(
        [t("dailyReports.equipment.designation"), t("dailyReports.equipment.type"), t("dailyReports.equipment.serial"), t("dailyReports.equipment.soundPower"), t("dailyReports.equipment.hours")],
        equipment.map(r => [r.designation, r.type ?? "", r.serial_number ?? "", String(r.sound_power_db ?? ""), String(r.hours_worked ?? "")])
      )),
      sectionHtml(t("dailyReports.sections.materials"), tableHtml(
        [t("dailyReports.materials.nomenclature"), t("dailyReports.materials.quantity"), t("dailyReports.materials.unit"), t("dailyReports.materials.lot")],
        materials.map(r => [r.nomenclature, String(r.quantity ?? ""), r.unit ?? "", r.lot_number ?? ""])
      )),
      sectionHtml(t("dailyReports.sections.rmm"), tableHtml(
        [t("dailyReports.rmm.code"), t("dailyReports.rmm.designation")],
        rmm.map(r => [r.internal_code ?? "", r.designation])
      )),
      sectionHtml(t("dailyReports.sections.waste"), tableHtml(
        [t("dailyReports.waste.type"), t("dailyReports.waste.packaging"), t("dailyReports.waste.quantity"), t("dailyReports.waste.unit"), t("dailyReports.waste.storage"), t("dailyReports.waste.destination")],
        waste.map(r => [r.type, r.packaging_type ?? "", String(r.quantity ?? ""), r.unit ?? "", r.preliminary_storage ?? "", r.final_destination ?? ""])
      )),
      // Signatures block
      `<div class="atlas-section">${t("dailyReports.sections.observations")}</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:12px;">
         ${[
           [t("dailyReports.signatures.foreman"), report.foreman_name],
           [t("dailyReports.signatures.contractor"), report.contractor_rep],
           [t("dailyReports.signatures.supervisor"), report.supervisor_rep],
           [t("dailyReports.signatures.ip"), report.ip_rep],
         ].map(([label, name]) =>
           `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
             <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">${label}</div>
             <div style="font-size:11px;margin-bottom:20px;">${name ?? "—"}</div>
             <div style="border-top:1px solid #d1d5db;padding-top:4px;font-size:8px;color:#9ca3af;">Data: ______/______/______&nbsp;&nbsp;&nbsp;Assinatura: _______________________</div>
           </div>`
         ).join("")}
       </div>`,
    ].join("");

    const html = generatePdfDocument({
      title: `Parte Diária ${report.report_number}`,
      labels,
      meta,
      bodyHtml: body,
      footerRef: `IP.MOD.102 · ${report.report_number}`,
    });
    printHtml(html, buildReportFilename("PD", meta.projectCode, report.report_number));
  };

  if (loading || !report) return <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>;

  const isDraft = report.status === "draft";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/daily-reports")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{report.report_number}</h1>
          <p className="text-sm text-muted-foreground">{report.report_date} · IP.MOD.102</p>
        </div>
        <Badge className={STATUS_COLORS[report.status]}>{t(`dailyReports.status.${report.status}`)}</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="h-4 w-4 mr-1" /> {t("common.exportPdf")}
          </Button>
          {report.status === "draft" && (
            <Button size="sm" onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-1" /> {t("dailyReports.status.submitted")}
            </Button>
          )}
          {report.status === "submitted" && (
            <Button size="sm" onClick={handleValidate}>
              <CheckCircle className="h-4 w-4 mr-1" /> {t("dailyReports.status.validated")}
            </Button>
          )}
        </div>
      </div>

      {/* Section 1: Identification */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("dailyReports.sections.identification")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoCell label={t("dailyReports.fields.reportNumber")} value={report.report_number} />
            <InfoCell label={t("dailyReports.fields.reportDate")} value={report.report_date} />
            <InfoCell label={t("dailyReports.fields.weather")} value={report.weather} />
            <InfoCell label={t("dailyReports.fields.tempMin")} value={report.temperature_min != null ? `${report.temperature_min}°C` : null} />
            <InfoCell label={t("dailyReports.fields.tempMax")} value={report.temperature_max != null ? `${report.temperature_max}°C` : null} />
            <InfoCell label={t("dailyReports.fields.foremanName")} value={report.foreman_name} />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Works */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("dailyReports.sections.works")}</CardTitle></CardHeader>
        <CardContent>
          {isDraft ? (
            <Textarea
              defaultValue={report.observations ?? ""}
              onBlur={e => dailyReportService.update(report.id, { observations: e.target.value }).then(reload)}
              rows={4}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{report.observations ?? "—"}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Labour */}
      <SectionTable
        title={t("dailyReports.sections.labour")}
        headers={[t("dailyReports.labour.category"), t("dailyReports.labour.name"), t("dailyReports.labour.timeStart"), t("dailyReports.labour.timeEnd"), t("dailyReports.labour.hours"), ""]}
        rows={labour.map(r => [r.category, r.name ?? "—", r.time_start ?? "—", r.time_end ?? "—", r.hours_worked != null ? String(r.hours_worked) : "—",
          isDraft ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow("labour", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null
        ])}
        onAdd={isDraft ? addLabourRow : undefined}
      />

      {/* Section 4: Equipment */}
      <SectionTable
        title={t("dailyReports.sections.equipment")}
        headers={[t("dailyReports.equipment.designation"), t("dailyReports.equipment.type"), t("dailyReports.equipment.serial"), t("dailyReports.equipment.soundPower"), t("dailyReports.equipment.hours"), ""]}
        rows={equipment.map(r => [r.designation, r.type ?? "—", r.serial_number ?? "—", r.sound_power_db != null ? String(r.sound_power_db) : "—", r.hours_worked != null ? String(r.hours_worked) : "—",
          isDraft ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow("equipment", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null
        ])}
        onAdd={isDraft ? addEquipmentRow : undefined}
      />

      {/* Section 5: Materials */}
      <SectionTable
        title={t("dailyReports.sections.materials")}
        headers={[t("dailyReports.materials.nomenclature"), t("dailyReports.materials.quantity"), t("dailyReports.materials.unit"), t("dailyReports.materials.lot"), ""]}
        rows={materials.map(r => [r.nomenclature, r.quantity != null ? String(r.quantity) : "—", r.unit ?? "—", r.lot_number ?? "—",
          isDraft ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow("materials", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null
        ])}
        onAdd={isDraft ? addMaterialRow : undefined}
      />

      {/* Section 6: RMM */}
      <SectionTable
        title={t("dailyReports.sections.rmm")}
        headers={[t("dailyReports.rmm.code"), t("dailyReports.rmm.designation"), ""]}
        rows={rmm.map(r => [r.internal_code ?? "—", r.designation,
          isDraft ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow("rmm", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null
        ])}
        onAdd={isDraft ? addRmmRow : undefined}
      />

      {/* Section 7: Waste */}
      <SectionTable
        title={t("dailyReports.sections.waste")}
        headers={[t("dailyReports.waste.type"), t("dailyReports.waste.packaging"), t("dailyReports.waste.quantity"), t("dailyReports.waste.unit"), t("dailyReports.waste.storage"), t("dailyReports.waste.destination"), ""]}
        rows={waste.map(r => [r.type, r.packaging_type ?? "—", r.quantity != null ? String(r.quantity) : "—", r.unit ?? "—", r.preliminary_storage ?? "—", r.final_destination ?? "—",
          isDraft ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow("waste", r.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null
        ])}
        onAdd={isDraft ? addWasteRow : undefined}
      />

      {/* Section 8: Signatures */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t("dailyReports.sections.observations")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t("dailyReports.signatures.foreman"), value: report.foreman_name, field: "signed_contractor" },
              { label: t("dailyReports.signatures.contractor"), value: report.contractor_rep, field: "signed_contractor" },
              { label: t("dailyReports.signatures.supervisor"), value: report.supervisor_rep, field: "signed_supervisor" },
              { label: t("dailyReports.signatures.ip"), value: report.ip_rep, field: "signed_ip" },
            ].map(({ label, value }) => (
              <div key={label} className="border rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-sm mt-1">{value ?? "—"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function SectionTable({ title, headers, rows, onAdd }: {
  title: string;
  headers: string[];
  rows: (string | React.ReactNode | null)[][];
  onAdd?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("common.create")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={headers.length} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
            ) : rows.map((cells, i) => (
              <TableRow key={i}>
                {cells.map((c, j) => <TableCell key={j}>{c}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

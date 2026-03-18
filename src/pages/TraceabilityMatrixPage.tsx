import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useReportMeta } from "@/hooks/useReportMeta";
import { traceabilityService, type TraceabilityRow } from "@/lib/services/traceabilityService";
import { exportTraceabilityCsv, exportTraceabilityPdf, type TraceabilityExportLabels } from "@/lib/services/traceabilityExportService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { Link2, Search, Package, Truck, FlaskConical, ClipboardCheck, Construction, Layers } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-chart-2/15 text-chart-2",
  pass: "bg-chart-2/15 text-chart-2",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/15 text-primary",
  submitted: "bg-accent text-accent-foreground",
  fail: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  quarantine: "bg-accent text-accent-foreground",
};

function StatusBadge({ status, label }: { status: string | null; label?: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant="secondary" className={cn("text-[10px]", STATUS_COLORS[status] ?? "")}>
      {label ?? status}
    </Badge>
  );
}

export default function TraceabilityMatrixPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const reportMeta = useReportMeta();
  const navigate = useNavigate();
  const [data, setData] = useState<TraceabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("__all__");
  const [filterPame, setFilterPame] = useState("__all__");
  const [filterLotStatus, setFilterLotStatus] = useState("__all__");
  const [filterTestResult, setFilterTestResult] = useState("__all__");
  const [filterCompleteness, setFilterCompleteness] = useState("__all__");

  const fetch = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const rows = await traceabilityService.getMatrix(activeProject.id);
      setData(rows);
    } catch (err) {
      console.error("Traceability fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  // Unique values for filters
  const suppliers = useMemo(() => [...new Set(data.filter(r => r.supplier_name).map(r => r.supplier_name!))].sort(), [data]);
  const pameStatuses = useMemo(() => [...new Set(data.filter(r => r.pame_status).map(r => r.pame_status!))].sort(), [data]);

  const filtered = useMemo(() => {
    let list = data;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        [r.material_code, r.material_name, r.supplier_name, r.lot_code, r.test_code, r.ppi_code, r.work_item_code, r.work_item_name]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (filterSupplier !== "__all__") list = list.filter(r => r.supplier_name === filterSupplier);
    if (filterPame !== "__all__") list = list.filter(r => r.pame_status === filterPame);
    if (filterLotStatus !== "__all__") list = list.filter(r => r.lot_reception_status === filterLotStatus);
    if (filterTestResult !== "__all__") {
      if (filterTestResult === "pass") list = list.filter(r => r.test_pass_fail === "pass");
      else if (filterTestResult === "fail") list = list.filter(r => r.test_pass_fail === "fail");
      else if (filterTestResult === "pending") list = list.filter(r => r.test_result_id && !r.test_pass_fail);
      else if (filterTestResult === "none") list = list.filter(r => !r.test_result_id);
    }
    if (filterCompleteness !== "__all__") {
      if (filterCompleteness === "full") list = list.filter(r => r.lot_id && r.test_result_id && r.work_item_id);
      else if (filterCompleteness === "partial") list = list.filter(r => (r.lot_id || r.test_result_id) && !(r.lot_id && r.test_result_id && r.work_item_id));
      else if (filterCompleteness === "none") list = list.filter(r => !r.lot_id && !r.test_result_id);
    }
    return list;
  }, [data, search, filterSupplier, filterPame, filterLotStatus, filterTestResult, filterCompleteness]);

  if (!activeProject) return <NoProjectBanner />;

  // KPIs
  const total = data.length;
  const withLot = data.filter(r => r.lot_id).length;
  const withTest = data.filter(r => r.test_result_id).length;
  const withPPI = data.filter(r => r.ppi_instance_id).length;
  const fullyTraced = data.filter(r => r.lot_id && r.test_result_id && r.work_item_id).length;

  // Export labels
  const exportLabels: TraceabilityExportLabels = {
    title: t("traceability.title"),
    generatedOn: t("common.generatedOn", { defaultValue: "Gerado em" }),
    project: t("common.project", { defaultValue: "Projeto" }),
    material: t("traceability.col.material"),
    materialName: t("traceability.col.materialName", { defaultValue: "Designação" }),
    pame: t("traceability.col.pame"),
    supplier: t("traceability.col.supplier"),
    lot: t("traceability.col.lot"),
    lotStatus: t("traceability.col.lotStatus"),
    ce: t("traceability.col.ce"),
    test: t("traceability.col.test"),
    testResult: t("traceability.col.testResult"),
    ppi: t("traceability.col.ppi"),
    workItem: t("traceability.col.workItem"),
    total: t("traceability.kpi.materials"),
    fullyTraced: t("traceability.kpi.fullyTraced"),
  };

  const meta = {
    projectName: reportMeta?.projectName ?? activeProject.name,
    projectCode: reportMeta?.projectCode ?? activeProject.code ?? "PROJ",
    locale: reportMeta?.locale ?? "pt",
  };

  const handleExport = (fmt: "csv" | "pdf") => {
    if (fmt === "csv") exportTraceabilityCsv(filtered, exportLabels, meta);
    else exportTraceabilityPdf(filtered, exportLabels, meta, logoBase64);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t("traceability.title")}
          subtitle={t("traceability.subtitle")}
          icon={Link2}
        />
        <ReportExportMenu options={[
          { label: "CSV", icon: "csv", action: () => handleExport("csv") },
          { label: "PDF", icon: "pdf", action: () => handleExport("pdf") },
        ]} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: Package, label: t("traceability.kpi.materials"), value: total },
          { icon: Layers, label: t("traceability.kpi.withLot"), value: withLot },
          { icon: FlaskConical, label: t("traceability.kpi.withTest"), value: withTest },
          { icon: ClipboardCheck, label: t("traceability.kpi.withPPI"), value: withPPI },
          { icon: Link2, label: t("traceability.kpi.fullyTraced"), value: fullyTraced, highlight: true },
        ].map((kpi, i) => (
          <Card key={i} className="border-0 bg-card shadow-card">
            <CardContent className="p-3 text-center">
              <kpi.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
              <p className={cn("text-xl font-black tabular-nums mt-1", kpi.highlight ? "text-primary" : "text-foreground")}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("traceability.searchPlaceholder")}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {suppliers.length > 0 && (
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder={t("traceability.filter.supplier", { defaultValue: "Fornecedor" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("traceability.filter.allSuppliers", { defaultValue: "Todos fornecedores" })}</SelectItem>
              {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {pameStatuses.length > 0 && (
          <Select value={filterPame} onValueChange={setFilterPame}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="PAME" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("traceability.filter.allPame", { defaultValue: "Todos PAME" })}</SelectItem>
              {pameStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterTestResult} onValueChange={setFilterTestResult}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder={t("traceability.filter.testResult", { defaultValue: "Ensaio" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("traceability.filter.allTests", { defaultValue: "Todos ensaios" })}</SelectItem>
            <SelectItem value="pass">{t("traceability.filter.pass", { defaultValue: "✓ Conforme" })}</SelectItem>
            <SelectItem value="fail">{t("traceability.filter.fail", { defaultValue: "✗ Não conforme" })}</SelectItem>
            <SelectItem value="pending">{t("traceability.filter.pending", { defaultValue: "Pendente" })}</SelectItem>
            <SelectItem value="none">{t("traceability.filter.noTest", { defaultValue: "Sem ensaio" })}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCompleteness} onValueChange={setFilterCompleteness}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("traceability.filter.completeness", { defaultValue: "Completude" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("traceability.filter.allCompleteness", { defaultValue: "Todos" })}</SelectItem>
            <SelectItem value="full">{t("traceability.filter.full", { defaultValue: "Rastreio completo" })}</SelectItem>
            <SelectItem value="partial">{t("traceability.filter.partial", { defaultValue: "Parcial" })}</SelectItem>
            <SelectItem value="none">{t("traceability.filter.incomplete", { defaultValue: "Sem rastreio" })}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Results count */}
      {filtered.length !== total && (
        <p className="text-xs text-muted-foreground">
          {t("traceability.showingFiltered", { count: filtered.length, total, defaultValue: `A mostrar ${filtered.length} de ${total} materiais` })}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Link2} subtitleKey="traceability.empty" />
      ) : (
        <Card className="border-0 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="sticky left-0 bg-muted/30 z-10 min-w-[120px]">
                    <div className="flex items-center gap-1"><Package className="h-3 w-3" />{t("traceability.col.material")}</div>
                  </TableHead>
                  <TableHead className="min-w-[90px]">{t("traceability.col.pame")}</TableHead>
                  <TableHead className="min-w-[130px]">
                    <div className="flex items-center gap-1"><Truck className="h-3 w-3" />{t("traceability.col.supplier")}</div>
                  </TableHead>
                  <TableHead className="min-w-[110px]">
                    <div className="flex items-center gap-1"><Layers className="h-3 w-3" />{t("traceability.col.lot")}</div>
                  </TableHead>
                  <TableHead className="min-w-[80px]">{t("traceability.col.lotStatus")}</TableHead>
                  <TableHead className="min-w-[80px]">{t("traceability.col.ce")}</TableHead>
                  <TableHead className="min-w-[110px]">
                    <div className="flex items-center gap-1"><FlaskConical className="h-3 w-3" />{t("traceability.col.test")}</div>
                  </TableHead>
                  <TableHead className="min-w-[80px]">{t("traceability.col.testResult")}</TableHead>
                  <TableHead className="min-w-[110px]">
                    <div className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />{t("traceability.col.ppi")}</div>
                  </TableHead>
                  <TableHead className="min-w-[130px]">
                    <div className="flex items-center gap-1"><Construction className="h-3 w-3" />{t("traceability.col.workItem")}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.material_id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="sticky left-0 bg-card z-10">
                      <button className="text-xs font-mono text-primary underline-offset-2 hover:underline" onClick={() => navigate(`/materials/${row.material_id}`)}>
                        {row.material_code}
                      </button>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{row.material_name}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={row.pame_status} /></TableCell>
                    <TableCell>
                      {row.supplier_id ? (
                        <button className="text-xs text-primary hover:underline underline-offset-2" onClick={() => navigate(`/suppliers/${row.supplier_id}`)}>
                          {row.supplier_name}
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.lot_code ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={row.lot_reception_status} /></TableCell>
                    <TableCell className="text-xs">
                      {row.lot_ce_marking === null ? "—" : row.lot_ce_marking ? "✅" : "❌"}
                    </TableCell>
                    <TableCell>
                      {row.test_code ? (
                        <button className="text-xs font-mono text-primary hover:underline underline-offset-2" onClick={() => navigate(`/tests`)}>
                          {row.test_code}
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={row.test_pass_fail ?? row.test_status} /></TableCell>
                    <TableCell>
                      {row.ppi_code ? (
                        <button className="text-xs font-mono text-primary hover:underline underline-offset-2" onClick={() => navigate(`/ppi/${row.ppi_instance_id}`)}>
                          {row.ppi_code}
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      {row.work_item_id ? (
                        <button className="text-xs text-primary hover:underline underline-offset-2" onClick={() => navigate(`/work-items/${row.work_item_id}`)}>
                          {row.work_item_code ?? "WI"} — {row.work_item_name ?? ""}
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

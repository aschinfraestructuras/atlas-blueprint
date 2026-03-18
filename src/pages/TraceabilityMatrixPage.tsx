import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { traceabilityService, type TraceabilityRow } from "@/lib/services/traceabilityService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const navigate = useNavigate();
  const [data, setData] = useState<TraceabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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

  if (!activeProject) return <NoProjectBanner />;

  const filtered = data.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.material_code, r.material_name, r.supplier_name, r.lot_code, r.test_code, r.ppi_code, r.work_item_code, r.work_item_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  // KPIs
  const total = data.length;
  const withLot = data.filter(r => r.lot_id).length;
  const withTest = data.filter(r => r.test_result_id).length;
  const withPPI = data.filter(r => r.ppi_instance_id).length;
  const fullyTraced = data.filter(r => r.lot_id && r.test_result_id && r.work_item_id).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title={t("traceability.title")}
        subtitle={t("traceability.subtitle")}
        icon={Link2}
      />

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("traceability.searchPlaceholder")}
          className="pl-9"
        />
      </div>

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

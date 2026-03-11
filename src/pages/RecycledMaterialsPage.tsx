import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Leaf, Plus, Search, Hash, CheckCircle, Clock, Percent } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { useProject } from "@/contexts/ProjectContext";
import { useArchivedProject } from "@/hooks/useArchivedProject";
import { useRecycledMaterials } from "@/hooks/useRecycledMaterials";
import { RecycledMaterialFormDialog } from "@/components/recycled/RecycledMaterialFormDialog";
import { RecycledMaterialDetailSheet } from "@/components/recycled/RecycledMaterialDetailSheet";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PPGRCD_TARGET = 5; // 5% recycled target

export default function RecycledMaterialsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const isArchived = useArchivedProject();
  const { data, loading, stats, refetch } = useRecycledMaterials();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = data;
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
    if (typeFilter !== "all") list = list.filter(r => r.reference_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.material_name.toLowerCase().includes(q) ||
        r.reference_number.toLowerCase().includes(q) ||
        (r.supplier_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, statusFilter, typeFilter, search]);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 p-6">
      {isArchived && <ArchivedBanner />}

      <PageHeader
        icon={Leaf}
        title={t("recycled.title")}
        subtitle={t("recycled.subtitle")}
        actions={!isArchived ? (
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {t("recycled.new")}
          </Button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ModuleKPICard label={t("recycled.kpi.total")} value={stats.total} icon={Hash} />
        <ModuleKPICard label={t("recycled.kpi.avgPct")} value={`${stats.avgPct}%`} icon={Percent} />
        <ModuleKPICard label={t("recycled.kpi.approved")} value={stats.approved} icon={CheckCircle} />
        <ModuleKPICard label={t("recycled.kpi.pending")} value={stats.pending} icon={Clock} />
      </div>

      {/* PPGRCD Target Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("recycled.kpi.target")}</span>
            <span className="text-sm font-bold tabular-nums">{stats.avgPct}% / {PPGRCD_TARGET}%</span>
          </div>
          <Progress value={Math.min((stats.avgPct / PPGRCD_TARGET) * 100, 100)} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("recycled.filters.allTypes")}</SelectItem>
            <SelectItem value="FAM">FAM</SelectItem>
            <SelectItem value="PAP">PAP</SelectItem>
            <SelectItem value="BAM">BAM</SelectItem>
            <SelectItem value="OUTRO">{t("recycled.types.OUTRO")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.status")}: All</SelectItem>
            <SelectItem value="pending">{t("recycled.status.pending")}</SelectItem>
            <SelectItem value="submitted">{t("recycled.status.submitted")}</SelectItem>
            <SelectItem value="approved">{t("recycled.status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("recycled.status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <EmptyState titleKey="common.noData" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recycled.fields.referenceNumber")}</TableHead>
                  <TableHead>{t("recycled.fields.materialName")}</TableHead>
                  <TableHead>{t("recycled.fields.supplier")}</TableHead>
                  <TableHead className="text-right">{t("recycled.fields.recycledPct")}</TableHead>
                  <TableHead className="text-right">{t("recycled.fields.quantityPlanned")}</TableHead>
                  <TableHead className="text-right">{t("recycled.fields.quantityUsed")}</TableHead>
                  <TableHead>{t("recycled.fields.documentRef")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(r.id)}>
                    <TableCell className="font-mono text-xs">{r.reference_number}</TableCell>
                    <TableCell className="font-medium">{r.material_name}</TableCell>
                    <TableCell>{r.supplier_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.recycled_content_pct != null ? `${r.recycled_content_pct}%` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantity_planned != null ? `${r.quantity_planned} ${r.unit ?? ""}` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantity_used != null ? `${r.quantity_used} ${r.unit ?? ""}` : "—"}</TableCell>
                    <TableCell className="text-xs">{r.document_ref ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status] ?? ""} variant="secondary">
                        {t(`recycled.status.${r.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecycledMaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={refetch} />
      <RecycledMaterialDetailSheet open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null); }} materialId={detailId} onUpdated={refetch} />
    </div>
  );
}

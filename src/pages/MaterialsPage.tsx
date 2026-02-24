import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjectRole } from "@/hooks/useProjectRole";
import { materialService } from "@/lib/services/materialService";
import { Package, Plus, Pencil, Search, Archive, RotateCcw, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/services/materialService";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  discontinued: "bg-accent text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
};

const CATEGORIES = [
  "betao", "aco", "solos", "agregado", "mbc", "pintura",
  "geossintetico", "soldadura", "tubagem", "prefabricado", "outro",
];

export default function MaterialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: materials, kpis, loading, error, refetch } = useMaterials();
  const { canCreate, canEdit } = useProjectRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = useMemo(() => {
    let result = materials;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.specification ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter(m => m.status === filterStatus);
    if (filterCategory !== "all") result = result.filter(m => m.category === filterCategory);
    return result;
  }, [materials, search, filterStatus, filterCategory]);

  if (!activeProject) return <NoProjectBanner />;

  const handleEdit = (m: Material) => { setEditingMaterial(m); setDialogOpen(true); };
  const handleNew = () => { setEditingMaterial(null); setDialogOpen(true); };
  const handleArchive = async (m: Material) => {
    try {
      if (m.status === "archived") {
        await materialService.activate(m.id, activeProject.id);
        toast({ title: t("materials.toast.activated") });
      } else {
        await materialService.archive(m.id, activeProject.id);
        toast({ title: t("materials.toast.archived") });
      }
      refetch();
    } catch { toast({ title: t("materials.toast.error"), variant: "destructive" }); }
  };

  const exportHeaders = [t("materials.table.code"), t("common.name"), t("materials.form.category"), t("materials.form.specification"), t("materials.form.unit"), t("common.status")];
  const exportRows = filtered.map(m => [
    m.code, m.name,
    t(`materials.categories.${m.category}`, { defaultValue: m.category }),
    m.specification ?? "", m.unit ?? "",
    t(`materials.status.${m.status}`),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.materials.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.materials.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ReportExportMenu
            options={[{
              label: "CSV", icon: "csv" as const,
              action: () => {
                const csv = [exportHeaders.join(";"), ...exportRows.map(r => r.join(";"))].join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `MAT_${activeProject.code ?? "PROJ"}.csv`; a.click(); URL.revokeObjectURL(url);
              },
            }]}
          />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("materials.newMaterial")}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("materials.kpi.total"), value: kpis.materials_total },
            { label: t("materials.kpi.active"), value: kpis.materials_active },
            { label: t("materials.kpi.discontinued"), value: kpis.materials_discontinued },
            { label: t("materials.kpi.docsExpired"), value: kpis.materials_with_expired_docs },
            { label: t("materials.kpi.withOpenNC"), value: kpis.materials_with_open_nc },
            { label: t("materials.kpi.nonconformTests"), value: kpis.materials_with_nonconform_tests_30d },
          ].map((k, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-black tabular-nums mt-1 text-foreground">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t("materials.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("materials.filters.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("materials.status.active")}</SelectItem>
            <SelectItem value="discontinued">{t("materials.status.discontinued")}</SelectItem>
            <SelectItem value="archived">{t("materials.status.archived")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("materials.filters.allCategories")}</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{t(`materials.categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} subtitleKey="emptyState.materials.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.form.category")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.form.specification")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.form.unit")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/materials/${m.id}`)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.code}</TableCell>
                  <TableCell className="font-medium text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {m.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t(`materials.categories.${m.category}`, { defaultValue: m.category })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.specification ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.unit ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[m.status] ?? "")}>{t(`materials.status.${m.status}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/materials/${m.id}`)} title={t("common.view")}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(m)} title={t("common.edit")}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleArchive(m)} title={m.status === "archived" ? t("materials.actions.activate") : t("materials.actions.archive")}>
                            {m.status === "archived" ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} material={editingMaterial} onSuccess={refetch} />
    </div>
  );
}

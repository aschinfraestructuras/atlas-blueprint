import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjectRole } from "@/hooks/useProjectRole";
import { materialService } from "@/lib/services/materialService";
import { Package, Plus, Pencil, Search, Archive, RotateCcw, Eye, Trash2, PieChart as PieChartIcon } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/services/materialService";
import MapMasPage from "@/pages/MapMasPage";

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
  const [activeTab, setActiveTab] = useState("materials");

  const [filterApproval, setFilterApproval] = useState("all");

  const filtered = useMemo(() => {
    let result = materials;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.specification ?? "").toLowerCase().includes(q) ||
        (m.normative_refs ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter(m => m.status === filterStatus);
    if (filterCategory !== "all") result = result.filter(m => m.category === filterCategory);
    if (filterApproval !== "all") result = result.filter(m => m.approval_status === filterApproval);
    return result;
  }, [materials, search, filterStatus, filterCategory, filterApproval]);

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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="materials">{t("pages.materials.title")}</TabsTrigger>
          <TabsTrigger value="pame">{t("materials.pame.title", { defaultValue: "Plano PAME" })}</TabsTrigger>
          <TabsTrigger value="mapmas">{t("mapMas.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-6 mt-4">
          <div className="flex items-center justify-end gap-2">
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

          {/* KPI Cards + Charts */}
          {kpis && (
            <>
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

              {/* Distribution charts */}
              {materials.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="border shadow-none">
                    <CardContent className="pt-4 pb-4 px-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
                        <PieChartIcon className="h-3.5 w-3.5" />{t("materials.form.category")}
                      </p>
                      <ul className="space-y-1.5">
                        {(() => {
                          const catMap: Record<string, number> = {};
                          materials.forEach(m => { catMap[m.category] = (catMap[m.category] ?? 0) + 1; });
                          return Object.entries(catMap)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([k, v]) => (
                              <li key={k} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate">{t(`materials.categories.${k}`, { defaultValue: k })}</span>
                                <span className="font-bold tabular-nums text-foreground">{v}</span>
                              </li>
                            ));
                        })()}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-none">
                    <CardContent className="pt-4 pb-4 px-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
                        <Package className="h-3.5 w-3.5" />{t("materials.approval.mapMas")}
                      </p>
                      <ul className="space-y-1.5">
                        {(() => {
                          const statusMap: Record<string, number> = {};
                          materials.forEach(m => { statusMap[m.approval_status] = (statusMap[m.approval_status] ?? 0) + 1; });
                          return Object.entries(statusMap)
                            .sort((a, b) => b[1] - a[1])
                            .map(([k, v]) => (
                              <li key={k} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate">{t(`materials.approval.statuses.${k}`, { defaultValue: k })}</span>
                                <span className="font-bold tabular-nums text-foreground">{v}</span>
                              </li>
                            ));
                        })()}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
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
            <Select value={filterApproval} onValueChange={setFilterApproval}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("materials.filters.allApprovals")}</SelectItem>
                <SelectItem value="pending">{t("materials.approval.statuses.pending")}</SelectItem>
                <SelectItem value="submitted">{t("materials.approval.statuses.submitted")}</SelectItem>
                <SelectItem value="in_review">{t("materials.approval.statuses.in_review")}</SelectItem>
                <SelectItem value="approved">{t("materials.approval.statuses.approved")}</SelectItem>
                <SelectItem value="rejected">{t("materials.approval.statuses.rejected")}</SelectItem>
                <SelectItem value="conditional">{t("materials.approval.statuses.conditional")}</SelectItem>
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
            <EmptyState icon={Package} subtitleKey="emptyState.materials.subtitle" ctaKey="materials.newMaterial" onCta={handleNew} />
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
                     <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.approval.mapMas")}</TableHead>
                     <TableHead className="w-28" />
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
                         <Badge variant="secondary" className={cn("text-xs",
                           m.approval_status === "approved" ? "bg-chart-2/15 text-chart-2" :
                           m.approval_status === "rejected" ? "bg-destructive/10 text-destructive" :
                           m.approval_status === "conditional" ? "bg-amber-500/15 text-amber-600" :
                           m.approval_status === "in_review" ? "bg-primary/15 text-primary" : ""
                         )}>{t(`materials.approval.statuses.${m.approval_status}`, { defaultValue: m.approval_status })}</Badge>
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
        </TabsContent>

        <TabsContent value="mapmas" className="mt-4">
          <MapMasPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
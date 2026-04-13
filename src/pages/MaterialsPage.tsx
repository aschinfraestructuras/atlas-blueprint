import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { materialService } from "@/lib/services/materialService";
import { exportMaterialsListPdf } from "@/lib/services/materialExportService";
import {
  Package, Plus, Pencil, Search, Archive, RotateCcw, Eye, Trash2,
  PieChart as PieChartIcon, ShieldCheck, Clock, AlertTriangle, Ban,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/services/materialService";

const APPROVAL_BADGE: Record<string, { bg: string; icon: typeof ShieldCheck }> = {
  approved: { bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: ShieldCheck },
  pending: { bg: "bg-muted text-muted-foreground", icon: Clock },
  submitted: { bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock },
  in_review: { bg: "bg-primary/15 text-primary", icon: Clock },
  rejected: { bg: "bg-destructive/10 text-destructive", icon: Ban },
  conditional: { bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: AlertTriangle },
  quarantine: { bg: "bg-orange-500/15 text-orange-700 dark:text-orange-400", icon: AlertTriangle },
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
  const { canCreate, canEdit, canDelete, isManager, isAdmin } = useProjectRole();
  const { logoBase64 } = useProjectLogo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [activeTab, setActiveTab] = useState("materials");
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

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
    if (filterCategory !== "all") result = result.filter(m => m.category === filterCategory);
    if (filterApproval !== "all") result = result.filter(m =>
      m.approval_status === filterApproval || (m as any).pame_status === filterApproval
    );
    return result;
  }, [materials, search, filterCategory, filterApproval]);

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
  const handleDelete = async () => {
    if (!deleteTarget || !activeProject) return;
    try {
      await materialService.softDelete(deleteTarget.id, activeProject.id);
      toast({ title: t("common.deleted") });
      refetch();
    } catch { toast({ title: t("common.deleteError"), variant: "destructive" }); }
    finally { setDeleteTarget(null); }
  };

  const exportHeaders = [t("materials.table.code"), t("common.name"), t("materials.form.category"), t("materials.form.specification"), t("materials.form.unit"), t("common.status")];
  const exportRows = filtered.map(m => [
    m.code, m.name,
    t(`materials.categories.${m.category}`, { defaultValue: m.category }),
    m.specification ?? "", m.unit ?? "",
    t(`materials.status.${m.status}`),
  ]);

  // KPI counts
  const approvedCount = materials.filter(m => m.approval_status === "approved").length;
  const pendingCount = materials.filter(m => ["pending", "submitted", "in_review"].includes(m.approval_status)).length;
  const quarantineCount = materials.filter(m => (m as any).pame_status === "quarantine" || m.approval_status === "rejected").length;

  const getApprovalInfo = (m: Material) => {
    const status = (m as any).pame_status || m.approval_status || "pending";
    return APPROVAL_BADGE[status] ?? APPROVAL_BADGE.pending;
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.materials.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.materials.subtitle")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <ReportExportMenu
            options={[
              {
                label: "CSV", icon: "csv" as const,
                action: () => {
                  const csv = [exportHeaders.join(";"), ...exportRows.map(r => r.join(";"))].join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `MAT_${activeProject.code ?? "PROJ"}.csv`; a.click(); URL.revokeObjectURL(url);
                },
              },
              {
                label: "PDF", icon: "pdf" as const,
                action: () => exportMaterialsListPdf(filtered, activeProject.code ?? "PROJ", logoBase64, t),
              },
            ]}
          />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("materials.newMaterial")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="materials">{t("pages.materials.title")}</TabsTrigger>
          <TabsTrigger value="pame">{t("materials.pame.title", { defaultValue: "Plano PAME" })}</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-5 mt-4">
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("materials.kpi.total"), value: kpis?.materials_total ?? materials.length, icon: Package, color: "text-foreground" },
              { label: t("materials.approval.statuses.approved", { defaultValue: "Aprovados" }), value: approvedCount, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400" },
              { label: t("materials.approval.statuses.pending", { defaultValue: "Pendentes" }), value: pendingCount, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
              { label: t("materials.reception.status.quarantine", { defaultValue: "Quarentena" }), value: quarantineCount, icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400" },
            ].map((k, i) => (
              <Card key={i} className="border border-border/60 bg-card shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("rounded-xl bg-muted/60 p-2.5", k.color)}>
                    <k.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                    <p className={cn("text-2xl font-black tabular-nums", k.color)}>{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Sticky Filter Bar ── */}
          <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm">
            <FilterBar>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={t("materials.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder={t("common.status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("materials.filters.allApprovals", { defaultValue: "Todos estados" })}</SelectItem>
                  <SelectItem value="approved">{t("materials.approval.statuses.approved")}</SelectItem>
                  <SelectItem value="pending">{t("materials.approval.statuses.pending")}</SelectItem>
                  <SelectItem value="submitted">{t("materials.approval.statuses.submitted")}</SelectItem>
                  <SelectItem value="in_review">{t("materials.approval.statuses.in_review")}</SelectItem>
                  <SelectItem value="rejected">{t("materials.approval.statuses.rejected")}</SelectItem>
                  <SelectItem value="conditional">{t("materials.approval.statuses.conditional")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder={t("materials.form.category")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("materials.filters.allCategories")}</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{t(`materials.categories.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBar>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Package} subtitleKey="emptyState.materials.subtitle" ctaKey="materials.newMaterial" onCta={handleNew} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(m => {
                const approvalInfo = getApprovalInfo(m);
                const ApprovalIcon = approvalInfo.icon;
                return (
                  <Card
                    key={m.id}
                    className="border border-border/60 bg-card hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group"
                    onClick={() => navigate(`/materials/${m.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] text-muted-foreground">{m.code}</span>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", approvalInfo.bg)}>
                              <ApprovalIcon className="h-3 w-3" />
                              {t(`materials.approval.statuses.${(m as any).pame_status || m.approval_status}`, { defaultValue: m.approval_status })}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground truncate">{m.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(`materials.categories.${m.category}`, { defaultValue: m.category })}
                            {m.specification ? ` · ${m.specification}` : ""}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(m)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleArchive(m)}>
                              {m.status === "archived" ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {(canDelete || isManager || isAdmin) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: unit + status */}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                        {m.unit && (
                          <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{m.unit}</span>
                        )}
                        {m.status === "archived" && (
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                            {t("materials.status.archived")}
                          </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FAB — Registar Recepção (mobile) */}
          {canCreate && (
            <button
              onClick={handleNew}
              className="fixed bottom-20 right-4 z-50 lg:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              aria-label={t("materials.newMaterial")}
            >
              <Plus className="h-6 w-6" />
            </button>
          )}

          <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} material={editingMaterial} onSuccess={refetch} />
          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("materials.deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("materials.deleteConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="pame" className="mt-4">
          <PameTab materials={materials} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── PAME Tab ─────────────────────────────────────────────────────────────────

const PAME_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-primary/15 text-primary",
  approved: "bg-chart-2/15 text-chart-2",
  rejected: "bg-destructive/10 text-destructive",
};
const PAME_PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/15 text-amber-600",
  low: "bg-chart-2/15 text-chart-2",
};
const PAME_DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "outros"];

function PameTab({ materials }: { materials: Material[] }) {
  const { t } = useTranslation();
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const pameItems = useMemo(() => {
    let list = materials.filter(m => m.pame_code);
    if (filterDiscipline !== "all") list = list.filter(m => (m as any).pame_disciplina === filterDiscipline);
    if (filterPriority !== "all") list = list.filter(m => (m as any).pame_prioridade === filterPriority);
    return list;
  }, [materials, filterDiscipline, filterPriority]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("materials.filters.allCategories")}</SelectItem>
            {PAME_DISCIPLINES.map(d => (
              <SelectItem key={d} value={d}>{t(`nc.discipline.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="high">{t("materials.pame.priority.high")}</SelectItem>
            <SelectItem value="medium">{t("materials.pame.priority.medium")}</SelectItem>
            <SelectItem value="low">{t("materials.pame.priority.low")}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {pameItems.length === 0 ? (
        <EmptyState icon={Package} subtitleKey="emptyState.materials.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.pameCode")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.table.material")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.discipline")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.pame.norm")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materials.pame.priority.label")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PPI</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pameItems.map(m => (
                <TableRow key={m.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs">{(m as any).pame_code}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t(`nc.discipline.${(m as any).pame_disciplina}`, { defaultValue: (m as any).pame_disciplina ?? "—" })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(m as any).pame_norma ?? "—"}</TableCell>
                  <TableCell>
                    {(m as any).pame_prioridade ? (
                      <Badge variant="secondary" className={cn("text-xs", PAME_PRIORITY_COLORS[(m as any).pame_prioridade] ?? "")}>
                        {t(`materials.pame.priority.${(m as any).pame_prioridade}`)}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(m as any).pame_ppi_ref ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", PAME_STATUS_COLORS[(m as any).pame_status] ?? "")}>
                      {t(`materials.approval.statuses.${(m as any).pame_status}`, { defaultValue: (m as any).pame_status ?? "pending" })}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

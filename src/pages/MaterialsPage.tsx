import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { materialService } from "@/lib/services/materialService";
import { exportMaterialsListPdf } from "@/lib/services/materialExportService";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Plus, Pencil, Search, Archive, RotateCcw, Eye, Trash2,
  PieChart as PieChartIcon, ShieldCheck, Clock, AlertTriangle, Ban,
  ClipboardList, Truck, CheckCircle2, XCircle,
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
import { MaterialReceptionDialog } from "@/components/materials/MaterialReceptionDialog";
import { MaterialBlockedBadge } from "@/components/materials/MaterialBlockedBadge";
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
  const [activeTab, setActiveTab] = useState("pame");
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [receptionTarget, setReceptionTarget] = useState<Material | null>(null);
  const [receptionOpen, setReceptionOpen] = useState(false);

  // Carregar todos os lotes do projecto com joins
  useEffect(() => {
    if (!activeProject) return;
    setLotsLoading(true);
    (supabase as any)
      .from("material_lots")
      .select("*, materials(code, name, category, unit)")
      .eq("project_id", activeProject.id)
      .eq("is_deleted", false)
      .order("reception_date", { ascending: false })
      .then(({ data }: any) => {
        setLots(data ?? []);
        setLotsLoading(false);
      });
  }, [activeProject]);

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
  const approvedCount   = materials.filter(m => (m as any).pame_status === "approved").length;
  const pendingCount    = materials.filter(m => ["pending", "submitted", "in_review"].includes((m as any).pame_status ?? "pending")).length;
  const quarantineCount = materials.filter(m => (m as any).pame_status === "quarantine" || (m as any).pame_status === "rejected").length;

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
          {/* Ordem lógica: 1) Plano (PAME) → 2) Catálogo → 3) Receções em obra */}
          <TabsTrigger value="pame">
            <span className="hidden sm:inline">1. {t("materials.pame.title", { defaultValue: "Plano PAME" })}</span>
            <span className="sm:hidden">PAME</span>
          </TabsTrigger>
          <TabsTrigger value="materials">
            <span className="hidden sm:inline">2. {t("materials.reception_tab.catalogTab")}</span>
            <span className="sm:hidden">{t("materials.reception_tab.catalogTabShort", { defaultValue: "Catálogo" })}</span>
          </TabsTrigger>
          <TabsTrigger value="receptions" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">3. {t("materials.reception_tab.tabLabel")}</span>
            <span className="sm:hidden">{t("materials.reception_tab.tabLabelShort", { defaultValue: "Recepções" })}</span>
            {lots.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5">{lots.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: RECEPÇÕES DE OBRA ── */}
        <TabsContent value="receptions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("materials.reception_tab.sectionTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("materials.reception_tab.sectionSubtitle")}</p>
            </div>
            {canCreate && materials.length > 0 && (
              <Select
                value=""
                onValueChange={(matId) => {
                  const mat = materials.find(m => m.id === matId);
                  if (mat) {
                    setReceptionTarget(mat);
                    setTimeout(() => setReceptionOpen(true), 50);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-[220px] text-sm gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <SelectValue placeholder={t("materials.reception_tab.newReception", { defaultValue: "+ Nova Recepção…" })} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                    {t("materials.reception_tab.pickMaterial", { defaultValue: "Escolher material para registar recepção" })}
                  </div>
                  {materials.filter(m => m.status !== "archived").map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-mono text-xs">{m.code}</span> — {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {lotsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : lots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Truck className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Sem recepções registadas</p>
              <p className="text-xs">Quando receber material em obra, registe aqui a recepção.</p>
            </div>
          ) : (
            <>
              {/* KPIs de lotes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Aprovados", value: lots.filter(l => l.reception_status === "approved").length, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
                  { label: "Em quarentena", value: lots.filter(l => l.reception_status === "quarantine").length, color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
                  { label: "Rejeitados", value: lots.filter(l => l.reception_status === "rejected").length, color: "text-destructive", icon: XCircle },
                ].map((k, i) => (
                  <Card key={i} className="border-0 bg-card shadow-card">
                    <CardContent className="p-3 flex items-center gap-2.5">
                      <k.icon className={`h-4 w-4 ${k.color} flex-shrink-0`} />
                      <div>
                        <p className="text-xl font-black tabular-nums text-foreground">{k.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Lista de lotes */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-border">
                  {lots.map(lot => {
                    const statusStyles: Record<string, string> = {
                      approved:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                      quarantine: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                      rejected:   "bg-destructive/10 text-destructive border-destructive/20",
                      pending:    "bg-muted text-muted-foreground border-border",
                    };
                    const mat = lot.materials;
                    return (
                      <div
                        key={lot.id}
                        className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/materials/${lot.material_id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-foreground">{lot.lot_code}</span>
                            <span className="text-xs text-muted-foreground truncate">{mat?.name ?? "—"}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{mat?.category ?? "—"}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {lot.quantity_received != null ? `${Number(lot.quantity_received).toLocaleString("pt-PT")} ${lot.unit ?? ""}` : "—"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {lot.reception_date ? new Date(lot.reception_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                            </span>
                            {lot.rejection_reason && (
                              <span className="text-[10px] text-destructive italic truncate max-w-[200px]">{lot.rejection_reason}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyles[lot.reception_status] ?? statusStyles.pending}`}>
                          {lot.reception_status === "approved"   ? "Aprovado" :
                           lot.reception_status === "quarantine" ? "Quarentena" :
                           lot.reception_status === "rejected"   ? "Rejeitado" : "Pendente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>

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

          {/* ── Gráficos de distribuição ── */}
          {materials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Barras por categoria */}
              <Card className="border border-border/60">
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
                    <PieChartIcon className="h-3.5 w-3.5" />{t("materials.form.category")}
                  </p>
                  {(() => {
                    const catMap: Record<string, number> = {};
                    materials.forEach(m => { catMap[m.category] = (catMap[m.category] ?? 0) + 1; });
                    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
                    const maxVal = Math.max(...entries.map(e => e[1]), 1);
                    const COLORS = [
                      "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
                      "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent-foreground))",
                      "hsl(var(--muted-foreground))", "hsl(var(--chart-1))",
                    ];
                    return (
                      <div className="space-y-2">
                        {entries.map(([k, v], i) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 truncate text-right">{t(`materials.categories.${k}`, { defaultValue: k })}</span>
                            <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(v / maxVal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums text-foreground w-6 text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Stacked bar por estado de aprovação */}
              <Card className="border border-border/60">
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
                    <Ban className="h-3.5 w-3.5" />{t("materials.approval.title", { defaultValue: "Estado de Aprovação" })}
                  </p>
                  {(() => {
                    const statusMap: Record<string, number> = {};
                    materials.forEach(m => { const s = (m as any).pame_status || m.approval_status; statusMap[s] = (statusMap[s] ?? 0) + 1; });
                    const entries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
                    const total = entries.reduce((s, e) => s + e[1], 0) || 1;
                    const STATUS_CHART_COLORS: Record<string, string> = {
                      pending:     "hsl(var(--muted-foreground))",
                      submitted:   "hsl(var(--chart-4))",
                      in_review:   "hsl(var(--primary))",
                      approved:    "hsl(var(--chart-2))",
                      rejected:    "hsl(var(--destructive))",
                      conditional: "hsl(var(--chart-5))",
                      quarantine:  "hsl(var(--chart-3))",
                    };
                    return (
                      <div className="space-y-3">
                        <div className="h-6 rounded-full overflow-hidden flex">
                          {entries.map(([k, v]) => (
                            <div
                              key={k}
                              className="h-full transition-all duration-500"
                              style={{ width: `${(v / total) * 100}%`, backgroundColor: STATUS_CHART_COLORS[k] ?? "hsl(var(--muted-foreground))" }}
                              title={`${t(`materials.approval.statuses.${k}`, { defaultValue: k })}: ${v}`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {entries.map(([k, v]) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_CHART_COLORS[k] ?? "hsl(var(--muted-foreground))" }} />
                              <span className="text-xs text-muted-foreground">{t(`materials.approval.statuses.${k}`, { defaultValue: k })}</span>
                              <span className="text-xs font-bold tabular-nums text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-[11px] text-muted-foreground">{m.code}</span>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", approvalInfo.bg)}>
                              <ApprovalIcon className="h-3 w-3" />
                              {t(`materials.approval.statuses.${(m as any).pame_status || m.approval_status}`, { defaultValue: m.approval_status })}
                            </Badge>
                            <MaterialBlockedBadge isBlocked={!!m.is_blocked} reasons={m.block_reasons} />
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

                      {/* Bottom row: unit + lotes + data */}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                        {m.unit && (
                          <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{m.unit}</span>
                        )}
                        {m.status === "archived" && (
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                            {t("materials.status.archived")}
                          </Badge>
                        )}
                        {(m as any).lots_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {(m as any).lots_count} lote{(m as any).lots_count !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {(m as any).last_reception_date
                            ? `Recep. ${new Date((m as any).last_reception_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}`
                            : new Date(m.created_at).toLocaleDateString()}
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
          <PameTab materials={materials} navigate={navigate} />
        </TabsContent>

      </Tabs>

      {/* ── Dialogs globais — fora das Tabs para ficarem sempre montados ── */}
      <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} material={editingMaterial} onSuccess={refetch} />

      {receptionTarget && (
        <MaterialReceptionDialog
          open={receptionOpen}
          onOpenChange={(o) => {
            setReceptionOpen(o);
            if (!o) setTimeout(() => setReceptionTarget(null), 300);
          }}
          projectId={activeProject!.id}
          material={receptionTarget}
          onSuccess={async () => {
            setReceptionOpen(false);
            setTimeout(() => setReceptionTarget(null), 300);
            const { data } = await (supabase as any)
              .from("material_lots")
              .select("*, materials(code, name, category, unit)")
              .eq("project_id", activeProject!.id)
              .eq("is_deleted", false)
              .order("reception_date", { ascending: false });
            setLots(data ?? []);
          }}
        />
      )}

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

function PameTab({ materials, navigate }: { materials: Material[]; navigate: (path: string) => void }) {
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
                <TableRow
                  key={m.id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate(`/materials/${m.id}`)}
                >
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

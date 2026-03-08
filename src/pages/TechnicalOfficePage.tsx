import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useRfis } from "@/hooks/useRfis";
import { useProjectRole } from "@/hooks/useProjectRole";
import { technicalOfficeService, TECH_OFFICE_TYPES, TECH_OFFICE_STATUSES, PRIORITIES } from "@/lib/services/technicalOfficeService";
import { rfiService } from "@/lib/services/rfiService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportRfisCsv, exportRfisPdf } from "@/lib/services/rfiExportService";
import { exportTechOfficeCsv, exportTechOfficePdf } from "@/lib/services/techOfficeExportService";
import { Inbox, Plus, Pencil, Trash2, MessageSquareText, Search, Eye, AlertTriangle, Clock, CheckCircle, FileText } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { TechnicalOfficeFormDialog } from "@/components/technical-office/TechnicalOfficeFormDialog";
import { RfiFormDialog } from "@/components/technical-office/RfiFormDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";
import type { Rfi } from "@/lib/services/rfiService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_review: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/20 text-primary",
  responded: "bg-accent text-accent-foreground",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
  answered: "bg-primary/20 text-primary",
  awaiting_response: "bg-secondary text-secondary-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary", normal: "default", high: "outline", urgent: "destructive",
};

const OVERDUE_FILTER = "__overdue__";

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
          <AlertDialogDescription>{label || t("common.confirmDelete")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function TechnicalOfficePage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: items, loading, error, refetch } = useTechnicalOffice();
  const { data: rfis, loading: rfisLoading, refetch: refetchRfis } = useRfis();
  const { canCreate, isAdmin } = useProjectRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicalOfficeItem | null>(null);

  const [rfiFormOpen, setRfiFormOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<Rfi | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterType, setFilterType] = useState("__all__");
  const [filterPriority, setFilterPriority] = useState("__all__");

  // Merge items + rfis into unified list
  const allItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const toItems = items.map(i => ({ ...i, _source: "item" as const, _deadline: i.deadline ?? i.due_date }));
    const rfiItems = rfis.map(r => ({
      id: r.id,
      code: r.code,
      type: "RFI" as string,
      title: r.subject,
      description: r.description,
      status: r.status,
      priority: r.priority,
      deadline: r.deadline,
      _deadline: r.deadline,
      created_at: r.created_at,
      work_item_id: r.work_item_id,
      nc_id: r.nc_id,
      discipline: (r as any).discipline,
      _source: "rfi" as const,
    }));
    // Sort by deadline ASC (most urgent first), nulls last
    return [...toItems, ...rfiItems].sort((a, b) => {
      if (a._deadline && b._deadline) return a._deadline.localeCompare(b._deadline);
      if (a._deadline) return -1;
      if (b._deadline) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, rfis]);

  const filtered = useMemo(() => {
    let list = allItems;
    // Tab filter
    if (activeTab === "rfis") list = list.filter(i => i._source === "rfi" || i.type === "RFI");
    else if (activeTab === "submittals") list = list.filter(i => i.type === "SUBMITTAL");
    else if (activeTab === "transmittals") list = list.filter(i => i.type === "TRANSMITTAL");
    else if (activeTab === "others") list = list.filter(i => !["RFI", "SUBMITTAL", "TRANSMITTAL"].includes(i.type));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.code ?? "").toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
    }
    const today = new Date().toISOString().slice(0, 10);
    if (filterStatus === OVERDUE_FILTER) {
      list = list.filter(r => r._deadline && r._deadline < today && !["closed", "cancelled", "archived"].includes(r.status));
    } else if (filterStatus !== "__all__") {
      list = list.filter(r => r.status === filterStatus);
    }
    if (filterType !== "__all__") list = list.filter(r => r.type === filterType);
    if (filterPriority !== "__all__") list = list.filter(r => r.priority === filterPriority);
    return list;
  }, [allItems, activeTab, search, filterStatus, filterType, filterPriority]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date();
    const openList = allItems.filter(i => !["closed", "cancelled", "archived"].includes(i.status));
    const overdue = openList.filter(i => i._deadline && new Date(i._deadline) < today);
    const inReview = allItems.filter(i => i.status === "in_review");
    const closedLast30 = allItems.filter(i => {
      if (i.status !== "closed") return false;
      const d = new Date(i.created_at);
      return (today.getTime() - d.getTime()) < 30 * 86400000;
    });
    return { open: openList.length, inReview: inReview.length, overdue: overdue.length, closed30: closedLast30.length };
  }, [allItems]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleNew = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: TechnicalOfficeItem) => { setEditingItem(item); setDialogOpen(true); };

  const handleSoftDeleteItem = async (id: string) => {
    try { await technicalOfficeService.softDelete(id, activeProject.id); toast.success(t("technicalOffice.toast.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const handleSoftDeleteRfi = async (rfi: Rfi) => {
    try { await rfiService.softDelete(rfi.id, activeProject.id); toast.success(t("technicalOffice.toast.rfiDeleted")); refetchRfis(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const handleNewRfi = () => { setEditingRfi(null); setRfiFormOpen(true); };

  const handleRowClick = (row: any) => {
    if (row._source === "rfi") navigate(`/technical-office/rfis/${row.id}`);
    else navigate(`/technical-office/items/${row.id}`);
  };

  const handleExport = (fmt: "csv" | "pdf") => {
    if (fmt === "csv") exportTechOfficeCsv(items, meta);
    else exportTechOfficePdf(items, meta);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.technicalOffice.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("technicalOffice.subtitle", { defaultValue: "RFIs, Submittals, Transmittals e Clarificações" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <Button onClick={handleNewRfi} size="sm" variant="outline" className="gap-1.5"><MessageSquareText className="h-3.5 w-3.5" /> {t("technicalOffice.newRfi")}</Button>
              <Button onClick={handleNew} size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> {t("technicalOffice.newItem")}</Button>
            </>
          )}
          <ReportExportMenu options={[
            { label: "CSV", icon: "csv", action: () => handleExport("csv") },
            { label: "PDF", icon: "pdf", action: () => handleExport("pdf") },
          ]} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("technicalOffice.kpi.open", { defaultValue: "Abertos" }), value: kpis.open, icon: FileText, color: "text-primary" },
          { label: t("technicalOffice.kpi.inReview", { defaultValue: "Em Análise" }), value: kpis.inReview, icon: Clock, color: "text-secondary-foreground" },
          { label: t("technicalOffice.kpi.overdue", { defaultValue: "Atrasados" }), value: kpis.overdue, icon: AlertTriangle, color: "text-destructive" },
          { label: t("technicalOffice.kpi.closed30", { defaultValue: "Fechados (30d)" }), value: kpis.closed30, icon: CheckCircle, color: "text-muted-foreground" },
        ].map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{t("technicalOffice.tabs.all", { defaultValue: "Todos" })}</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
          <TabsTrigger value="submittals">Submittals</TabsTrigger>
          <TabsTrigger value="transmittals">Transmittals</TabsTrigger>
          <TabsTrigger value="others">{t("technicalOffice.tabs.others", { defaultValue: "Outros" })}</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <FilterBar>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("technicalOffice.searchPlaceholder", { defaultValue: "Pesquisar código, assunto…" })}
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder={t("technicalOffice.filters.allStatuses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("technicalOffice.filters.allStatuses")}</SelectItem>
                <SelectItem value={OVERDUE_FILTER}>{t("technicalOffice.filters.overdue")}</SelectItem>
                {[...TECH_OFFICE_STATUSES, "answered", "awaiting_response"].map(s => (
                  <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`, { defaultValue: s })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue placeholder={t("technicalOffice.filters.allTypes", { defaultValue: "Todos os tipos" })} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("technicalOffice.filters.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
                {TECH_OFFICE_TYPES.map(tp => (
                  <SelectItem key={tp} value={tp}>{t(`technicalOffice.types.${tp}`, { defaultValue: tp })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder={t("technicalOffice.filters.allPriorities")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("technicalOffice.filters.allPriorities")}</SelectItem>
                {PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>{t(`technicalOffice.priority.${p}`, { defaultValue: p })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        </div>

        {/* Unified table for all tabs */}
        <div className="mt-4">
          {(loading || rfisLoading) ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" /></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Inbox} subtitleKey="emptyState.technicalOffice.subtitle" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.code")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.type")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.subject", { defaultValue: "Assunto" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("nc.form.discipline", { defaultValue: "Disciplina" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.priority")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.deadline")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.daysOpen", { defaultValue: "Dias" })}</TableHead>
                    <TableHead className="w-20">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const today = new Date();
                    const todayStr = today.toISOString().slice(0, 10);
                    const isOverdue = row._deadline && row._deadline < todayStr && !["closed", "cancelled", "archived"].includes(row.status);
                    const daysOpen = Math.max(0, Math.floor((today.getTime() - new Date(row.created_at).getTime()) / 86400000));
                    return (
                      <TableRow key={`${row._source}-${row.id}`} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => handleRowClick(row)}>
                        <TableCell className="font-mono text-xs font-medium">{row.code ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`technicalOffice.types.${row.type}`, { defaultValue: row.type })}</Badge></TableCell>
                        <TableCell className="font-medium text-sm text-foreground max-w-[250px] truncate">{row.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(row as any).discipline ? t(`nc.discipline.${(row as any).discipline}`, { defaultValue: (row as any).discipline }) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={(PRIORITY_COLORS[row.priority] || "secondary") as any} className="text-xs">
                            {t(`technicalOffice.priority.${row.priority}`, { defaultValue: row.priority })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[row.status] ?? "")}>
                            {t(`technicalOffice.status.${row.status}`, { defaultValue: row.status })}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-sm", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          {row._deadline ? new Date(row._deadline).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{daysOpen}d</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleRowClick(row)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <DeleteButton
                                onConfirm={() => {
                                  if (row._source === "rfi") handleSoftDeleteRfi(row as any);
                                  else handleSoftDeleteItem(row.id);
                                }}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Tabs>

      <TechnicalOfficeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} onSuccess={refetch} />
      <RfiFormDialog open={rfiFormOpen} onOpenChange={setRfiFormOpen} rfi={editingRfi} onSuccess={refetchRfis} />
    </div>
  );
}

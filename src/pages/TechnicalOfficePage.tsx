import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useRfis } from "@/hooks/useRfis";
import { useDocuments } from "@/hooks/useDocuments";
import { useProjectRole } from "@/hooks/useProjectRole";
import { technicalOfficeService, TECH_OFFICE_TYPES, TECH_OFFICE_STATUSES, PRIORITIES } from "@/lib/services/technicalOfficeService";
import { rfiService } from "@/lib/services/rfiService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportRfisCsv, exportRfisPdf } from "@/lib/services/rfiExportService";
import { exportTechOfficeCsv, exportTechOfficePdf } from "@/lib/services/techOfficeExportService";
import { Inbox, Plus, Trash2, MessageSquareText, Search, Eye, AlertTriangle, Clock, CheckCircle, FileText } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  answered: "bg-emerald-500/15 text-emerald-600",
  awaiting_response: "bg-secondary text-secondary-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary", normal: "default", high: "outline", urgent: "destructive", critical: "destructive",
};

const RFI_PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-amber-500/15 text-amber-600",
  critical: "bg-destructive/10 text-destructive",
};

const RFI_DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "outros"] as const;
const RFI_PRIORITIES_LIST = ["normal", "urgent", "critical"] as const;

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
  const reportMeta = useReportMeta();
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
  const [filterDiscipline, setFilterDiscipline] = useState("__all__");

  const isRfiTab = activeTab === "rfis";
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);

  // Merge items + rfis into unified list
  const allItems = useMemo(() => {
    const toItems = items.map(i => ({ ...i, _source: "item" as const, _deadline: i.deadline ?? i.due_date, _responseDeadline: null as string | null, _discipline: null as string | null, _ptCode: null as string | null }));
    const rfiItems = rfis.map(r => ({
      id: r.id,
      code: r.code,
      type: "RFI" as string,
      title: r.subject,
      description: r.description,
      status: r.status,
      priority: r.priority,
      deadline: r.deadline,
      _deadline: r.response_deadline ?? r.deadline,
      _responseDeadline: r.response_deadline ?? null,
      _discipline: r.discipline ?? null,
      _ptCode: r.pt_code ?? null,
      created_at: r.created_at,
      work_item_id: r.work_item_id,
      nc_id: r.nc_id,
      _source: "rfi" as const,
    }));
    return [...toItems, ...rfiItems].sort((a, b) => {
      if (a._deadline && b._deadline) return a._deadline.localeCompare(b._deadline);
      if (a._deadline) return -1;
      if (b._deadline) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, rfis]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (activeTab === "rfis") list = list.filter(i => i._source === "rfi" || i.type === "RFI");
    else if (activeTab === "submittals") list = list.filter(i => i.type === "SUBMITTAL");
    else if (activeTab === "transmittals") list = list.filter(i => i.type === "TRANSMITTAL");
    else if (activeTab === "others") list = list.filter(i => !["RFI", "SUBMITTAL", "TRANSMITTAL"].includes(i.type));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.code ?? "").toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
    }
    if (filterStatus === OVERDUE_FILTER) {
      list = list.filter(r => {
        const dl = r._responseDeadline ?? r._deadline;
        return dl && dl < todayStr && !["closed", "cancelled", "archived"].includes(r.status);
      });
    } else if (filterStatus !== "__all__") {
      list = list.filter(r => r.status === filterStatus);
    }
    if (filterType !== "__all__") list = list.filter(r => r.type === filterType);
    if (filterPriority !== "__all__") list = list.filter(r => r.priority === filterPriority);
    if (filterDiscipline !== "__all__") list = list.filter(r => r._discipline === filterDiscipline);
    return list;
  }, [allItems, activeTab, search, filterStatus, filterType, filterPriority, filterDiscipline, todayStr]);

  // General KPIs
  const kpis = useMemo(() => {
    const openList = allItems.filter(i => !["closed", "cancelled", "archived"].includes(i.status));
    const overdue = openList.filter(i => {
      const dl = i._responseDeadline ?? i._deadline;
      return dl && new Date(dl) < todayDate;
    });
    const inReview = allItems.filter(i => i.status === "in_review");
    const closedLast30 = allItems.filter(i => {
      if (i.status !== "closed") return false;
      return (todayDate.getTime() - new Date(i.created_at).getTime()) < 30 * 86400000;
    });
    return { open: openList.length, inReview: inReview.length, overdue: overdue.length, closed30: closedLast30.length };
  }, [allItems, todayDate]);

  // RFI-specific KPIs
  const rfiKpis = useMemo(() => {
    const openCount = rfis.filter(r => r.status === "open").length;
    const answeredCount = rfis.filter(r => r.status === "answered").length;
    const closedCount = rfis.filter(r => r.status === "closed").length;
    const overdueCount = rfis.filter(r => r.status === "open" && r.response_deadline && r.response_deadline < todayStr).length;
    return { open: openCount, answered: answeredCount, overdue: overdueCount, closed: closedCount };
  }, [rfis, todayStr]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleNew = () => { setEditingItem(null); setDialogOpen(true); };

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
    if (isRfiTab) {
      if (fmt === "csv") exportRfisCsv(rfis, meta);
      else exportRfisPdf(rfis, meta);
    } else {
      if (fmt === "csv") exportTechOfficeCsv(items, meta);
      else exportTechOfficePdf(items, meta);
    }
  };

  const getDaysOpen = (createdAt: string) => Math.max(0, Math.floor((todayDate.getTime() - new Date(createdAt).getTime()) / 86400000));

  // KPI cards to display
  const kpiCards = isRfiTab
    ? [
        { label: t("rfi.kpi.open", { defaultValue: "Em Aberto" }), value: rfiKpis.open, icon: FileText, color: "text-primary" },
        { label: t("rfi.kpi.answered", { defaultValue: "Respondidos" }), value: rfiKpis.answered, icon: CheckCircle, color: "text-emerald-600" },
        { label: t("rfi.kpi.overdue", { defaultValue: "Em Atraso" }), value: rfiKpis.overdue, icon: AlertTriangle, color: "text-destructive" },
        { label: t("rfi.kpi.closed", { defaultValue: "Fechados" }), value: rfiKpis.closed, icon: Clock, color: "text-muted-foreground" },
      ]
    : [
        { label: t("technicalOffice.kpi.open", { defaultValue: "Abertos" }), value: kpis.open, icon: FileText, color: "text-primary" },
        { label: t("technicalOffice.kpi.inReview", { defaultValue: "Em Análise" }), value: kpis.inReview, icon: Clock, color: "text-secondary-foreground" },
        { label: t("technicalOffice.kpi.overdue", { defaultValue: "Atrasados" }), value: kpis.overdue, icon: AlertTriangle, color: "text-destructive" },
        { label: t("technicalOffice.kpi.closed30", { defaultValue: "Fechados (30d)" }), value: kpis.closed30, icon: CheckCircle, color: "text-muted-foreground" },
      ];

  // Status options for filter
  const statusOptions = isRfiTab
    ? [
        { value: "__all__", label: t("rfi.filters.allStatuses", { defaultValue: "Todos os estados" }) },
        { value: OVERDUE_FILTER, label: t("rfi.filters.overdue", { defaultValue: "⚠ Em atraso" }) },
        { value: "open", label: t("technicalOffice.status.open") },
        { value: "answered", label: t("technicalOffice.status.answered") },
        { value: "closed", label: t("technicalOffice.status.closed") },
      ]
    : [
        { value: "__all__", label: t("technicalOffice.filters.allStatuses") },
        { value: OVERDUE_FILTER, label: t("technicalOffice.filters.overdue") },
        ...[...TECH_OFFICE_STATUSES, "answered", "awaiting_response"].map(s => ({ value: s, label: t(`technicalOffice.status.${s}`, { defaultValue: s }) })),
      ];

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

      {/* KPIs — context-aware */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setFilterStatus("__all__"); setFilterDiscipline("__all__"); }}>
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
              <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Discipline filter — shown on RFI tab or All tab */}
            {(isRfiTab || activeTab === "all") && (
              <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue placeholder={t("rfi.filters.allDisciplines", { defaultValue: "Todas disciplinas" })} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("rfi.filters.allDisciplines", { defaultValue: "Todas disciplinas" })}</SelectItem>
                  {RFI_DISCIPLINES.map(d => <SelectItem key={d} value={d}>{t(`nc.discipline.${d}`, { defaultValue: d })}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Type filter — hidden when on specific tab */}
            {!isRfiTab && activeTab === "all" && (
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue placeholder={t("technicalOffice.filters.allTypes", { defaultValue: "Todos os tipos" })} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("technicalOffice.filters.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
                  {TECH_OFFICE_TYPES.map(tp => <SelectItem key={tp} value={tp}>{t(`technicalOffice.types.${tp}`, { defaultValue: tp })}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Priority filter — RFI tab uses its own list */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder={t("technicalOffice.filters.allPriorities")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("technicalOffice.filters.allPriorities")}</SelectItem>
                {(isRfiTab ? [...RFI_PRIORITIES_LIST] : PRIORITIES).map(p => (
                  <SelectItem key={p} value={p}>{t(`rfi.priority.${p}`, { defaultValue: t(`technicalOffice.priority.${p}`, { defaultValue: p }) })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        </div>

        {/* Table */}
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
                    {!isRfiTab && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.type")}</TableHead>}
                    {isRfiTab && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PT</TableHead>}
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.subject", { defaultValue: "Assunto" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("nc.form.discipline", { defaultValue: "Disciplina" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.priority")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {isRfiTab ? t("rfi.table.responseDeadline", { defaultValue: "Prazo Resposta" }) : t("technicalOffice.table.deadline")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.daysOpen", { defaultValue: "Dias" })}</TableHead>
                    <TableHead className="w-20">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const isRfi = row._source === "rfi";
                    const responseDeadline = row._responseDeadline;
                    const deadlineToShow = isRfiTab ? responseDeadline : row._deadline;
                    const isOverdue = isRfi
                      ? row.status === "open" && responseDeadline && responseDeadline < todayStr
                      : row._deadline && row._deadline < todayStr && !["closed", "cancelled", "archived"].includes(row.status);
                    const daysOpen = getDaysOpen(row.created_at);
                    return (
                      <TableRow key={`${row._source}-${row.id}`} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => handleRowClick(row)}>
                        <TableCell className="font-mono text-xs font-medium">{row.code ?? "—"}</TableCell>
                        {!isRfiTab && (
                          <TableCell><Badge variant="secondary" className="text-xs">{t(`technicalOffice.types.${row.type}`, { defaultValue: row.type })}</Badge></TableCell>
                        )}
                        {isRfiTab && (
                          <TableCell className="font-mono text-xs text-muted-foreground">{row._ptCode ?? "—"}</TableCell>
                        )}
                        <TableCell className="font-medium text-sm text-foreground max-w-[250px] truncate">{row.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row._discipline ? t(`nc.discipline.${row._discipline}`, { defaultValue: row._discipline }) : "—"}
                        </TableCell>
                        <TableCell>
                          {isRfi ? (
                            <Badge variant="secondary" className={cn("text-xs", RFI_PRIORITY_COLORS[row.priority] ?? "")}>
                              {t(`rfi.priority.${row.priority}`, { defaultValue: row.priority })}
                            </Badge>
                          ) : (
                            <Badge variant={(PRIORITY_COLORS[row.priority] || "secondary") as any} className="text-xs">
                              {t(`technicalOffice.priority.${row.priority}`, { defaultValue: row.priority })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs",
                            isOverdue ? "bg-destructive/15 text-destructive" : STATUS_COLORS[row.status] ?? ""
                          )}>
                            {isOverdue
                              ? t("rfi.status.overdue", { defaultValue: "Atrasado" })
                              : t(`technicalOffice.status.${row.status}`, { defaultValue: row.status })}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-xs", isOverdue && "text-destructive font-medium")}>
                          {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          {deadlineToShow ? new Date(deadlineToShow).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className={cn("text-xs font-medium tabular-nums", daysOpen > 14 && "text-destructive")}>
                          {daysOpen}d
                        </TableCell>
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

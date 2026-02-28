import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useRfis } from "@/hooks/useRfis";
import { useProjectRole } from "@/hooks/useProjectRole";
import { technicalOfficeService } from "@/lib/services/technicalOfficeService";
import { rfiService } from "@/lib/services/rfiService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportRfisCsv, exportRfisPdf } from "@/lib/services/rfiExportService";
import { Inbox, Plus, Pencil, Trash2, MessageSquareText, Search, RotateCcw } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RfiDetailDialog } from "@/components/technical-office/RfiDetailDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";
import type { Rfi } from "@/lib/services/rfiService";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-primary/20 text-primary",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  awaiting_response: "bg-secondary text-secondary-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary",
  normal: "default",
  high: "outline",
  urgent: "destructive",
};

const RFI_STATUSES = ["open", "awaiting_response", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.deleteConfirmTitle", { defaultValue: "Confirmar eliminação" })}</AlertDialogTitle>
          <AlertDialogDescription>{label || t("common.deleteConfirmDesc", { defaultValue: "Este registo será eliminado permanentemente. Tem a certeza?" })}</AlertDialogDescription>
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
  const [activeTab, setActiveTab] = useState("rfis");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicalOfficeItem | null>(null);

  const [rfiFormOpen, setRfiFormOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<Rfi | null>(null);
  const [rfiDetailOpen, setRfiDetailOpen] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterPriority, setFilterPriority] = useState("__all__");

  const filteredRfis = useMemo(() => {
    let list = rfis;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.code ?? "").toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || (r.zone ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(r => r.status === filterStatus);
    if (filterPriority !== "__all__") list = list.filter(r => r.priority === filterPriority);
    return list;
  }, [rfis, search, filterStatus, filterPriority]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleNew = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: TechnicalOfficeItem) => { setEditingItem(item); setDialogOpen(true); };

  const handleDeleteItem = async (id: string) => {
    try { await technicalOfficeService.delete(id, activeProject.id); toast.success(t("common.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const handleSoftDeleteRfi = async (rfi: Rfi) => {
    try { await rfiService.softDelete(rfi.id, activeProject.id); toast.success(t("technicalOffice.toast.rfiDeleted", { defaultValue: "RFI eliminado" })); refetchRfis(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const handleNewRfi = () => { setEditingRfi(null); setRfiFormOpen(true); };
  const handleViewRfi = (rfi: Rfi) => { setSelectedRfi(rfi); setRfiDetailOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.technicalOffice.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.technicalOffice.subtitle")}</p>
        </div>
        <ReportExportMenu options={[
          { label: "CSV", icon: "csv", action: () => { if (activeTab === "rfis") exportRfisCsv(filteredRfis, meta); } },
          { label: "PDF", icon: "pdf", action: () => { if (activeTab === "rfis") exportRfisPdf(filteredRfis, meta); } },
        ]} />
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rfis" className="gap-1.5"><MessageSquareText className="h-3.5 w-3.5" /> RFIs</TabsTrigger>
          <TabsTrigger value="items" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> {t("technicalOffice.newItem", { defaultValue: "Registos" })}</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <FilterBar>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("technicalOffice.searchPlaceholder", { defaultValue: "Pesquisar código, assunto, zona…" })}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {activeTab === "rfis" && (
              <>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-8 text-sm">
                    <SelectValue placeholder={t("technicalOffice.filters.allStatuses", { defaultValue: "Todos os estados" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("technicalOffice.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
                    {RFI_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`, { defaultValue: s })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder={t("technicalOffice.filters.allPriorities", { defaultValue: "Todas as prioridades" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("technicalOffice.filters.allPriorities", { defaultValue: "Todas as prioridades" })}</SelectItem>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{t(`technicalOffice.priority.${p}`, { defaultValue: p })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </FilterBar>
        </div>

        {/* ── RFIs Tab ── */}
        <TabsContent value="rfis" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button onClick={handleNewRfi} size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> {t("technicalOffice.newRfi", { defaultValue: "Novo RFI" })}</Button>}
          </div>
          {rfisLoading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" /></div>)}
            </div>
          ) : filteredRfis.length === 0 ? (
            <EmptyState icon={MessageSquareText} subtitleKey={rfis.length === 0 ? "emptyState.technicalOffice.subtitle" : "emptyState.noResults"} />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.code", { defaultValue: "Código" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.subject", { defaultValue: "Assunto" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.priority", { defaultValue: "Prioridade" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.deadline", { defaultValue: "Prazo" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                    <TableHead className="w-20">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRfis.map((rfi) => (
                    <TableRow key={rfi.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => handleViewRfi(rfi)}>
                      <TableCell className="font-mono text-xs font-medium">{rfi.code}</TableCell>
                      <TableCell className="font-medium text-sm text-foreground">{rfi.subject}</TableCell>
                      <TableCell>
                        <Badge variant={(PRIORITY_COLORS[rfi.priority] || "secondary") as any} className="text-xs">
                          {t(`technicalOffice.priority.${rfi.priority}`, { defaultValue: rfi.priority })}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[rfi.status] ?? "")}>
                          {t(`technicalOffice.status.${rfi.status}`, { defaultValue: rfi.status })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rfi.deadline ? new Date(rfi.deadline).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(rfi.created_at).toLocaleDateString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingRfi(rfi); setRfiFormOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleSoftDeleteRfi(rfi)} label={t("technicalOffice.deleteRfiDesc", { defaultValue: "O RFI será arquivado (soft-delete). Poderá ser restaurado se necessário." })} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Items Tab ── */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button onClick={handleNew} size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> {t("technicalOffice.newItem")}</Button>}
          </div>
          {loading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" /></div>)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Inbox} subtitleKey="emptyState.technicalOffice.subtitle" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.type")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.title")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.dueDate")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                    <TableHead className="w-20">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell><Badge variant="secondary" className="text-xs">{t(`technicalOffice.types.${item.type}`, { defaultValue: item.type })}</Badge></TableCell>
                      <TableCell className="font-medium text-sm text-foreground">{item.title}</TableCell>
                      <TableCell><Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[item.status] ?? "")}>{t(`technicalOffice.status.${item.status}`, { defaultValue: item.status })}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <DeleteButton onConfirm={() => handleDeleteItem(item.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TechnicalOfficeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} onSuccess={refetch} />
      <RfiFormDialog open={rfiFormOpen} onOpenChange={setRfiFormOpen} rfi={editingRfi} onSuccess={refetchRfis} />
      <RfiDetailDialog open={rfiDetailOpen} onOpenChange={setRfiDetailOpen} rfi={selectedRfi} onRefresh={refetchRfis} />
    </div>
  );
}

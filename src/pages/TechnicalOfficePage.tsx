import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useRfis } from "@/hooks/useRfis";
import { useProjectRole } from "@/hooks/useProjectRole";
import { technicalOfficeService } from "@/lib/services/technicalOfficeService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportRfisCsv, exportRfisPdf } from "@/lib/services/rfiExportService";
import { Inbox, Plus, Pencil, Trash2, MessageSquareText } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { TechnicalOfficeFormDialog } from "@/components/technical-office/TechnicalOfficeFormDialog";
import { RfiFormDialog } from "@/components/technical-office/RfiFormDialog";
import { RfiDetailDialog } from "@/components/technical-office/RfiDetailDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";
import type { Rfi } from "@/lib/services/rfiService";

const TYPE_COLORS: Record<string, string> = {
  RFI: "bg-primary/10 text-primary",
  Submittal: "bg-secondary text-secondary-foreground",
  Clarification: "bg-muted text-muted-foreground",
};

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

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirmar eliminação</AlertDialogTitle><AlertDialogDescription>{label || "Este registo será eliminado permanentemente. Tem a certeza?"}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
  const { canCreate, canEdit, isAdmin } = useProjectRole();
  const [activeTab, setActiveTab] = useState("rfis");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicalOfficeItem | null>(null);

  const [rfiFormOpen, setRfiFormOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<Rfi | null>(null);
  const [rfiDetailOpen, setRfiDetailOpen] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleNew = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: TechnicalOfficeItem) => { setEditingItem(item); setDialogOpen(true); };

  const handleDeleteItem = async (id: string) => {
    try { await technicalOfficeService.delete(id, activeProject.id); toast.success("Registo eliminado"); refetch(); }
    catch { toast.error("Erro ao eliminar"); }
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
          { label: "CSV", icon: "csv", action: () => { if (activeTab === "rfis") exportRfisCsv(rfis, meta); } },
          { label: "PDF", icon: "pdf", action: () => { if (activeTab === "rfis") exportRfisPdf(rfis, meta); } },
        ]} />
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rfis" className="gap-1.5"><MessageSquareText className="h-3.5 w-3.5" /> RFIs</TabsTrigger>
          <TabsTrigger value="items" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Registos</TabsTrigger>
        </TabsList>

        {/* ── RFIs Tab ── */}
        <TabsContent value="rfis" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button onClick={handleNewRfi} size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Novo RFI</Button>}
          </div>
          {rfisLoading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : rfis.length === 0 ? (
            <EmptyState icon={MessageSquareText} subtitleKey="emptyState.technicalOffice.subtitle" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assunto</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prazo</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfis.map((rfi) => (
                    <TableRow key={rfi.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => handleViewRfi(rfi)}>
                      <TableCell className="font-mono text-xs font-medium">{rfi.code}</TableCell>
                      <TableCell className="font-medium text-sm text-foreground">{rfi.subject}</TableCell>
                      <TableCell>
                        <Badge variant={(PRIORITY_COLORS[rfi.priority] || "secondary") as any} className="text-xs">
                          {rfi.priority === "low" ? "Baixa" : rfi.priority === "normal" ? "Normal" : rfi.priority === "high" ? "Alta" : "Urgente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[rfi.status] ?? "")}>
                          {rfi.status === "open" ? "Aberto" : rfi.status === "awaiting_response" ? "Aguarda Resposta" : rfi.status === "closed" ? "Encerrado" : rfi.status}
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" />
                </div>
              ))}
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
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell><Badge variant="secondary" className={cn("text-xs", TYPE_COLORS[item.type] ?? "")}>{t(`technicalOffice.types.${item.type}`, { defaultValue: item.type })}</Badge></TableCell>
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

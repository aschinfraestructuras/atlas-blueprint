import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { useWorkItems } from "@/hooks/useWorkItems";
import { technicalOfficeService } from "@/lib/services/technicalOfficeService";
import {
  parseSubmittalMeta, buildSubmittalDescription,
  SUBMITTAL_SUBTYPES, SUBMITTAL_DISCIPLINES, APPROVAL_RESULTS,
  type SubmittalMeta,
} from "@/lib/services/submittalMeta";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileCheck, Plus, Search, X, Eye, Clock, CheckCircle2, AlertTriangle,
  Send, XCircle, ShieldCheck, ShieldAlert, RotateCcw, Pencil,
} from "lucide-react";
import { useProjectRole } from "@/hooks/useProjectRole";
import type { TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";

/* ─── Status Styles ─────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/60 text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  responded: "bg-accent text-accent-foreground",
  closed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const APPROVAL_STYLES: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-muted/60 text-muted-foreground" },
  approved: { label: "Aprovado", icon: ShieldCheck, className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  approved_as_noted: { label: "Aprovado c/ Obs.", icon: ShieldCheck, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  rejected: { label: "Rejeitado", icon: ShieldAlert, className: "bg-destructive/10 text-destructive" },
  revise_resubmit: { label: "Rever e Resubmeter", icon: RotateCcw, className: "bg-primary/10 text-primary" },
};

const SUBMITTAL_STATUSES = ["draft", "open", "in_review", "responded", "closed", "cancelled"] as const;

/* ─── Parsed submittal row type ─────────────────────────────────────── */
interface SubmittalRow {
  item: TechnicalOfficeItem;
  desc: string;
  meta: SubmittalMeta;
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function SubmittalsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allItems, loading, refetch } = useTechnicalOffice();
  const { data: suppliers } = useSuppliers();
  const { data: subcontractors } = useSubcontractors();
  const { data: workItems } = useWorkItems();
  const { canCreate } = useProjectRole();

  // Parse submittals with metadata
  const submittals: SubmittalRow[] = useMemo(() =>
    allItems
      .filter(i => i.type === "SUBMITTAL")
      .map(item => {
        const { visibleDescription, meta } = parseSubmittalMeta(item.description);
        return { item, desc: visibleDescription, meta };
      }),
    [allItems],
  );

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubmittalRow | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("normal");
  const [formDiscipline, setFormDiscipline] = useState("geral");
  const [formSubtype, setFormSubtype] = useState("ficha_tecnica");
  const [formSupplier, setFormSupplier] = useState("");
  const [formSubcontractor, setFormSubcontractor] = useState("");
  const [formSpecRef, setFormSpecRef] = useState("");
  const [formRevision, setFormRevision] = useState("0");
  const [formDeadline, setFormDeadline] = useState("");
  const [formRecipient, setFormRecipient] = useState("");
  const [formWorkItemId, setFormWorkItemId] = useState("");
  const [formApproval, setFormApproval] = useState("pending");

  const resetForm = useCallback(() => {
    setFormTitle(""); setFormDescription(""); setFormPriority("normal");
    setFormDiscipline("geral"); setFormSubtype("ficha_tecnica");
    setFormSupplier(""); setFormSubcontractor(""); setFormSpecRef("");
    setFormRevision("0"); setFormDeadline(""); setFormRecipient("");
    setFormWorkItemId(""); setFormApproval("pending");
    setEditingItem(null);
  }, []);

  const openCreateDialog = () => { resetForm(); setDialogOpen(true); };

  const openEditDialog = (row: SubmittalRow) => {
    setEditingItem(row);
    setFormTitle(row.item.title);
    setFormDescription(row.desc);
    setFormPriority(row.item.priority);
    setFormDiscipline(row.meta.discipline || "geral");
    setFormSubtype(row.meta.subtype || "ficha_tecnica");
    setFormSupplier(row.meta.supplier_name || "");
    setFormSubcontractor(row.meta.subcontractor_name || "");
    setFormSpecRef(row.meta.spec_reference || "");
    setFormRevision(row.meta.revision || "0");
    setFormDeadline(row.item.deadline ?? row.item.due_date ?? "");
    setFormRecipient(row.item.recipient ?? "");
    setFormWorkItemId(row.item.work_item_id ?? "");
    setFormApproval(row.meta.approval_result || "pending");
    setDialogOpen(true);
  };

  // Filters
  const filtered = useMemo(() => {
    return submittals.filter(({ item, meta }) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (item.code ?? "").toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || (meta.supplier_name ?? "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const matchDisc = filterDiscipline === "all" || meta.discipline === filterDiscipline;
      const matchAppr = filterApproval === "all" || meta.approval_result === filterApproval;
      return matchSearch && matchStatus && matchDisc && matchAppr;
    });
  }, [submittals, search, filterStatus, filterDiscipline, filterApproval]);

  const hasFilters = search || filterStatus !== "all" || filterDiscipline !== "all" || filterApproval !== "all";
  const clearFilters = () => { setSearch(""); setFilterStatus("all"); setFilterDiscipline("all"); setFilterApproval("all"); };

  // KPIs
  const kpis = useMemo(() => {
    const open = submittals.filter(s => !["closed", "cancelled"].includes(s.item.status)).length;
    const inReview = submittals.filter(s => s.item.status === "in_review").length;
    const approved = submittals.filter(s => ["approved", "approved_as_noted"].includes(s.meta.approval_result)).length;
    const rejected = submittals.filter(s => s.meta.approval_result === "rejected").length;
    return { total: submittals.length, open, inReview, approved, rejected };
  }, [submittals]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !formTitle.trim()) return;

    const description = buildSubmittalDescription(formDescription.trim(), {
      discipline: formDiscipline,
      subtype: formSubtype,
      supplier_name: formSupplier,
      subcontractor_name: formSubcontractor,
      spec_reference: formSpecRef,
      approval_result: formApproval,
      revision: formRevision,
      submitted_at: editingItem ? (editingItem.meta.submitted_at || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
      response_due: formDeadline,
    });

    try {
      if (editingItem) {
        await technicalOfficeService.update(editingItem.item.id, activeProject.id, {
          title: formTitle.trim(),
          description,
          priority: formPriority,
          deadline: formDeadline || undefined,
          recipient: formRecipient || undefined,
          work_item_id: formWorkItemId || null,
        });
        toast.success(t("submittals.toast.updated", { defaultValue: "Submittal atualizado" }));
      } else {
        await technicalOfficeService.create({
          project_id: activeProject.id,
          created_by: user.id,
          type: "SUBMITTAL",
          title: formTitle.trim(),
          description,
          priority: formPriority,
          status: "open",
          deadline: formDeadline || undefined,
          recipient: formRecipient || undefined,
          work_item_id: formWorkItemId || null,
        });
        toast.success(t("submittals.toast.created", { defaultValue: "Submittal criado com sucesso" }));
      }
      setDialogOpen(false);
      resetForm();
      refetch();
    } catch {
      toast.error(t("common.error", { defaultValue: "Erro ao guardar" }));
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!activeProject) return;
    try {
      await technicalOfficeService.softDelete(id, activeProject.id);
      toast.success(t("submittals.toast.deleted", { defaultValue: "Submittal eliminado" }));
      refetch();
    } catch {
      toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" }));
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        module={t("submittals.module", { defaultValue: "Documentação" })}
        title={t("submittals.title", { defaultValue: "Submittals" })}
        subtitle={t("submittals.subtitle", { defaultValue: "Aprovações técnicas de materiais, desenhos e métodos" })}
        icon={FileCheck}
        iconColor="hsl(var(--primary))"
        actions={
          canCreate ? (
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("submittals.new", { defaultValue: "Novo Submittal" })}
            </Button>
          ) : undefined
        }
      />

      {/* KPIs */}
      {!loading && submittals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ModuleKPICard label={t("submittals.kpi.open", { defaultValue: "Em Aberto" })} value={kpis.open} icon={Send} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("submittals.kpi.inReview", { defaultValue: "Em Análise" })} value={kpis.inReview} icon={Clock} color="hsl(38 85% 44%)" />
          <ModuleKPICard label={t("submittals.kpi.approved", { defaultValue: "Aprovados" })} value={kpis.approved} icon={ShieldCheck} color="hsl(158 45% 36%)" />
          <ModuleKPICard label={t("submittals.kpi.rejected", { defaultValue: "Rejeitados" })} value={kpis.rejected} icon={ShieldAlert} color="hsl(0 72% 51%)" />
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-52 pl-8 text-sm bg-background" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("submittals.filter.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            {SUBMITTAL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="h-8 w-36 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("submittals.filter.allDisciplines", { defaultValue: "Disciplinas" })}</SelectItem>
            {SUBMITTAL_DISCIPLINES.map(d => (
              <SelectItem key={d} value={d}>{t(`submittals.discipline.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterApproval} onValueChange={setFilterApproval}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("submittals.filter.allApprovals", { defaultValue: "Aprovação" })}</SelectItem>
            {APPROVAL_RESULTS.map(a => (
              <SelectItem key={a} value={a}>{t(`submittals.approval.${a}`, { defaultValue: APPROVAL_STYLES[a]?.label ?? a })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />{t("nc.filters.clear")}
          </Button>
        )}
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileCheck} subtitleKey="submittals.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">{t("submittals.col.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("submittals.col.title", { defaultValue: "Título" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("submittals.col.discipline", { defaultValue: "Disciplina" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">{t("submittals.col.subtype", { defaultValue: "Tipo" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">{t("submittals.col.approval", { defaultValue: "Aprovação" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("common.date")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ item, meta }) => {
                const approvalStyle = APPROVAL_STYLES[meta.approval_result] ?? APPROVAL_STYLES.pending;
                const ApprovalIcon = approvalStyle.icon;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/technical-office/items/${item.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{item.code ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[320px] truncate">
                      <div className="flex flex-col">
                        <span className="truncate">{item.title}</span>
                        {(meta.supplier_name || meta.subcontractor_name) && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {meta.supplier_name || meta.subcontractor_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {t(`submittals.discipline.${meta.discipline}`, { defaultValue: meta.discipline || "—" })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t(`submittals.subtype.${meta.subtype}`, { defaultValue: meta.subtype || "—" })}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[item.status] ?? "bg-muted text-muted-foreground"
                      )}>
                        {t(`technicalOffice.status.${item.status}`, { defaultValue: item.status })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        approvalStyle.className,
                      )}>
                        <ApprovalIcon className="h-3 w-3" />
                        {t(`submittals.approval.${meta.approval_result}`, { defaultValue: approvalStyle.label })}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono tabular-nums text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("pt-PT")}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <RowActionMenu
                        actions={[
                          { key: "view", label: t("common.view"), icon: Eye, onClick: () => navigate(`/technical-office/items/${item.id}`) },
                          ...(canCreate ? [
                            { key: "edit", label: t("common.edit"), icon: Pencil, onClick: () => {
                              const { visibleDescription, meta: parsedMeta } = parseSubmittalMeta(item.description);
                              openEditDialog({ item, desc: visibleDescription, meta: parsedMeta });
                            } },
                          ] : []),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("submittals.form.titleEdit", { defaultValue: "Editar Submittal" })
                : t("submittals.new", { defaultValue: "Novo Submittal" })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-1">
            <div className="space-y-4 py-1">
              {/* Identification */}
              <div className="space-y-2">
                <Label>{t("submittals.form.title", { defaultValue: "Título / Assunto" })} *</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={t("submittals.form.titlePlaceholder", { defaultValue: "Ex: Aprovação de aço B500SD — Lote 12" })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("submittals.form.discipline", { defaultValue: "Disciplina" })}</Label>
                  <Select value={formDiscipline} onValueChange={setFormDiscipline}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBMITTAL_DISCIPLINES.map(d => (
                        <SelectItem key={d} value={d}>{t(`submittals.discipline.${d}`, { defaultValue: d })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("submittals.form.subtype", { defaultValue: "Tipo de Submittal" })}</Label>
                  <Select value={formSubtype} onValueChange={setFormSubtype}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBMITTAL_SUBTYPES.map(s => (
                        <SelectItem key={s} value={s}>{t(`submittals.subtype.${s}`, { defaultValue: s })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-1" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("submittals.form.technicalSection", { defaultValue: "Caracterização Técnica" })}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("submittals.form.supplier", { defaultValue: "Fornecedor" })}</Label>
                  <Select value={formSupplier || "__none__"} onValueChange={v => setFormSupplier(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.code} — {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("submittals.form.subcontractor", { defaultValue: "Subempreiteiro" })}</Label>
                  <Select value={formSubcontractor || "__none__"} onValueChange={v => setFormSubcontractor(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {subcontractors.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("submittals.form.specRef", { defaultValue: "Referência Normativa" })}</Label>
                  <Input value={formSpecRef} onChange={e => setFormSpecRef(e.target.value)} placeholder="Ex: EN 206-1, CE 3.1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("submittals.form.revision", { defaultValue: "Revisão" })}</Label>
                  <Input value={formRevision} onChange={e => setFormRevision(e.target.value)} placeholder="0" />
                </div>
              </div>

              <Separator className="my-1" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("submittals.form.workflowSection", { defaultValue: "Workflow" })}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("submittals.form.priority", { defaultValue: "Prioridade" })}</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("technicalOffice.priority.low", { defaultValue: "Baixa" })}</SelectItem>
                      <SelectItem value="normal">{t("technicalOffice.priority.normal", { defaultValue: "Normal" })}</SelectItem>
                      <SelectItem value="high">{t("technicalOffice.priority.high", { defaultValue: "Alta" })}</SelectItem>
                      <SelectItem value="urgent">{t("technicalOffice.priority.urgent", { defaultValue: "Urgente" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("submittals.form.deadline", { defaultValue: "Prazo de Resposta" })}</Label>
                  <Input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("submittals.form.recipient", { defaultValue: "Destinatário" })}</Label>
                  <Input value={formRecipient} onChange={e => setFormRecipient(e.target.value)} placeholder="Ex: Fiscalização, Projetista" />
                </div>
                <div className="space-y-2">
                  <Label>{t("submittals.form.workItem", { defaultValue: "Atividade" })}</Label>
                  <Select value={formWorkItemId || "__none__"} onValueChange={v => setFormWorkItemId(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {workItems.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingItem && (
                <div className="space-y-2">
                  <Label>{t("submittals.form.approvalResult", { defaultValue: "Resultado da Aprovação" })}</Label>
                  <Select value={formApproval} onValueChange={setFormApproval}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APPROVAL_RESULTS.map(a => (
                        <SelectItem key={a} value={a}>{t(`submittals.approval.${a}`, { defaultValue: APPROVAL_STYLES[a]?.label ?? a })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("common.description")}</Label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder={t("submittals.form.descPlaceholder", { defaultValue: "Observações, justificação técnica..." })} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!formTitle.trim()}>
              {editingItem ? t("common.save") : t("submittals.new", { defaultValue: "Criar Submittal" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

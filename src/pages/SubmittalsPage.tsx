import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useMaterials } from "@/hooks/useMaterials";
import { technicalOfficeService } from "@/lib/services/technicalOfficeService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileCheck, Plus, Search, X, Eye, Clock, CheckCircle2, AlertTriangle,
  Send, XCircle, RotateCcw,
} from "lucide-react";
import { useProjectRole } from "@/hooks/useProjectRole";

// Submittal-specific statuses mapped to technical_office_items statuses
const SUBMITTAL_STATUSES = ["draft", "open", "in_review", "responded", "closed", "cancelled"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/60 text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  responded: "bg-accent text-accent-foreground",
  closed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const APPROVAL_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprovado", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  approved_as_noted: { label: "Aprovado c/ Comentários", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  revise_resubmit: { label: "Rever e Resubmeter", color: "bg-primary/10 text-primary" },
};

export default function SubmittalsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allItems, loading, refetch } = useTechnicalOffice();
  const { canCreate } = useProjectRole();

  // Filter only SUBMITTAL type
  const submittals = useMemo(() => allItems.filter(i => i.type === "SUBMITTAL"), [allItems]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("normal");

  const filtered = useMemo(() => {
    return submittals.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = !q || (item.code ?? "").toLowerCase().includes(q) || item.title.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [submittals, search, filterStatus]);

  const hasFilters = search || filterStatus !== "all";
  const clearFilters = () => { setSearch(""); setFilterStatus("all"); };

  // KPIs
  const kpis = useMemo(() => {
    const open = submittals.filter(s => !["closed", "cancelled"].includes(s.status)).length;
    const inReview = submittals.filter(s => s.status === "in_review").length;
    const responded = submittals.filter(s => s.status === "responded").length;
    const closed = submittals.filter(s => s.status === "closed").length;
    return { total: submittals.length, open, inReview, responded, closed };
  }, [submittals]);

  const handleCreate = async () => {
    if (!activeProject || !user || !formTitle.trim()) return;
    try {
      await technicalOfficeService.create({
        project_id: activeProject.id,
        created_by: user.id,
        type: "SUBMITTAL",
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        priority: formPriority,
        status: "open",
      });
      toast.success(t("submittals.toast.created", { defaultValue: "Submittal criado com sucesso" }));
      setDialogOpen(false);
      setFormTitle("");
      setFormDescription("");
      setFormPriority("normal");
      refetch();
    } catch {
      toast.error(t("common.error", { defaultValue: "Erro ao criar" }));
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
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
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
          <ModuleKPICard label={t("submittals.kpi.responded", { defaultValue: "Respondidos" })} value={kpis.responded} icon={CheckCircle2} color="hsl(158 45% 36%)" />
          <ModuleKPICard label={t("submittals.kpi.closed", { defaultValue: "Fechados" })} value={kpis.closed} icon={XCircle} />
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("submittals.col.priority", { defaultValue: "Prioridade" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("common.date")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/technical-office/items/${item.id}`)}>
                  <TableCell className="font-mono text-xs font-medium">{item.code ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[400px] truncate">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={item.priority === "urgent" ? "destructive" : item.priority === "high" ? "outline" : "secondary"} className="text-[10px]">
                      {t(`technicalOffice.priority.${item.priority}`, { defaultValue: item.priority })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[item.status] ?? "bg-muted text-muted-foreground"
                    )}>
                      {t(`technicalOffice.status.${item.status}`, { defaultValue: item.status })}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono tabular-nums text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/technical-office/items/${item.id}`)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("submittals.new", { defaultValue: "Novo Submittal" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("submittals.form.title", { defaultValue: "Título / Assunto" })}</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={t("submittals.form.titlePlaceholder", { defaultValue: "Ex: Aprovação de aço B500SD — Lote 12" })} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.description")}</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder={t("submittals.form.descPlaceholder", { defaultValue: "Descrição detalhada do submittal..." })} />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={!formTitle.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

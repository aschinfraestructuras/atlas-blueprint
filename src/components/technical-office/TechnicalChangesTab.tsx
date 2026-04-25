import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { exportTechnicalChangePdf, type TechnicalChange, type TechnicalChangeLabels } from "@/lib/services/technicalChangeExportService";
import { GitMerge, Plus, Pencil, Trash2, Download, Eye, AlertTriangle, CheckCircle2, Clock, FileText, Search } from "lucide-react";

const db = supabase as any;

const CHANGE_TYPES = ["design_change","site_instruction","rfi_decision","alternative_solution","derogation","exceptional_approval"] as const;
const STATUSES     = ["draft","under_review","approved","rejected","implemented","closed"] as const;
const PRIORITIES   = ["low","medium","high","critical"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft:        "bg-slate-500/15 text-slate-600",
  under_review: "bg-amber-500/15 text-amber-700",
  approved:     "bg-green-500/15 text-green-700",
  rejected:     "bg-destructive/15 text-destructive",
  implemented:  "bg-blue-500/15 text-blue-700",
  closed:       "bg-muted text-muted-foreground",
};
const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-green-500/15 text-green-700", medium: "bg-amber-500/15 text-amber-700",
  high: "bg-orange-500/15 text-orange-700", critical: "bg-destructive/15 text-destructive",
};

const EMPTY_FORM = {
  change_type: "site_instruction", title: "", description: "",
  origin_ref: "", requested_by: "", status: "draft", priority: "medium",
  submitted_at: new Date().toISOString().slice(0,10),
  approved_at: "", approved_by: "", approval_ref: "",
  implementation_deadline: "", implemented_at: "",
  requires_new_test: false, dfo_impact: "", notes: "",
  affected_work_item_id: "__none__", affected_document_id: "__none__",
};

function isOverdue(tc: TechnicalChange): boolean {
  if (!tc.implementation_deadline) return false;
  if (["implemented","closed","rejected"].includes(tc.status)) return false;
  return new Date(tc.implementation_deadline) < new Date();
}

export function TechnicalChangesTab() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  const [items, setItems] = useState<TechnicalChange[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterType, setFilterType]     = useState("__all__");

  // Dialogs — todos fora do render da lista
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<TechnicalChange | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [sheetItem, setSheetItem]   = useState<TechnicalChange | null>(null);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TechnicalChange | null>(null);
  const [previewHtml, setPreviewHtml]   = useState<string | null>(null);

  const pid = activeProject?.id ?? "";

  const fetch = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const [tcRes, wiRes] = await Promise.all([
        db.from("technical_changes").select("*, work_item:affected_work_item_id(obra,lote)")
          .eq("project_id", pid).eq("is_deleted", false)
          .order("created_at", { ascending: false }),
        db.from("work_items").select("id,obra,lote,parte,disciplina")
          .eq("project_id", pid).eq("is_deleted", false).order("lote"),
      ]);
      setItems(tcRes.data ?? []);
      setWorkItems(wiRes.data ?? []);
    } finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => items.filter(i => {
    if (filterStatus !== "__all__" && i.status !== filterStatus) return false;
    if (filterType   !== "__all__" && i.change_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.code.toLowerCase().includes(q) || i.title.toLowerCase().includes(q)
        || (i.requested_by ?? "").toLowerCase().includes(q)
        || (i.origin_ref ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [items, filterStatus, filterType, search]);

  const kpis = useMemo(() => ({
    total:       items.length,
    pending:     items.filter(i => ["draft","under_review"].includes(i.status)).length,
    approved:    items.filter(i => i.status === "approved").length,
    overdue:     items.filter(isOverdue).length,
  }), [items]);

  const setF = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (tc: TechnicalChange) => {
    setEditing(tc);
    setForm({
      change_type: tc.change_type, title: tc.title,
      description: tc.description ?? "", origin_ref: tc.origin_ref ?? "",
      requested_by: tc.requested_by ?? "", status: tc.status, priority: tc.priority,
      submitted_at: tc.submitted_at ?? "", approved_at: tc.approved_at ?? "",
      approved_by: tc.approved_by ?? "", approval_ref: tc.approval_ref ?? "",
      implementation_deadline: tc.implementation_deadline ?? "",
      implemented_at: tc.implemented_at ?? "",
      requires_new_test: tc.requires_new_test, dfo_impact: tc.dfo_impact ?? "",
      notes: tc.notes ?? "",
      affected_work_item_id: (tc as any).affected_work_item_id ?? "__none__",
      affected_document_id: (tc as any).affected_document_id ?? "__none__",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        project_id: pid,
        change_type: form.change_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        origin_ref: form.origin_ref.trim() || null,
        requested_by: form.requested_by.trim() || null,
        status: form.status,
        priority: form.priority,
        submitted_at: form.submitted_at || null,
        approved_at: form.approved_at || null,
        approved_by: form.approved_by.trim() || null,
        approval_ref: form.approval_ref.trim() || null,
        implementation_deadline: form.implementation_deadline || null,
        implemented_at: form.implemented_at || null,
        requires_new_test: form.requires_new_test,
        dfo_impact: form.dfo_impact.trim() || null,
        notes: form.notes.trim() || null,
        affected_work_item_id: form.affected_work_item_id === "__none__" ? null : form.affected_work_item_id,
        affected_document_id: form.affected_document_id === "__none__" ? null : form.affected_document_id,
        created_by: user?.id,
      };
      if (editing) {
        const { error } = await db.from("technical_changes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: t("tc.toast.updated") });
      } else {
        const { error } = await db.from("technical_changes").insert({ ...payload, code: "" });
        if (error) throw error;
        toast({ title: t("tc.toast.created") });
      }
      setFormOpen(false);
      fetch();
    } catch (err: any) {
      toast({ title: t("common.saveError"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.from("technical_changes").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", deleteTarget.id);
    toast({ title: t("tc.toast.deleted") });
    setDeleteTarget(null); fetch();
  };

  const buildLabels = (): TechnicalChangeLabels => ({
    appName: "Atlas QMS", reportTitle: t("tc.pdf.title"),
    generatedOn: t("common.generatedOn", { defaultValue: "Gerado em" }),
    page: t("common.page", { defaultValue: "Pág." }),
    yes: t("common.yes", { defaultValue: "Sim" }),
    no: t("common.no", { defaultValue: "Não" }),
    fields: {
      code: t("tc.fields.code"), type: t("tc.fields.type"),
      title: t("tc.fields.title"), status: t("tc.fields.status"),
      priority: t("tc.fields.priority"), description: t("tc.fields.description"),
      originRef: t("tc.fields.originRef"), requestedBy: t("tc.fields.requestedBy"),
      submittedAt: t("tc.fields.submittedAt"), approvedAt: t("tc.fields.approvedAt"),
      approvedBy: t("tc.fields.approvedBy"), approvalRef: t("tc.fields.approvalRef"),
      deadline: t("tc.fields.deadline"), implementedAt: t("tc.fields.implementedAt"),
      requiresTest: t("tc.fields.requiresTest"), dfoImpact: t("tc.fields.dfoImpact"),
      notes: t("common.notes"), workItem: t("tc.fields.workItem"),
    },
    types: Object.fromEntries(CHANGE_TYPES.map(k => [k, t(`tc.types.${k}`)])),
    statuses: Object.fromEntries(STATUSES.map(k => [k, t(`tc.status.${k}`)])),
    priorities: Object.fromEntries(PRIORITIES.map(k => [k, t(`tc.priority.${k}`)])),
  });

  const handleExport = (tc: TechnicalChange) => {
    exportTechnicalChangePdf(tc, activeProject?.name ?? "", logoBase64 ?? null, buildLabels());
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: t("tc.kpi.total"),    value: kpis.total,    color: "" },
          { label: t("tc.kpi.pending"),  value: kpis.pending,  color: "text-amber-600" },
          { label: t("tc.kpi.approved"), value: kpis.approved, color: "text-green-600" },
          { label: t("tc.kpi.overdue"),  value: kpis.overdue,  color: kpis.overdue > 0 ? "text-destructive" : "" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + acção */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("tc.search")} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("tc.filter.allStatus")}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{t(`tc.status.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("tc.filter.allTypes")}</SelectItem>
            {CHANGE_TYPES.map(s => <SelectItem key={s} value={s}>{t(`tc.types.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button size="sm" className="gap-1.5 h-8" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" />{t("tc.new")}
          </Button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <GitMerge className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("tc.empty")}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t("tc.emptyDesc")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t("tc.fields.code")}</TableHead>
                <TableHead className="text-xs">{t("tc.fields.type")}</TableHead>
                <TableHead className="text-xs">{t("tc.fields.title")}</TableHead>
                <TableHead className="text-xs">{t("tc.fields.status")}</TableHead>
                <TableHead className="text-xs">{t("tc.fields.priority")}</TableHead>
                <TableHead className="text-xs">{t("tc.fields.deadline")}</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(tc => (
                <TableRow key={tc.id} className="cursor-pointer hover:bg-muted/20"
                  onClick={() => { setSheetItem(tc); setSheetOpen(true); }}>
                  <TableCell className="font-mono text-xs font-semibold">{tc.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t(`tc.types.${tc.change_type}`, { defaultValue: tc.change_type })}
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{tc.title}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", STATUS_STYLES[tc.status])}>
                      {t(`tc.status.${tc.status}`, { defaultValue: tc.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", PRIORITY_STYLES[tc.priority])}>
                      {t(`tc.priority.${tc.priority}`, { defaultValue: tc.priority })}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-xs", isOverdue(tc) && "text-destructive font-semibold")}>
                    {tc.implementation_deadline
                      ? <span className="flex items-center gap-1">
                          {isOverdue(tc) && <AlertTriangle className="h-3 w-3" />}
                          {new Date(tc.implementation_deadline).toLocaleDateString("pt-PT")}
                        </span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title={t("tc.export")}
                        onClick={() => handleExport(tc)}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(tc)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive"
                        onClick={() => setDeleteTarget(tc)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Formulário Dialog ─────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              {editing ? t("tc.edit") : t("tc.new")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("tc.section.identification")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.type")} *</Label>
                <Select value={form.change_type} onValueChange={v => setF("change_type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map(k => <SelectItem key={k} value={k}>{t(`tc.types.${k}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.priority")}</Label>
                <Select value={form.priority} onValueChange={v => setF("priority", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(k => <SelectItem key={k} value={k}>{t(`tc.priority.${k}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("tc.fields.title")} *</Label>
                <Input value={form.title} onChange={e => setF("title", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("tc.fields.description")}</Label>
                <Textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={3} className="text-xs resize-none" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.originRef")}</Label>
                <Input value={form.origin_ref} onChange={e => setF("origin_ref", e.target.value)} className="h-8 text-xs" placeholder="Carta IP, email, acta..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.requestedBy")}</Label>
                <Input value={form.requested_by} onChange={e => setF("requested_by", e.target.value)} className="h-8 text-xs" placeholder="IP, Fiscalização, TQ..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.workItem")}</Label>
                <Select value={form.affected_work_item_id} onValueChange={v => setF("affected_work_item_id", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {workItems.map(w => <SelectItem key={w.id} value={w.id}>{w.lote || w.obra} — {w.parte || ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.submittedAt")}</Label>
                <Input type="date" value={form.submitted_at} onChange={e => setF("submitted_at", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <Separator />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("tc.section.approval")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.status")}</Label>
                <Select value={form.status} onValueChange={v => setF("status", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(k => <SelectItem key={k} value={k}>{t(`tc.status.${k}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.approvedAt")}</Label>
                <Input type="date" value={form.approved_at} onChange={e => setF("approved_at", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.approvedBy")}</Label>
                <Input value={form.approved_by} onChange={e => setF("approved_by", e.target.value)} className="h-8 text-xs" placeholder="IP, Fiscalização..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.approvalRef")}</Label>
                <Input value={form.approval_ref} onChange={e => setF("approval_ref", e.target.value)} className="h-8 text-xs" placeholder="Ref. ofício, carta..." />
              </div>
            </div>

            <Separator />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("tc.section.implementation")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.deadline")}</Label>
                <Input type="date" value={form.implementation_deadline} onChange={e => setF("implementation_deadline", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("tc.fields.implementedAt")}</Label>
                <Input type="date" value={form.implemented_at} onChange={e => setF("implemented_at", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <Switch checked={form.requires_new_test} onCheckedChange={v => setF("requires_new_test", v)} />
                <Label className="text-xs cursor-pointer">{t("tc.fields.requiresTest")}</Label>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("tc.fields.dfoImpact")}</Label>
                <Textarea value={form.dfo_impact} onChange={e => setF("dfo_impact", e.target.value)}
                  rows={2} className="text-xs resize-none border-amber-300 focus:border-amber-500"
                  placeholder={t("tc.placeholders.dfoImpact")} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("common.notes")}</Label>
                <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2} className="text-xs resize-none" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="gap-1.5">
              {saving ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sheet de detalhe ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {sheetItem && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4" />
                  {sheetItem.code}
                </SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("text-[10px]", STATUS_STYLES[sheetItem.status])}>
                    {t(`tc.status.${sheetItem.status}`)}
                  </Badge>
                  <Badge className={cn("text-[10px]", PRIORITY_STYLES[sheetItem.priority])}>
                    {t(`tc.priority.${sheetItem.priority}`)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {t(`tc.types.${sheetItem.change_type}`)}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-4 mt-2">
                <p className="text-sm font-semibold">{sheetItem.title}</p>
                {sheetItem.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded p-3">
                    {sheetItem.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    [t("tc.fields.originRef"),     sheetItem.origin_ref],
                    [t("tc.fields.requestedBy"),   sheetItem.requested_by],
                    [t("tc.fields.submittedAt"),   sheetItem.submitted_at ? new Date(sheetItem.submitted_at+"T00:00:00").toLocaleDateString("pt-PT") : null],
                    [t("tc.fields.approvedAt"),    sheetItem.approved_at ? new Date(sheetItem.approved_at+"T00:00:00").toLocaleDateString("pt-PT") : null],
                    [t("tc.fields.approvedBy"),    sheetItem.approved_by],
                    [t("tc.fields.approvalRef"),   sheetItem.approval_ref],
                    [t("tc.fields.deadline"),      sheetItem.implementation_deadline ? new Date(sheetItem.implementation_deadline+"T00:00:00").toLocaleDateString("pt-PT") : null],
                    [t("tc.fields.implementedAt"), sheetItem.implemented_at ? new Date(sheetItem.implemented_at+"T00:00:00").toLocaleDateString("pt-PT") : null],
                  ].filter(([,v]) => v).map(([label, val]) => (
                    <div key={label as string} className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground">{label as string}</p>
                      <p className="font-medium">{val as string}</p>
                    </div>
                  ))}
                </div>

                {sheetItem.requires_new_test && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    {t("tc.fields.requiresTest")}
                  </div>
                )}

                {sheetItem.dfo_impact && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-amber-700">{t("tc.fields.dfoImpact")}</p>
                    <p className="text-xs whitespace-pre-wrap text-amber-800">{sheetItem.dfo_impact}</p>
                  </div>
                )}

                {sheetItem.notes && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{t("common.notes")}</p>
                    <p className="text-xs whitespace-pre-wrap">{sheetItem.notes}</p>
                  </div>
                )}

                <Separator />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("tc.attachments")}
                </p>
                <AttachmentsPanel
                  projectId={pid}
                  entityType={"technical_changes" as any}
                  entityId={sheetItem.id}
                />

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => handleExport(sheetItem)}>
                    <Download className="h-3.5 w-3.5" />{t("tc.export")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => { setSheetOpen(false); openEdit(sheetItem); }}>
                    <Pencil className="h-3.5 w-3.5" />{t("common.edit")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tc.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("tc.deleteDesc", { code: deleteTarget?.code ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

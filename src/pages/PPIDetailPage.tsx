import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle,
  Clock, Loader2, Construction, Calendar, CheckCheck,
  Save, AlertTriangle, Link2, Archive, Trash2, Pencil, FileText, Info, Bell,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HPNotificationPanel } from "@/components/ppi/HPNotificationPanel";
import { PPIExportMenu } from "@/components/ppi/PPIExportMenu";
import { FieldRecordsTab } from "@/components/ppi/FieldRecordsTab";
import type { PpiInstanceForExport } from "@/lib/services/ppiExportService";
import {
  ppiService,
  type PpiInstance,
  type PpiInstanceItem,
  type PpiInstanceStatus,
  type PpiItemResult,
} from "@/lib/services/ppiService";
import { ncService } from "@/lib/services/ncService";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-32 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

// ─── Result styles ────────────────────────────────────────────────────────────

const RESULT_STYLES: Record<string, string> = {
  pending: "border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  pass:    "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  fail:    "border-destructive/40 bg-destructive/10 text-destructive",
  na:      "border-border text-muted-foreground bg-muted/40",
};

function ResultBadge({ result, t }: { result: PpiItemResult; t: (k: string) => string }) {
  return (
    <Badge variant="outline" className={cn("text-xs", RESULT_STYLES[result])}>
      {t(`ppi.instances.results.${result}`)}
    </Badge>
  );
}

const INSPECTION_POINT_BADGE: Record<string, string> = {
  hp: "bg-destructive/10 text-destructive",
  wp: "bg-accent text-accent-foreground",
  rp: "bg-primary/15 text-primary",
};

// ─── Status workflow config ───────────────────────────────────────────────────

type Transition = {
  from: PpiInstanceStatus;
  to: PpiInstanceStatus;
  labelKey: string;
  variant: "default" | "secondary" | "destructive" | "outline";
};

const TRANSITIONS: Transition[] = [
  { from: "draft",       to: "in_progress", labelKey: "ppi.transitions.start",    variant: "default"     },
  { from: "draft",       to: "archived",    labelKey: "ppi.transitions.archive",  variant: "outline"     },
  { from: "in_progress", to: "submitted",   labelKey: "ppi.transitions.submit",   variant: "default"     },
  { from: "in_progress", to: "archived",    labelKey: "ppi.transitions.archive",  variant: "outline"     },
  { from: "submitted",   to: "approved",    labelKey: "ppi.transitions.approve",  variant: "secondary"   },
  { from: "submitted",   to: "rejected",    labelKey: "ppi.transitions.reject",   variant: "destructive" },
  { from: "submitted",   to: "archived",    labelKey: "ppi.transitions.archive",  variant: "outline"     },
  { from: "rejected",    to: "in_progress", labelKey: "ppi.transitions.reopen",   variant: "default"     },
  { from: "rejected",    to: "archived",    labelKey: "ppi.transitions.archive",  variant: "outline"     },
  { from: "approved",    to: "archived",    labelKey: "ppi.transitions.archive",  variant: "outline"     },
];

// Editable statuses
const EDITABLE_STATUSES: PpiInstanceStatus[] = ["draft", "in_progress", "rejected"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPIDetailPage() {
  const { t }             = useTranslation();
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { activeProject } = useProject();
  const { user }          = useAuth();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/ppi", { replace: true });
    }
  }, [id, navigate, t]);

  const [instance,    setInstance]    = useState<PpiInstance | null>(null);
  const [items,       setItems]       = useState<PpiInstanceItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null);
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const [workItem,    setWorkItem]    = useState<{ sector: string; disciplina: string } | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string | null>(null);
  const [exportInst,  setExportInst]  = useState<PpiInstanceForExport | null>(null);

  // Inspection date inline edit
  const [editingDate,     setEditingDate]     = useState(false);
  const [dateValue,       setDateValue]       = useState("");
  const [savingDate,      setSavingDate]      = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Local draft for bulk editing: itemId → {result, notes}
  const [draft, setDraft] = useState<Record<string, { result: PpiItemResult; notes: string }>>({});
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());

  // Status transition confirm
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null);
  const [transitioning,     setTransitioning]     = useState(false);
  const [rejectionReason,   setRejectionReason]   = useState("");

  // Delete draft confirm
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting,         setDeleting]         = useState(false);

  // NOK → NC dialog
  const [ncDialogItem, setNcDialogItem] = useState<PpiInstanceItem | null>(null);
  const [creatingNc,   setCreatingNc]   = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { items: its, ...inst } = await ppiService.getInstance(id);
      setInstance(inst);
      setItems(its);
      setDateValue(inst.inspection_date ?? "");

      // Initialize draft from current values
      const initialDraft: Record<string, { result: PpiItemResult; notes: string }> = {};
      its.forEach((it) => { initialDraft[it.id] = { result: it.result, notes: it.notes ?? "" }; });
      setDraft(initialDraft);
      setDirtyItems(new Set());

      // Load work item + template in parallel
      const [wiResult, tmplResult] = await Promise.all([
        supabase.from("work_items").select("sector, disciplina").eq("id", inst.work_item_id).single(),
        inst.template_id
          ? supabase.from("ppi_templates").select("title, code").eq("id", inst.template_id).single()
          : Promise.resolve({ data: null }),
      ]);
      setWorkItem(wiResult.data ?? null);
      setTemplateTitle((tmplResult.data as { title?: string } | null)?.title ?? null);

      // Build enriched instance for export
      setExportInst({
        ...inst,
        items: its,
        work_item_sector: wiResult.data?.sector ?? null,
        work_item_disciplina: wiResult.data?.disciplina ?? null,
        template_code: (tmplResult.data as { code?: string } | null)?.code ?? null,
      });
    } catch {
      toast({ title: t("ppi.instances.toast.error"), variant: "destructive" });
      navigate("/ppi");
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Inspection date save ───────────────────────────────────────────────────

  async function handleSaveDate() {
    if (!instance || !activeProject) return;
    setSavingDate(true);
    try {
      const updated = await ppiService.updateInspectionDate(
        instance.id, activeProject.id, dateValue || null
      );
      setInstance((prev) => prev ? { ...prev, inspection_date: updated.inspection_date } : prev);
      setEditingDate(false);
      toast({ title: t("ppi.instances.toast.updated") });
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSavingDate(false);
    }
  }

  useEffect(() => {
    if (editingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [editingDate]);

  // ── Draft edit helpers ─────────────────────────────────────────────────────

  const isReadOnly = instance ? !EDITABLE_STATUSES.includes(instance.status) : true;

  function setItemResult(itemId: string, result: PpiItemResult) {
    setDraft((prev) => ({ ...prev, [itemId]: { ...prev[itemId], result } }));
    setDirtyItems((prev) => new Set(prev).add(itemId));
  }

  function setItemNotes(itemId: string, notes: string) {
    setDraft((prev) => ({ ...prev, [itemId]: { ...prev[itemId], notes } }));
    setDirtyItems((prev) => new Set(prev).add(itemId));
  }

  // ── Bulk save ──────────────────────────────────────────────────────────────

  async function handleBulkSave() {
    if (!activeProject || !instance || dirtyItems.size === 0) return;
    setBulkSaving(true);
    try {
      const payload = Array.from(dirtyItems).map((id) => ({
        id,
        result: draft[id].result,
        notes:  draft[id].notes || null,
      }));

      await ppiService.bulkSaveItems(instance.id, activeProject.id, payload);

      // Refresh items from server
      const { data: freshItems } = await supabase
        .from("ppi_instance_items")
        .select("*")
        .eq("instance_id", instance.id)
        .order("item_no", { ascending: true });

      const updated = (freshItems ?? []) as PpiInstanceItem[];
      setItems(updated);
      setDirtyItems(new Set());

      // Check if any NOK items were saved — open NC prompt for the first one
      const nokItems = updated.filter((it) => it.result === "fail" && !it.nc_id);
      if (nokItems.length > 0) {
        setNcDialogItem(nokItems[0]);
      }

      toast({ title: t("ppi.instances.toast.bulkSaved", { count: payload.length }) });
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      // best-effort — no cleanup needed
    }
  }

  // ── Mark all OK ────────────────────────────────────────────────────────────

  async function handleMarkAllOk() {
    if (!activeProject || !instance) return;
    setBulkSaving(true);
    try {
      const count = await ppiService.bulkMarkAllOk(instance.id, activeProject.id);

      const { data: freshItems } = await supabase
        .from("ppi_instance_items")
        .select("*")
        .eq("instance_id", instance.id)
        .order("item_no", { ascending: true });

      const updated = (freshItems ?? []) as PpiInstanceItem[];
      setItems(updated);

      // Sync draft
      const newDraft: Record<string, { result: PpiItemResult; notes: string }> = {};
      updated.forEach((it) => { newDraft[it.id] = { result: it.result, notes: it.notes ?? "" }; });
      setDraft(newDraft);
      setDirtyItems(new Set());

      toast({ title: t("ppi.instances.toast.allMarkedOk", { count }) });
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  }

  // ── Status transition ──────────────────────────────────────────────────────

  async function confirmTransition() {
    if (!pendingTransition || !instance || !activeProject) return;
    // Require reason for rejection
    if (pendingTransition.to === "rejected" && !rejectionReason.trim()) {
      toast({ title: t("ppi.rejection.reasonRequired"), variant: "destructive" });
      return;
    }
    setTransitioning(true);
    try {
      await ppiService.updateInstanceStatus(
        instance.id, activeProject.id, instance.status, pendingTransition.to,
        pendingTransition.to === "rejected" ? rejectionReason.trim() : undefined
      );
      toast({ title: t("ppi.instances.toast.statusChanged", { status: t(`ppi.status.${pendingTransition.to}`) }) });
      setRejectionReason("");
      load();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setTransitioning(false);
      setPendingTransition(null);
    }
  }

  // ── Delete draft (hard delete) ─────────────────────────────────────────────

  async function handleDeleteDraft() {
    if (!instance || !activeProject || instance.status !== "draft") return;
    setDeleting(true);
    try {
      await ppiService.softDeleteInstance(instance.id, activeProject.id);
      toast({ title: t("ppi.instances.toast.deleted", { defaultValue: "Rascunho eliminado." }) });
      navigate("/ppi");
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  // ── Create NC from NOK item ────────────────────────────────────────────────

  async function handleCreateNc() {
    if (!ncDialogItem || !instance || !activeProject || !user) return;
    setCreatingNc(true);
    try {
      const nc = await ncService.createFromPpiItem(ncDialogItem.id, {
        severity: "major",
      });

      // Link NC to item
      await ppiService.linkNcToItem(ncDialogItem.id, nc.id, activeProject.id);

      // Update local state
      setItems((prev) =>
        prev.map((it) => it.id === ncDialogItem.id ? { ...it, nc_id: nc.id, requires_nc: true } : it)
      );

      toast({ title: t("ppi.instances.toast.ncCreated") });
      setNcDialogItem(null);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setCreatingNc(false);
    }
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  const pendingCount = items.filter((it) => it.result === "pending").length;
  const okCount      = items.filter((it) => it.result === "pass").length;
  const nokCount     = items.filter((it) => it.result === "fail").length;
  const naCount      = items.filter((it) => it.result === "na").length;
  const totalReviewed = okCount + nokCount + naCount;
  const progressPct   = items.length > 0 ? Math.round((totalReviewed / items.length) * 100) : 0;

  const availableTransitions = instance
    ? TRANSITIONS.filter((tr) => tr.from === instance.status)
    : [];

  // HP items detection
  const hpItems = useMemo(
    () => items.filter((it) => (it as any).ipt_e === "hp" || (it as any).ipt_f === "hp" || (it as any).ipt_ip === "hp"),
    [items]
  );
  const hasHpItems = hpItems.length > 0;
  const hpPendingResult = hpItems.filter((it) => it.result === "pending" || it.result === "fail").length;

  const hasHoldPointWarning = pendingTransition?.to === "submitted" && hpPendingResult > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!instance) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* ── Back + Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ppi")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("ppi.instances.detail.title")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <span className="font-mono">{instance.code}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <PPIStatusBadge status={instance.status} />
              {workItem && (
                <span className="text-xs text-muted-foreground">
                  {t(`ppi.disciplinas.${workItem.disciplina}`, { defaultValue: workItem.disciplina })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons area */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          {exportInst && (
            <PPIExportMenu
              instances={[exportInst]}
              projectName={activeProject?.name ?? ""}
              variant="single"
            />
          )}
          {/* Bulk actions (only when editable) */}
          {!isReadOnly && items.length > 0 && (
            <>
              {dirtyItems.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkSave}
                  disabled={bulkSaving}
                  className="gap-1.5"
                >
                  {bulkSaving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5" />}
                  {t("ppi.instances.detail.bulkSave")}
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-px">
                    {dirtyItems.size}
                  </Badge>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllOk}
                disabled={bulkSaving || pendingCount === 0}
                className="gap-1.5"
              >
                {bulkSaving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCheck className="h-3.5 w-3.5" />}
                {t("ppi.instances.detail.markAllOk")}
              </Button>
            </>
          )}

          {/* Status transition buttons */}
          {availableTransitions.map((tr) => (
            <Button
              key={tr.to}
              variant={tr.variant}
              size="sm"
              onClick={() => setPendingTransition(tr)}
              className="gap-1.5"
            >
              {tr.to === "approved"  && <CheckCircle2 className="h-3.5 w-3.5" />}
              {tr.to === "rejected"  && <XCircle      className="h-3.5 w-3.5" />}
              {tr.to === "archived"  && <Archive      className="h-3.5 w-3.5" />}
              {t(tr.labelKey)}
            </Button>
          ))}

          {/* Delete draft button — only for draft status */}
          {instance.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("ppi.instances.detail.deleteDraft", { defaultValue: "Eliminar rascunho" })}
            </Button>
          )}
        </div>
      </div>

      {/* ── Info card ────────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("ppi.instances.detail.generalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow
              label={t("ppi.instances.detail.workItem")}
              value={
                workItem ? (
                  <Link
                    to={`/work-items/${instance.work_item_id}`}
                    className="text-primary underline underline-offset-2 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Construction className="h-3.5 w-3.5" /> {workItem.sector}
                  </Link>
                ) : instance.work_item_id
              }
            />
            <InfoRow
              label={t("ppi.instances.detail.template")}
              value={templateTitle
                ? <span className="text-sm">{templateTitle}</span>
                : instance.template_id
                  ? <span className="font-mono text-xs text-muted-foreground">{instance.template_id.slice(0, 8)}…</span>
                  : <span className="italic text-muted-foreground text-xs">{t("ppi.instances.form.noTemplate")}</span>
              }
            />
            {/* Inspection date — editable when status allows */}
            <div className="flex items-start gap-2 py-2 border-b border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-32 flex-shrink-0 mt-0.5">
                {t("ppi.instances.detail.inspectionDate")}
              </span>
              <div className="flex items-center gap-2 flex-1">
                {editingDate ? (
                  <>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="text-sm border border-border rounded-md px-2 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveDate();
                        if (e.key === "Escape") { setEditingDate(false); setDateValue(instance.inspection_date ?? ""); }
                      }}
                    />
                    <button
                      onClick={handleSaveDate}
                      disabled={savingDate}
                      className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {savingDate ? <Loader2 className="h-3 w-3 animate-spin inline" /> : t("common.save")}
                    </button>
                    <button
                      onClick={() => { setEditingDate(false); setDateValue(instance.inspection_date ?? ""); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {instance.inspection_date
                        ? new Date(instance.inspection_date + "T12:00:00").toLocaleDateString()
                        : <span className="text-muted-foreground">—</span>}
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={() => { setDateValue(instance.inspection_date ?? ""); setEditingDate(true); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={t("ppi.instances.detail.editInspectionDate")}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <InfoRow
              label={t("ppi.instances.detail.openedAt")}
              value={
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {new Date(instance.opened_at).toLocaleDateString()}
                </span>
              }
            />
            {instance.closed_at && (
              <InfoRow
                label={t("ppi.instances.detail.closedAt")}
                value={new Date(instance.closed_at).toLocaleDateString()}
              />
            )}
            {instance.status === "rejected" && instance.rejection_reason && (
              <InfoRow
                label={t("ppi.rejection.reasonLabel")}
                value={
                  <span className="text-destructive text-sm">{instance.rejection_reason}</span>
                }
              />
            )}
          </div>
          <div>
            {/* Progress summary */}
            <div className="py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {t("ppi.instances.table.progress")}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalReviewed}/{items.length} {t("ppi.instances.detail.reviewed")}</span>
                  <span className="font-bold">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-1.5" />
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      <Clock className="h-3 w-3" /> {pendingCount} {t("ppi.instances.results.pending")}
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 text-xs border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> {okCount} {t("ppi.instances.results.ok")}
                  </Badge>
                  {nokCount > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs border-destructive/40 text-destructive">
                      <XCircle className="h-3 w-3" /> {nokCount} {t("ppi.instances.results.nok")}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {naCount} {t("ppi.instances.results.na")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs: Checklist / NOT-HP / Attachments ────────────────────── */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("ppi.instances.detail.checklistTitle")}
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
              {items.length}
            </span>
          </TabsTrigger>
          {hasHpItems && (
            <TabsTrigger value="not-hp" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              NOT-HP
              {hpPendingResult > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 py-px text-[10px] font-bold text-destructive-foreground">
                  {hpItems.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="field-records" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            GRs
          </TabsTrigger>
          <TabsTrigger value="attachments">
            {t("ppi.templates.items.evidenceRequired")}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("documents.linkedPanel.title")}
          </TabsTrigger>
        </TabsList>

        {/* Field Records (GR) tab */}
        <TabsContent value="field-records" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <FieldRecordsTab
                instanceId={instance.id}
                ppiCode={instance.code}
                disciplina={workItem?.disciplina}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist tab */}
        <TabsContent value="checklist" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <ClipboardCheck className="h-6 w-6 opacity-40" />
                  <p className="text-sm">{t("ppi.instances.detail.noItems")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* IPT Legend */}
                  <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-muted/20 border-b border-border text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground font-medium">
                      <Info className="h-3 w-3" /> {t("ppi.ipt.legend", { defaultValue: "Pontos de Inspeção:" })}
                    </span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> <span className="text-destructive font-semibold">HP</span> <span className="text-muted-foreground">{t("ppi.ipt.hp.short", { defaultValue: "Paragem obrigatória" })}</span></span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-amber-600 font-semibold">WP</span> <span className="text-muted-foreground">{t("ppi.ipt.wp.short", { defaultValue: "Presença prevista" })}</span></span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> <span className="text-primary font-semibold">RP</span> <span className="text-muted-foreground">{t("ppi.ipt.rp.short", { defaultValue: "Revisão documental" })}</span></span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-10">
                          {t("ppi.instances.items.itemNo")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("ppi.instances.items.label")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                          {t("ppi.instances.items.result")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                          {t("ppi.instances.items.notes")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell w-36">
                          {t("ppi.instances.items.checkedAt")}
                        </th>
                        <th className="w-10 px-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => {
                        const d = draft[item.id] ?? { result: item.result, notes: item.notes ?? "" };
                        const isDirty    = dirtyItems.has(item.id);
                        const isNok      = d.result === "fail";
                        const hasNc      = !!item.nc_id;
                        const itemSaving = saving === item.id;

                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              "transition-colors",
                              isDirty ? "bg-primary/5" : "hover:bg-muted/10",
                              isNok && !hasNc && "bg-destructive/5"
                            )}
                          >
                            {/* # */}
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground align-top pt-4">
                              {item.item_no}
                            </td>

                            {/* Label — check_code oculto (apenas interno) */}
                            <td className="px-4 py-3 align-top pt-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.inspection_point_type && item.inspection_point_type !== "na" && (
                                  <Badge variant="secondary" className={cn("text-[10px] font-bold", INSPECTION_POINT_BADGE[item.inspection_point_type] ?? "")}>{item.inspection_point_type.toUpperCase()}</Badge>
                                )}
                                <p className="font-medium text-foreground text-sm">{item.label}</p>
                              </div>
                              {/* IPT badges: E / F / IP with tooltips */}
                              <TooltipProvider delayDuration={200}>
                                <div className="flex gap-1 mt-1">
                                  {["ipt_e", "ipt_f", "ipt_ip"].map((field) => {
                                    const val = (item as any)[field] as string | null;
                                    const label = field === "ipt_e" ? "E" : field === "ipt_f" ? "F" : "IP";
                                    const displayVal = val ? val.toUpperCase() : "N/A";
                                    const colorClass =
                                      val === "hp" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                                      val === "wp" ? "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
                                      val === "rp" ? "border-primary/40 bg-primary/10 text-primary" :
                                      "border-border text-muted-foreground bg-muted/30";
                                    const tooltipKey =
                                      val === "hp" ? "ppi.ipt.hp.tooltip" :
                                      val === "wp" ? "ppi.ipt.wp.tooltip" :
                                      val === "rp" ? "ppi.ipt.rp.tooltip" :
                                      "ppi.ipt.na.tooltip";
                                    return (
                                      <Tooltip key={field}>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className={cn("text-[9px] font-bold cursor-help", colorClass)}>
                                            {label}: {displayVal}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px] text-xs">
                                          {t(tooltipKey)}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </TooltipProvider>
                              {isNok && (
                                <div className="mt-1.5 flex items-center gap-1">
                                  {hasNc ? (
                                    <Badge variant="outline" className="gap-1 text-[10px] border-destructive/40 text-destructive">
                                      <Link2 className="h-2.5 w-2.5" />
                                      NC {item.nc_id!.slice(0, 6)}…
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-[10px] border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      {t("ppi.instances.items.requiresNc")}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {(item as any).evidence_required && (d.result === "pass" || d.result === "fail") && (
                                <div className="mt-1">
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-[10px] border-primary/30 text-primary cursor-pointer hover:bg-primary/5"
                                    onClick={() => navigate(`/tests?ppi_ref=${encodeURIComponent(instance.code)}&item=${encodeURIComponent((item as any).check_code ?? item.item_no)}`)}
                                  >
                                    📋 BE-CAMPO
                                  </Badge>
                                </div>
                              )}
                            </td>

                            {/* Result selector */}
                            <td className="px-4 py-3 align-top pt-4">
                              {isReadOnly ? (
                                <ResultBadge result={d.result} t={t} />
                              ) : (
                                <div className="flex gap-1 flex-wrap">
                                  {/* If still pending, show grey pill */}
                                  {d.result === "pending" && !isDirty && (
                                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", RESULT_STYLES["pending"])}>
                                      {t("ppi.instances.results.pending")}
                                    </span>
                                  )}
                                  {(["pass", "fail", "na"] as PpiItemResult[]).map((r) => (
                                    <button
                                      key={r}
                                      disabled={itemSaving || bulkSaving}
                                      onClick={() => setItemResult(item.id, r)}
                                      className={cn(
                                        "rounded-md border px-2 py-0.5 text-xs font-medium transition-all",
                                        d.result === r
                                          ? RESULT_STYLES[r]
                                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                        (itemSaving || bulkSaving) && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      {t(`ppi.instances.results.${r}`)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Notes */}
                            <td className="px-4 py-3 hidden md:table-cell align-top pt-4">
                              {isReadOnly ? (
                                <span className="text-xs text-muted-foreground">{item.notes || "—"}</span>
                              ) : (
                                <Textarea
                                  rows={1}
                                  value={d.notes}
                                  onChange={(e) => setItemNotes(item.id, e.target.value)}
                                  placeholder={t("ppi.instances.items.notesPlaceholder")}
                                  className="text-xs min-w-[140px] resize-none h-8 py-1"
                                />
                              )}
                            </td>

                            {/* checked_at timestamp (read-only column — updated by server on save) */}
                            <td className="px-4 py-3 hidden xl:table-cell align-top pt-4">
                              {item.checked_at ? (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    {new Date(item.checked_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60">
                                    {new Date(item.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/40">—</span>
                              )}
                            </td>

                            {/* NOK → NC button */}
                            <td className="px-2 py-3 align-top pt-4">
                              {!isReadOnly && isNok && !hasNc && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title={t("ppi.instances.detail.createNc")}
                                  onClick={() => setNcDialogItem(item)}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Sticky bulk-save footer when there are dirty items */}
                  {!isReadOnly && dirtyItems.size > 0 && (
                    <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {t("ppi.instances.detail.unsavedChanges", { count: dirtyItems.size })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={load}
                          disabled={bulkSaving}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleBulkSave}
                          disabled={bulkSaving}
                          className="gap-1.5"
                        >
                          {bulkSaving
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Save className="h-3.5 w-3.5" />}
                          {t("ppi.instances.detail.bulkSave")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOT-HP tab */}
        {hasHpItems && (
          <TabsContent value="not-hp" className="mt-4">
            <HPNotificationPanel
              instance={instance}
              items={items}
              projectId={activeProject?.id ?? ""}
            />
          </TabsContent>
        )}

        {/* Attachments / Evidence tab */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="ppi_instances"
            entityId={instance.id}
            projectId={activeProject?.id ?? ""}
            readOnly={["approved", "archived"].includes(instance.status)}
          />
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4">
          <LinkedDocumentsPanel
            entityType="ppi_instance"
            entityId={instance.id}
            projectId={activeProject?.id ?? ""}
          />
        </TabsContent>
      </Tabs>

      {/* ── Status transition confirm ─────────────────────────────────── */}
      <AlertDialog
        open={!!pendingTransition}
        onOpenChange={(v) => { if (!v) { setPendingTransition(null); setRejectionReason(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingTransition?.to === "rejected"
                ? t("ppi.rejection.title")
                : pendingTransition ? t(pendingTransition.labelKey) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTransition?.to === "rejected"
                ? t("ppi.rejection.description", { code: instance.code })
                : hasHoldPointWarning
                  ? t("ppi.instances.detail.holdPointWarning")
                  : `${instance.code} · ${t("ppi.status." + instance.status)} → ${t("ppi.status." + (pendingTransition?.to ?? "draft"))}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingTransition?.to === "rejected" && (
            <div className="px-1 py-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("ppi.rejection.reasonLabel")} <span className="text-destructive">*</span>
              </label>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("ppi.rejection.reasonPlaceholder")}
                className="resize-none"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransition}
              disabled={transitioning || (pendingTransition?.to === "rejected" && !rejectionReason.trim())}
              className={pendingTransition?.to === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {transitioning
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : pendingTransition?.to === "rejected"
                  ? t("ppi.rejection.confirm")
                  : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── NOK → Create NC dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={!!ncDialogItem}
        onOpenChange={(v) => { if (!v) setNcDialogItem(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t("ppi.instances.detail.createNcTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("ppi.instances.detail.createNcDescription", {
                item: ncDialogItem ? `#${ncDialogItem.item_no} ${ncDialogItem.label}` : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNcDialogItem(null)}>
              {t("ppi.instances.detail.createNcSkip")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateNc}
              disabled={creatingNc}
              className="bg-destructive hover:bg-destructive/90"
            >
              {creatingNc
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : t("ppi.instances.detail.createNcConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete draft confirm ──────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(v) => { if (!v) setDeleteDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("ppi.instances.detail.deleteDraft", { defaultValue: "Eliminar rascunho" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("ppi.instances.detail.deleteDraftDescription", {
                defaultValue: "Esta ação é irreversível. O rascunho {{code}} e todos os seus itens serão permanentemente eliminados.",
                code: instance.code,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : t("ppi.instances.detail.deleteDraftConfirm", { defaultValue: "Eliminar permanentemente" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

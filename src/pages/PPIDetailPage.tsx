import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle,
  Clock, Loader2, Construction, Calendar,
} from "lucide-react";
import {
  ppiService,
  type PpiInstance,
  type PpiInstanceItem,
  type PpiInstanceStatus,
  type PpiItemResult,
} from "@/lib/services/ppiService";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

// ─── Result pill ──────────────────────────────────────────────────────────────

const RESULT_STYLES: Record<PpiItemResult, string> = {
  pending: "border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  na:      "border-border text-muted-foreground bg-muted/40",
  pass:    "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  fail:    "border-destructive/40 bg-destructive/10 text-destructive",
};

function ResultBadge({ result, t }: { result: PpiItemResult; t: (k: string) => string }) {
  return (
    <Badge variant="outline" className={cn("text-xs", RESULT_STYLES[result])}>
      {t(`ppi.instances.results.${result}`)}
    </Badge>
  );
}

// ─── Status workflow config ───────────────────────────────────────────────────

type Transition = { from: PpiInstanceStatus; to: PpiInstanceStatus; labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" };

const TRANSITIONS: Transition[] = [
  { from: "draft",       to: "in_progress", labelKey: "ppi.status.in_progress", variant: "default"     },
  { from: "in_progress", to: "submitted",   labelKey: "ppi.status.submitted",   variant: "default"     },
  { from: "submitted",   to: "approved",    labelKey: "ppi.status.approved",    variant: "secondary"   },
  { from: "submitted",   to: "rejected",    labelKey: "ppi.status.rejected",    variant: "destructive" },
  { from: "rejected",    to: "in_progress", labelKey: "ppi.status.in_progress", variant: "default"     },
  { from: "approved",    to: "archived",    labelKey: "ppi.status.archived",    variant: "outline"     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPIDetailPage() {
  const { t }             = useTranslation();
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { activeProject } = useProject();

  const [instance,    setInstance]    = useState<PpiInstance | null>(null);
  const [items,       setItems]       = useState<PpiInstanceItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null); // itemId being saved
  const [workItem,    setWorkItem]    = useState<{ sector: string; disciplina: string } | null>(null);

  // Notes state per item
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Status transition confirm
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null);
  const [transitioning,     setTransitioning]     = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const { items: its, ...inst } = await ppiService.getInstance(id);
      setInstance(inst);
      setItems(its);

      const initialNotes: Record<string, string> = {};
      its.forEach((it) => { initialNotes[it.id] = it.notes ?? ""; });
      setNotes(initialNotes);

      // Load work item info
      const { data: wi } = await supabase
        .from("work_items")
        .select("sector, disciplina")
        .eq("id", inst.work_item_id)
        .single();
      setWorkItem(wi ?? null);
    } catch {
      toast({ title: t("ppi.instances.toast.error"), variant: "destructive" });
      navigate("/ppi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // ── Update item result ─────────────────────────────────────────────────────

  async function handleResultChange(item: PpiInstanceItem, result: PpiItemResult) {
    if (!activeProject) return;
    setSaving(item.id);
    try {
      const updated = await ppiService.updateInstanceItemResult(
        item.id, instance!.id, activeProject.id,
        { result, notes: notes[item.id] || null }
      );
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, ...updated } : it));
      toast({ title: t("ppi.instances.toast.itemSaved") });
    } catch (err) {
      toast({
        title: t("ppi.instances.toast.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleNotesSave(item: PpiInstanceItem) {
    if (!activeProject) return;
    setSaving(item.id + "_note");
    try {
      await ppiService.updateInstanceItemResult(
        item.id, instance!.id, activeProject.id,
        { result: item.result, notes: notes[item.id] || null }
      );
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, notes: notes[item.id] } : it));
      toast({ title: t("ppi.instances.toast.itemSaved") });
    } catch (err) {
      toast({ title: t("ppi.instances.toast.error"), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  // ── Status transition ──────────────────────────────────────────────────────

  async function confirmTransition() {
    if (!pendingTransition || !instance || !activeProject) return;
    setTransitioning(true);
    try {
      await ppiService.updateInstanceStatus(
        instance.id, activeProject.id, instance.status, pendingTransition.to
      );
      toast({ title: t("ppi.instances.toast.statusChanged", { status: t(`ppi.status.${pendingTransition.to}`) }) });
      load();
    } catch (err) {
      toast({ title: t("ppi.instances.toast.error"), variant: "destructive" });
    } finally {
      setTransitioning(false);
      setPendingTransition(null);
    }
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  const pendingCount = items.filter((it) => it.result === "pending").length;
  const passCount    = items.filter((it) => it.result === "pass").length;
  const failCount    = items.filter((it) => it.result === "fail").length;
  const naCount      = items.filter((it) => it.result === "na").length;

  const availableTransitions = instance
    ? TRANSITIONS.filter((tr) => tr.from === instance.status)
    : [];

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
      <div className="flex items-start justify-between gap-4">
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
            <div className="flex items-center gap-2 mt-1.5">
              <PPIStatusBadge status={instance.status} />
              {workItem && (
                <span className="text-xs text-muted-foreground">
                  {t(`ppi.disciplinas.${workItem.disciplina}`, { defaultValue: workItem.disciplina })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status transition buttons */}
        {availableTransitions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {availableTransitions.map((tr) => (
              <Button
                key={tr.to}
                variant={tr.variant}
                size="sm"
                onClick={() => setPendingTransition(tr)}
                className="gap-1.5"
              >
                {tr.to === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {tr.to === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                {t(tr.labelKey)}
              </Button>
            ))}
          </div>
        )}
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
              value={instance.template_id
                ? <span className="font-mono text-xs">{instance.template_id.slice(0, 8)}…</span>
                : <span className="italic text-muted-foreground text-xs">{t("ppi.instances.form.noTemplate")}</span>
              }
            />
            <InfoRow
              label={t("ppi.instances.detail.openedAt")}
              value={
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {new Date(instance.opened_at).toLocaleDateString()}
                </span>
              }
            />
          </div>
          <div>
            {instance.closed_at && (
              <InfoRow
                label={t("ppi.instances.detail.closedAt")}
                value={new Date(instance.closed_at).toLocaleDateString()}
              />
            )}
            {/* Progress summary */}
            <div className="py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {t("ppi.instances.table.progress")}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {pendingCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    <Clock className="h-3 w-3" /> {pendingCount} {t("ppi.instances.results.pending")}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 text-xs border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {passCount} {t("ppi.instances.results.pass")}
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs border-destructive/40 text-destructive">
                  <XCircle className="h-3 w-3" /> {failCount} {t("ppi.instances.results.fail")}
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {naCount} {t("ppi.instances.results.na")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs: Checklist / Attachments ────────────────────────────── */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("ppi.instances.detail.checklistTitle")}
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="attachments">
            {t("ppi.templates.items.evidenceRequired")}
          </TabsTrigger>
        </TabsList>

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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-10">
                          {t("ppi.instances.items.itemNo")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("ppi.instances.items.label")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-36">
                          {t("ppi.instances.items.result")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                          {t("ppi.instances.items.notes")}
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => {
                        const isSaving = saving === item.id || saving === item.id + "_note";
                        const isReadOnly = ["approved", "archived"].includes(instance.status);
                        return (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                              {item.item_no}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground text-sm">{item.label}</p>
                              <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{item.check_code}</p>
                            </td>
                            <td className="px-4 py-3">
                              {isReadOnly ? (
                                <ResultBadge result={item.result} t={t} />
                              ) : (
                                <div className="flex gap-1 flex-wrap">
                                  {/* 'pending' is initial-only; reviewers choose na/pass/fail */}
                                  {item.result === "pending" && (
                                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", RESULT_STYLES["pending"])}>
                                      {t("ppi.instances.results.pending")}
                                    </span>
                                  )}
                                  {(["na", "pass", "fail"] as PpiItemResult[]).map((r) => (
                                    <button
                                      key={r}
                                      disabled={isSaving}
                                      onClick={() => handleResultChange(item, r)}
                                      className={cn(
                                        "rounded-md border px-2 py-0.5 text-xs font-medium transition-all",
                                        item.result === r
                                          ? RESULT_STYLES[r]
                                          : "border-border text-muted-foreground hover:border-primary/40",
                                        isSaving && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      {t(`ppi.instances.results.${r}`)}
                                    </button>
                                  ))}
                                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground self-center" />}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {isReadOnly ? (
                                <span className="text-xs text-muted-foreground">{item.notes || "—"}</span>
                              ) : (
                                <div className="flex gap-2 items-start">
                                  <Textarea
                                    rows={1}
                                    value={notes[item.id] ?? ""}
                                    onChange={(e) =>
                                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                                    }
                                    placeholder={t("ppi.instances.items.notesPlaceholder")}
                                    className="text-xs min-w-[140px] resize-none h-8 py-1"
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 flex-shrink-0"
                                    onClick={() => handleNotesSave(item)}
                                    disabled={saving === item.id + "_note"}
                                  >
                                    {saving === item.id + "_note"
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments / Evidence tab */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="ppi_instances"
            entityId={instance.id}
            projectId={activeProject?.id ?? ""}
            readOnly={["approved", "archived"].includes(instance.status)}
          />
        </TabsContent>
      </Tabs>

      {/* ── Status transition confirm ─────────────────────────────────── */}
      <AlertDialog
        open={!!pendingTransition}
        onOpenChange={(v) => { if (!v) setPendingTransition(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ppi.status." + (pendingTransition?.to ?? "draft"))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {instance.code} · {t("ppi.status." + instance.status)} → {t("ppi.status." + (pendingTransition?.to ?? "draft"))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransition} disabled={transitioning}>
              {transitioning
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * HPNotificationPanel — NOT-HP Hold Point Notification tab
 * Shows HP items, their notification status, and allows creating/confirming notifications.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  hpNotificationService,
  type HpNotification,
  type HpNotificationInput,
} from "@/lib/services/hpNotificationService";
import type { PpiInstanceItem, PpiInstance } from "@/lib/services/ppiService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useSignatureSlots } from "@/hooks/useSignatureSlots";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Trash2, Ban } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileDown,
  Loader2,
  Plus,
  Send,
  XCircle,
  ChevronDown,
  ChevronRight,
  Mail,
  RefreshCw,
  Link2,
  Filter,
  TimerOff,
  ClipboardCheck,
  Upload,
  Image,
  X,
  Copy,
  CheckCheck,
} from "lucide-react";
import { NotificationModal } from "@/components/notifications/NotificationModal";
import { notificationLogService, type NotificationLog, type NotificationRecipient } from "@/lib/services/notificationLogService";
import { exportHpNotificationPdf, generateHpNotificationHtmlBase64 } from "@/lib/services/hpNotificationService";
import { teamsHpCreated, teamsHpConfirmed } from "@/lib/services/teamsWebhookService";

interface Props {
  instance: PpiInstance;
  items: PpiInstanceItem[];
  projectId: string;
}

export function HPNotificationPanel({ instance, items, projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const reportMeta = useReportMeta();
  const hpSignatureSlots = useSignatureSlots("hp_notification");
  const { isAdmin } = useProjectRole(projectId);
  // Nome do emissor para o PDF — resolve de project_workers ou user metadata
  const [notifiedByName, setNotifiedByName] = useState<string | null>(null);
  useEffect(() => {
    const resolveWorkerName = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) return;
        // Tentar resolver de project_workers
        const { data: worker } = await (supabase as any)
          .from("project_workers")
          .select("name")
          .eq("project_id", projectId)
          .or(`user_id.eq.${u.id},email.eq.${u.email}`)
          .maybeSingle();
        setNotifiedByName(
          worker?.name ??
          u.user_metadata?.full_name ??
          u.email ??
          null
        );
      } catch { /* silencioso */ }
    };
    resolveWorkerName();
  }, [projectId]);


  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [voidTargetCode, setVoidTargetCode] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidIsSent, setVoidIsSent] = useState(false); // true=anular, false=apagar
  const [voidLoading, setVoidLoading] = useState(false);

  // Filtro do histórico de notificações
  type NotifFilter = "active" | "all" | "voided";
  const [notifFilter, setNotifFilter] = useState<NotifFilter>("active");

  // ATA-Q inline edit
  const [ataEditId, setAtaEditId] = useState<string | null>(null);
  const [ataEditValue, setAtaEditValue] = useState("");
  const [ataSaving, setAtaSaving] = useState(false);

  // Resultado HP (Secção 5)
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultTargetId, setResultTargetId] = useState<string | null>(null);
  const [resultTargetCode, setResultTargetCode] = useState("");
  const [resultValue, setResultValue] = useState<"approved"|"approved_conditions"|"rejected">("approved");
  const [resultDatetime, setResultDatetime] = useState("");
  const [resultObs, setResultObs] = useState("");
  const [resultRnc, setResultRnc] = useState("");
  const [resultAtaCode, setResultAtaCode] = useState("");
  const [resultApprovedBy, setResultApprovedBy] = useState("");
  const [resultApprovedEntity, setResultApprovedEntity] = useState("IP — Infraestruturas de Portugal, S.A.");
  const [resultSaving, setResultSaving] = useState(false);

  // Upload documentos assinados
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [signedDocUrls, setSignedDocUrls] = useState<Record<string, string[]>>({});

  // Link de confirmação copiado
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<HpNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState<PpiInstanceItem | null>(null);
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("09:00");
  const [activity, setActivity] = useState("");
  const [locationPk, setLocationPk] = useState("");
  const [notes, setNotes] = useState("");
  const [rfiRef, setRfiRef] = useState("");
  const [creating, setCreating] = useState(false);
  const [earlyOverride, setEarlyOverride] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [notApplicable, setNotApplicable] = useState(false);
  const [notApplicableReason, setNotApplicableReason] = useState("");

  // Confirm dialog
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Email notification modal
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  // Conteúdo HTML da última NOT-HP gerada — enviado como anexo no email
  const [notifHtmlAttachment, setNotifHtmlAttachment] = useState<{
    base64: string; filename: string; mimeType: string;
  } | null>(null);

  // Email notification history
  const [emailLogs, setEmailLogs] = useState<(NotificationLog & { recipients: NotificationRecipient[] })[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const hpItems = items.filter(
    (it) =>
      (it as any).ipt_e === "hp" ||
      (it as any).ipt_f === "hp" ||
      (it as any).ipt_ip === "hp"
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, logs] = await Promise.all([
        hpNotificationService.listByInstance(instance.id),
        notificationLogService.listByEntity(projectId, "hp", instance.id),
      ]);
      setNotifications(data);
      setEmailLogs(logs);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [instance.id, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Get notification status for a given item
  function getItemNotifications(itemId: string): HpNotification[] {
    return notifications.filter((n) => n.item_id === itemId);
  }

  function getItemStatus(itemId: string): "none" | "pending" | "confirmed" {
    const itemNotifs = getItemNotifications(itemId);
    if (itemNotifs.length === 0) return "none";
    if (itemNotifs.some((n) => n.status === "confirmed")) return "confirmed";
    if (itemNotifs.some((n) => n.status === "pending")) return "pending";
    return "none";
  }

  // Open create dialog
  function openCreateDialog(item: PpiInstanceItem) {
    setDialogItem(item);
    setActivity(item.label);
    setLocationPk("");
    setNotes("");
    setRfiRef("");
    setEarlyOverride(false);
    setEarlyReason("");
    setNotApplicable(false);
    setNotApplicableReason("");
    // Default date: 48h+ from now
    const minDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    setPlannedDate(minDate.toISOString().slice(0, 10));
    setPlannedTime("09:00");
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!dialogItem) return;

    // Caso "Não Aplicável": registar sem data obrigatória
    if (notApplicable) {
      if (!notApplicableReason.trim()) {
        toast({ title: t("ppi.hpNotification.notApplicableReasonRequired", { defaultValue: "Justificação obrigatória para Não Aplicável" }), variant: "destructive" });
        return;
      }
      setCreating(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const input: HpNotificationInput = {
          project_id: projectId,
          instance_id: instance.id,
          item_id: dialogItem.id,
          ppi_ref: instance.code,
          point_no: dialogItem.check_code,
          activity: activity || dialogItem.label,
          location_pk: locationPk || null,
          planned_datetime: `${today}T00:00:00`,
          notes: `[NÃO APLICÁVEL] ${notApplicableReason.trim()}`,
          rfi_ref: null,
        };
        await hpNotificationService.create({ ...input, advance_notice_override: true, advance_notice_reason: `N/A: ${notApplicableReason.trim()}` } as any);
        toast({ title: t("ppi.hpNotification.markedNotApplicable", { defaultValue: "HP marcado como Não Aplicável." }) });
        setDialogOpen(false);
        load();
      } catch {
        toast({ title: t("ppi.hpNotification.createError", { defaultValue: "Erro ao criar notificação HP." }), variant: "destructive" });
      } finally {
        setCreating(false);
      }
      return;
    }

    if (!plannedDate || !plannedTime) return;

    const plannedDatetime = `${plannedDate}T${plannedTime}:00`;
    const minDatetime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const isEarly = new Date(plannedDatetime) < minDatetime;

    if (isEarly && !earlyOverride) {
      setEarlyOverride(true);
      return;
    }

    if (isEarly && !earlyReason.trim()) {
      toast({
        title: t("ppi.hpNotification.earlyReason", {
          defaultValue: "Motivo do aviso antecipado (obrigatório)",
        }),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const input: HpNotificationInput = {
        project_id: projectId,
        instance_id: instance.id,
        item_id: dialogItem.id,
        ppi_ref: instance.code,
        point_no: dialogItem.check_code,
        activity,
        location_pk: locationPk || null,
        planned_datetime: plannedDatetime,
        notes: notes || null,
        rfi_ref: rfiRef || null,
      };
      // Pass early override fields
      const payload = isEarly
        ? { ...input, advance_notice_override: true, advance_notice_reason: earlyReason.trim() }
        : input;
      await hpNotificationService.create(payload as any);
      toast({
        title: t("ppi.hpNotification.created", {
          defaultValue: "Notificação HP criada com sucesso.",
        }),
      });
      // Notificar Teams (melhor-esforço, silencioso)
      teamsHpCreated({
        projectId,
        hpCode: instance.code,
        ppiRef: instance.code,
        activity,
        locationPk: locationPk || null,
        plannedDate: new Date(plannedDatetime).toLocaleString("pt-PT"),
        baseUrl: window.location.origin,
      });
      setDialogOpen(false);
      load();
    } catch {
      toast({
        title: t("ppi.hpNotification.createError", {
          defaultValue: "Erro ao criar notificação HP.",
        }),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  function openConfirmDialog(notifId: string) {
    setConfirmingId(notifId);
    setConfirmName("");
    setConfirmDialogOpen(true);
  }

  async function handleConfirm() {
    if (!confirmingId || !confirmName.trim()) return;
    setConfirming(true);
    try {
      await hpNotificationService.confirm(confirmingId, confirmName.trim());
      toast({
        title: t("ppi.hpNotification.confirmed", {
          defaultValue: "Recepção confirmada.",
        }),
      });
      // Notificar Teams (melhor-esforço, silencioso)
      const notif = notifications.find(n => n.id === confirmingId);
      if (notif) {
        teamsHpConfirmed({
          projectId,
          hpCode: notif.code,
          confirmedBy: confirmName.trim(),
          baseUrl: window.location.origin,
        });
      }
      setConfirmDialogOpen(false);
      load();
    } catch {
      toast({
        title: t("ppi.hpNotification.confirmError", {
          defaultValue: "Erro ao confirmar recepção.",
        }),
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  }

  const unnotifiedCount = hpItems.filter(
    (it) => getItemStatus(it.id) === "none"
  ).length;

  const STATUS_BADGE: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    none: {
      icon: XCircle,
      label: t("ppi.hpNotification.statusNone", { defaultValue: "Não notificado" }),
      className: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    pending: {
      icon: Clock,
      label: t("ppi.hpNotification.statusPending", { defaultValue: "Pendente" }),
      className: "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    },
    confirmed: {
      icon: CheckCircle2,
      label: t("ppi.hpNotification.statusConfirmed", { defaultValue: "Confirmado" }),
      className: "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    },
  };

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      {instance.status === "in_progress" && unnotifiedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">
            {t("ppi.hpNotification.unnotifiedWarning", {
              defaultValue: "{{count}} ponto(s) HP sem notificação 48h obrigatória.",
              count: unnotifiedCount,
            })}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : hpItems.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          {t("ppi.hpNotification.noHpItems", {
            defaultValue: "Esta inspeção não tem pontos HP (Hold Point).",
          })}
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20">
                    {t("ppi.instances.items.itemNo", { defaultValue: "#" })}
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("ppi.instances.items.label", { defaultValue: "Item" })}
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24">
                    IPT
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-36">
                    {t("ppi.hpNotification.statusCol", { defaultValue: "Estado NOT-HP" })}
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                    {t("ppi.hpNotification.plannedDate", { defaultValue: "Data Prevista" })}
                  </th>
                  <th className="w-28 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hpItems.map((item) => {
                  const status = getItemStatus(item.id);
                  const itemNotifs = getItemNotifications(item.id);
                  const latestNotif = itemNotifs.length > 0 ? itemNotifs[itemNotifs.length - 1] : null;
                  const badge = STATUS_BADGE[status];
                  const BadgeIcon = badge.icon;

                  return (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {item.check_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-sm">{item.label}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {["ipt_e", "ipt_f", "ipt_ip"].map((f) => {
                            const val = (item as any)[f] as string | null;
                            const lbl = f === "ipt_e" ? "E" : f === "ipt_f" ? "F" : "IP";
                            const isHp = val === "hp";
                            return (
                              <Badge
                                key={f}
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-bold",
                                  isHp
                                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                                    : "border-border text-muted-foreground bg-muted/30"
                                )}
                              >
                                {lbl}: {val?.toUpperCase() ?? "N/A"}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[10px]", badge.className)}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {latestNotif?.planned_datetime
                          ? new Date(latestNotif.planned_datetime).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          {status === "none" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => openCreateDialog(item)}
                            >
                              <Plus className="h-3 w-3" />
                              {t("ppi.hpNotification.notify", { defaultValue: "Notificar" })}
                            </Button>
                          )}
                          {status === "pending" && latestNotif && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1 text-xs h-7"
                                onClick={() => openConfirmDialog(latestNotif.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {t("ppi.hpNotification.confirmBtn", { defaultValue: "Confirmar" })}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-xs h-7 text-muted-foreground"
                                onClick={() => navigate(`/technical-office?type=rfi&ppi_ref=${encodeURIComponent(latestNotif.code)}&subject=${encodeURIComponent(`HP ${latestNotif.point_no} ${latestNotif.activity.slice(0, 50)}`)}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {t("ppi.hpNotification.createRfi", { defaultValue: "Criar RFI" })}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Notification list (history) ─────────────────────────────── */}
      {notifications.length > 0 && (
        <TooltipProvider>
        <div className="space-y-2 mt-6">
          {/* Cabeçalho com contadores e filtro */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("ppi.hpNotification.history", { defaultValue: "Histórico de Notificações" })}
              </h3>
              {/* Contadores por estado */}
              {(() => {
                const active = notifications.filter(n => !(n as any).is_voided);
                const voided = notifications.filter(n => (n as any).is_voided);
                const confirmed = active.filter(n => n.status === "confirmed");
                const pending = active.filter(n => n.status === "pending");
                const expired = active.filter(n => n.status === "expired");
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pending.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                        {pending.length} pendente{pending.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {confirmed.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        {confirmed.length} confirmada{confirmed.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {expired.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
                        {expired.length} expirada{expired.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {voided.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border font-medium">
                        {voided.length} anulada{voided.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Filtro */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {(["active", "all", "voided"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setNotifFilter(f)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded transition-colors font-medium",
                    notifFilter === f
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "active" ? "Activas" : f === "all" ? "Todas" : "Anuladas"}
                </button>
              ))}
            </div>
          </div>

          {/* Lista filtrada */}
          <div className="space-y-1.5">
            {notifications
              .filter(n => {
                if (notifFilter === "active") return !(n as any).is_voided;
                if (notifFilter === "voided") return (n as any).is_voided;
                return true;
              })
              .sort((a, b) => {
                // Activas primeiro, depois por data planeada desc
                const aVoid = (a as any).is_voided ? 1 : 0;
                const bVoid = (b as any).is_voided ? 1 : 0;
                if (aVoid !== bVoid) return aVoid - bVoid;
                return new Date(b.planned_datetime).getTime() - new Date(a.planned_datetime).getTime();
              })
              .map((n) => {
              // Cálculo de urgência: horas até à inspecção
              const hoursUntil = n.planned_datetime
                ? (new Date(n.planned_datetime).getTime() - Date.now()) / 3_600_000
                : null;
              const isUrgent = n.status === "pending" && hoursUntil !== null && hoursUntil > 0 && hoursUntil < 24;
              const isOverdue = n.status === "pending" && hoursUntil !== null && hoursUntil < 0;
              const isVoided = (n as any).is_voided;

              const pdfOpts = {
                notification: n,
                instance: { code: instance.code, description: (instance as any).description },
                projectName: activeProject?.name ?? "",
                projectId,
                projectMeta: activeProject ? {
                  name: activeProject.name,
                  code: activeProject.code,
                  contractor: (activeProject as any).contractor ?? null,
                  client: (activeProject as any).client ?? null,
                  location: (activeProject as any).location ?? null,
                  contract_number: (activeProject as any).contract_number ?? null,
                } : null,
                signatureSlots: hpSignatureSlots,
                notifiedByName,
              };

              return (
              <div
                key={n.id}
                className={cn(
                  "rounded-lg border text-sm transition-colors",
                  isVoided
                    ? "border-border/40 bg-muted/20 opacity-60"
                    : isOverdue
                      ? "border-destructive/40 bg-destructive/5"
                      : isUrgent
                        ? "border-amber-400/60 bg-amber-50/50"
                        : n.status === "confirmed"
                          ? "border-emerald-400/30 bg-emerald-50/30"
                          : "border-border bg-card"
                )}
              >
                {/* Linha principal */}
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Ícone de urgência */}
                    {isOverdue && !isVoided && <TimerOff className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    {isUrgent && !isVoided && <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-pulse" />}
                    {!isUrgent && !isOverdue && <Bell className={cn("h-3.5 w-3.5 shrink-0", isVoided ? "text-muted-foreground/40" : "text-muted-foreground")} />}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("font-mono text-xs font-bold", isVoided && "line-through text-muted-foreground")}>{n.code}</span>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <span className={cn("text-[10px]", isVoided ? "text-muted-foreground/60" : "text-muted-foreground")}>
                          Ponto {n.point_no} — {n.activity.length > 50 ? n.activity.slice(0, 50) + "…" : n.activity}
                        </span>
                      </div>
                      {/* Linha secundária: data + localização */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={cn("text-[10px]", isUrgent ? "text-amber-700 font-semibold" : isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                          {n.planned_datetime
                            ? new Date(n.planned_datetime).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                          {isUrgent && hoursUntil !== null && ` · ⚡ ${Math.round(hoursUntil)}h restantes`}
                          {isOverdue && ` · Prazo ultrapassado`}
                        </span>
                        {n.location_pk && (
                          <span className="text-[10px] text-muted-foreground font-mono">{n.location_pk}</span>
                        )}
                        {(n as any).rfi_ref && (
                          <span className="text-[10px] font-mono text-primary">RFI: {(n as any).rfi_ref}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges e acções */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Badge antecipado */}
                    {(n as any).advance_notice_override && !isVoided && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[10px] border-amber-400/40 bg-amber-50 text-amber-700 gap-0.5 cursor-help">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            &lt;48h
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <strong>Motivo justificação:</strong> {(n as any).advance_notice_reason || "—"}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Badge estado */}
                    {!isVoided && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          n.status === "confirmed"
                            ? "border-emerald-400/40 bg-emerald-50 text-emerald-700"
                            : n.status === "pending"
                              ? isOverdue ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-400/40 bg-amber-50 text-amber-700"
                              : n.status === "expired"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-border text-muted-foreground"
                        )}
                      >
                        {n.status === "confirmed" ? "Confirmada" : n.status === "pending" ? "Pendente" : n.status === "expired" ? "Expirada" : n.status}
                      </Badge>
                    )}
                    {isVoided && (
                      <Badge variant="outline" className="text-[10px] line-through text-muted-foreground/60 border-muted">
                        ANULADA
                      </Badge>
                    )}

                    {/* PDF */}
                    <Button
                      size="sm" variant="ghost"
                      className="gap-1 text-[10px] h-6 px-2 text-muted-foreground"
                      title="Exportar NOT-HP (PDF)"
                      onClick={async () => {
                        exportHpNotificationPdf(pdfOpts);
                        try {
                          const att = await generateHpNotificationHtmlBase64(pdfOpts);
                          setNotifHtmlAttachment(att);
                        } catch { /* silencioso */ }
                      }}
                    >
                      <FileDown className="h-3 w-3" />
                      PDF
                    </Button>

                    {/* Reenviar (só pendentes não anuladas) */}
                    {n.status === "pending" && !isVoided && (
                      <Button
                        size="sm" variant="ghost"
                        className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-primary"
                        title="Reenviar notificação à Fiscalização"
                        onClick={() => setNotifyModalOpen(true)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reenviar
                      </Button>
                    )}

                    {/* Criar RFI (pendentes) */}
                    {n.status === "pending" && !isVoided && (
                      <Button
                        size="sm" variant="ghost"
                        className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/technical-office?type=rfi&ppi_ref=${encodeURIComponent(n.code)}&subject=${encodeURIComponent(`HP ${n.point_no} ${n.activity.slice(0, 50)}`)}`)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        RFI
                      </Button>
                    )}

                    {/* Admin: Anular / Apagar */}
                    {isAdmin && !isVoided && (
                      (n as any).notified_at ? (
                        <Button
                          size="sm" variant="ghost"
                          className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive"
                          title="Anular notificação"
                          onClick={() => { setVoidTargetId(n.id); setVoidTargetCode(n.code); setVoidIsSent(true); setVoidReason(""); setVoidDialogOpen(true); }}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="ghost"
                          className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive"
                          title="Apagar notificação"
                          onClick={() => { setVoidTargetId(n.id); setVoidTargetCode(n.code); setVoidIsSent(false); setVoidReason(""); setVoidDialogOpen(true); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {/* Faixa inferior: ATA-Q + Resultado + Upload — só para activas */}
                {!isVoided && (n.status === "confirmed" || n.status === "pending") && (
                  <div className="border-t border-border/40 px-3 py-2 space-y-1.5">
                    {/* ATA-Q inline */}
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0">ATA-Q</span>
                      {ataEditId === n.id ? (
                        <>
                          <input
                            autoFocus
                            className="text-[10px] font-mono border-b border-primary bg-transparent outline-none px-1 w-36"
                            value={ataEditValue}
                            onChange={e => setAtaEditValue(e.target.value)}
                            placeholder="ATA-Q-PF17A-001"
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                setAtaSaving(true);
                                try {
                                  const { supabase: sb } = await import("@/integrations/supabase/client");
                                  await (sb as any).from("hp_notifications").update({ ata_code: ataEditValue.trim() || null }).eq("id", n.id);
                                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, ata_code: ataEditValue.trim() || null } as any : x));
                                  setAtaEditId(null);
                                } catch { /* silencioso */ } finally { setAtaSaving(false); }
                              }
                              if (e.key === "Escape") setAtaEditId(null);
                            }}
                          />
                          {ataSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                          <span className="text-[10px] text-muted-foreground">Enter · Esc</span>
                        </>
                      ) : (
                        <button
                          className={`text-[10px] font-mono hover:underline cursor-pointer ${(n as any).ata_code ? "text-emerald-700 font-semibold" : "text-muted-foreground italic"}`}
                          onClick={() => { setAtaEditId(n.id); setAtaEditValue((n as any).ata_code ?? ""); }}
                        >
                          {(n as any).ata_code ?? "Vincular ATA-Q…"}
                        </button>
                      )}
                    </div>

                    {/* Resultado HP */}
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0">Result.</span>
                      {(n as any).hp_result ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold ${(n as any).hp_result === "approved" ? "text-emerald-700" : (n as any).hp_result === "rejected" ? "text-destructive" : "text-amber-700"}`}>
                            {(n as any).hp_result === "approved" ? "✅ Aprovado" : (n as any).hp_result === "rejected" ? "❌ Reprovado" : "⚠️ Aprovado c/ Condições"}
                          </span>
                          {(n as any).result_datetime && (
                            <span className="text-[10px] text-muted-foreground">
                              · {new Date((n as any).result_datetime).toLocaleDateString("pt-PT")}
                            </span>
                          )}
                          <button
                            className="text-[10px] text-muted-foreground hover:text-primary underline ml-1"
                            onClick={() => {
                              setResultTargetId(n.id);
                              setResultTargetCode(n.code);
                              setResultValue((n as any).hp_result ?? "approved");
                              setResultDatetime((n as any).result_datetime?.slice(0,16) ?? "");
                              setResultObs((n as any).result_observations ?? "");
                              setResultRnc((n as any).rnc_ref ?? "");
                              setResultAtaCode((n as any).ata_code ?? "");
                              setResultApprovedBy((n as any).approved_by_name ?? "");
                              setResultApprovedEntity((n as any).approved_entity ?? "IP — Infraestruturas de Portugal, S.A.");
                              setResultDialogOpen(true);
                            }}
                          >editar</button>
                        </div>
                      ) : (
                        <button
                          className="text-[10px] text-primary hover:underline cursor-pointer font-medium flex items-center gap-1"
                          onClick={() => {
                            setResultTargetId(n.id);
                            setResultTargetCode(n.code);
                            setResultValue("approved");
                            setResultDatetime(new Date().toISOString().slice(0,16));
                            setResultObs(""); setResultRnc(""); setResultAtaCode((n as any).ata_code ?? "");
                            setResultApprovedBy(""); setResultApprovedEntity("IP — Infraestruturas de Portugal, S.A.");
                            setResultDialogOpen(true);
                          }}
                        >
                          <ClipboardCheck className="h-3 w-3" />
                          Registar resultado HP…
                        </button>
                      )}
                    </div>

                    {/* Upload documentos assinados */}
                    <div className="flex items-start gap-2">
                      <Upload className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0">Docs</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {((n as any).signed_doc_paths ?? []).map((path: string, idx: number) => (
                          <div key={path} className="flex items-center gap-1 bg-muted/50 rounded px-1.5 py-0.5">
                            <Image className="h-3 w-3 text-muted-foreground" />
                            <button
                              className="text-[10px] text-primary hover:underline"
                              onClick={async () => {
                                const url = await hpNotificationService.getSignedDocUrl(path);
                                if (url) window.open(url, "_blank");
                              }}
                            >
                              Doc {idx + 1}
                            </button>
                            {isAdmin && (
                              <button
                                className="text-[10px] text-muted-foreground hover:text-destructive"
                                onClick={async () => {
                                  await hpNotificationService.removeSignedDoc(n.id, path);
                                  setNotifications(prev => prev.map(x => x.id === n.id
                                    ? { ...x, signed_doc_paths: ((x as any).signed_doc_paths ?? []).filter((p: string) => p !== path) } as any
                                    : x));
                                }}
                              ><X className="h-2.5 w-2.5" /></button>
                            )}
                          </div>
                        ))}
                        <label className="cursor-pointer flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                          <Upload className="h-3 w-3" />
                          {uploadingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            capture="environment"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingId(n.id);
                              try {
                                const { supabase: sb } = await import("@/integrations/supabase/client");
                                const ext = file.name.split(".").pop() ?? "jpg";
                                const path = `hp-docs/${projectId}/${n.id}/${Date.now()}.${ext}`;
                                const { error } = await sb.storage.from("qms-files").upload(path, file, { upsert: false });
                                if (error) throw error;
                                await hpNotificationService.addSignedDoc(n.id, path);
                                setNotifications(prev => prev.map(x => x.id === n.id
                                  ? { ...x, signed_doc_paths: [...((x as any).signed_doc_paths ?? []), path] } as any
                                  : x));
                                toast.success("Documento adicionado.");
                              } catch (err: any) {
                                toast.error(err?.message ?? "Erro no upload.");
                              } finally {
                                setUploadingId(null);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Link de confirmação externa (para copiar e enviar à F/IP) */}
                    {n.status === "pending" && !isVoided && (n as any).confirmation_token && (
                      <div className="flex items-center gap-2">
                        <CheckCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground w-10 shrink-0">Link F/IP</span>
                        <button
                          className="text-[10px] text-primary hover:underline flex items-center gap-1"
                          onClick={() => {
                            const url = `${window.location.origin}/confirm-hp?token=${(n as any).confirmation_token}`;
                            navigator.clipboard.writeText(url);
                            setCopiedToken(n.id);
                            setTimeout(() => setCopiedToken(null), 2000);
                          }}
                        >
                          {copiedToken === n.id
                            ? <><CheckCheck className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">Copiado!</span></>
                            : <><Copy className="h-3 w-3" />Copiar link de confirmação</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {notifications.filter(n => notifFilter === "active" ? !(n as any).is_voided : notifFilter === "voided" ? (n as any).is_voided : true).length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                {notifFilter === "voided" ? "Sem notificações anuladas." : "Sem notificações activas."}
              </p>
            )}
          </div>
        </div>
        </TooltipProvider>
      )}

      {/* ── Email Notify Button ────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setNotifyModalOpen(true)}
        >
          <Send className="h-3 w-3" />
          {t("notifications.send", { defaultValue: "Notificar" })}
        </Button>
      </div>

      {/* ── Email Notification History ─────────────────────────────── */}
      {emailLogs.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("notifications.history", { defaultValue: "Histórico de Envios" })}
          </h3>
          <div className="space-y-1.5">
            {emailLogs.map(log => (
              <div key={log.id} className="rounded-lg border border-border bg-card">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  {expandedLogId === log.id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium flex-1 truncate">{log.subject}</span>
                  <Badge variant="secondary" className="text-[9px]">
                    {log.recipients.length} {t("notifications.recipients", { defaultValue: "destinatários" })}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.sent_at).toLocaleString()}
                  </span>
                </div>
                {expandedLogId === log.id && (
                  <div className="border-t border-border px-3 py-2 bg-muted/10 space-y-1">
                    {log.recipients.map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className={r.sent_status === "sent" ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 text-[9px]" : "border-destructive/40 bg-destructive/10 text-destructive text-[9px]"}>
                          {t(`notifications.sentStatus.${r.sent_status}`, { defaultValue: r.sent_status })}
                        </Badge>
                        <span>{r.name ?? r.email}</span>
                        <span className="text-muted-foreground">{r.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {emailLogs.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground italic mt-2">
          {t("notifications.noHistory", { defaultValue: "Sem notificações enviadas" })}
        </p>
      )}

      {/* Notification Modal */}
      {(() => {
        // Build default message from HP notifications
        const hpTexts = notifications.map(n => {
          const dateStr = n.planned_datetime
            ? new Date(n.planned_datetime).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "—";
          return `Notificação Prévia de Hold Point — 48 horas\n${n.code}\n\nPPI de referência: ${n.ppi_ref}\nPonto n.º: ${n.point_no}\nActividade: ${n.activity}\nLocalização / PK: ${n.location_pk || "—"}\nData e hora previstas: ${dateStr}\n${n.notes ? `\n${n.notes}\n` : ""}\nNos termos do PQO-PF17A-001 Sec. 10 e do CE Cláusula 35.ª, solicitamos a presença da Fiscalização/IP na data e hora indicadas para aprovação do ponto de controlo.\n\nACE ASCH Infraestructuras + Cimontubo\nEmpreitada PF17A — Linha do Sul · Porto de Setúbal`;
        });
        const defaultBody = hpTexts.length > 0 ? hpTexts[hpTexts.length - 1] : "";
        return (
          <NotificationModal
            open={notifyModalOpen}
            onOpenChange={setNotifyModalOpen}
            entityType="hp"
            entityId={instance.id}
            entityCode={instance.code}
            defaultSubject={(() => {
              const latest = notifications.length > 0 ? notifications[notifications.length - 1] : null;
              if (latest) {
                const act = latest.activity.length > 40 ? latest.activity.slice(0, 40) + "…" : latest.activity;
                const dt = latest.planned_datetime
                  ? new Date(latest.planned_datetime).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "";
                return `${latest.code} · ${instance.code} · ${act}${dt ? ` · ${dt}` : ""}`;
              }
              return `NOT-HP · ${instance.code} · Notificação Hold Point 48h`;
            })()}
            defaultMessage={defaultBody}
            pdfBase64={notifHtmlAttachment?.base64}
            pdfFilename={notifHtmlAttachment?.filename}
            pdfMimeType={notifHtmlAttachment?.mimeType}
          />
        );
      })()}

      {/* ── Resultado HP dialog ──────────────────────────────────────── */}
      <Dialog open={resultDialogOpen} onOpenChange={(v) => { if (!v) setResultDialogOpen(false); }}>
        <DialogContent className="max-w-md px-6">
          <DialogHeader className="-mx-6 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Resultado da Inspecção HP — {resultTargetCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Resultado */}
            <div>
              <Label className="text-xs font-semibold">Resultado *</Label>
              <div className="flex gap-2 mt-2">
                {([
                  { v: "approved", label: "Aprovado", cls: "border-emerald-400 bg-emerald-50 text-emerald-800" },
                  { v: "approved_conditions", label: "Aprovado c/ Condições", cls: "border-amber-400 bg-amber-50 text-amber-800" },
                  { v: "rejected", label: "Reprovado", cls: "border-destructive bg-destructive/10 text-destructive" },
                ] as const).map(({ v, label, cls }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setResultValue(v)}
                    className={`flex-1 text-[11px] font-medium px-2 py-2 rounded border-2 transition-all ${resultValue === v ? cls : "border-border text-muted-foreground hover:border-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data/hora real */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data/hora real da inspecção</Label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full text-xs border rounded px-2 py-1.5 bg-background"
                  value={resultDatetime}
                  onChange={e => setResultDatetime(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">ATA-Q emitida</Label>
                <input
                  type="text"
                  className="mt-1 w-full text-xs font-mono border rounded px-2 py-1.5 bg-background"
                  placeholder="ATA-Q-PF17A-001"
                  value={resultAtaCode}
                  onChange={e => setResultAtaCode(e.target.value)}
                />
              </div>
            </div>

            {/* Observações */}
            {(resultValue === "approved_conditions" || resultValue === "rejected") && (
              <div>
                <Label className="text-xs">Condições / Observações *</Label>
                <Textarea
                  className="text-xs mt-1"
                  rows={3}
                  placeholder="Descreve as condições ou motivo de reprovação…"
                  value={resultObs}
                  onChange={e => setResultObs(e.target.value)}
                />
              </div>
            )}

            {/* RNC (se reprovado) */}
            {resultValue === "rejected" && (
              <div>
                <Label className="text-xs">N.º RNC aberta</Label>
                <input
                  type="text"
                  className="mt-1 w-full text-xs font-mono border rounded px-2 py-1.5 bg-background"
                  placeholder="RNC-PF17A-001"
                  value={resultRnc}
                  onChange={e => setResultRnc(e.target.value)}
                />
              </div>
            )}

            {/* Aprovado por */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Aprovado por (F/IP)</Label>
                <input
                  type="text"
                  className="mt-1 w-full text-xs border rounded px-2 py-1.5 bg-background"
                  placeholder="Nome do representante"
                  value={resultApprovedBy}
                  onChange={e => setResultApprovedBy(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Entidade</Label>
                <input
                  type="text"
                  className="mt-1 w-full text-xs border rounded px-2 py-1.5 bg-background"
                  value={resultApprovedEntity}
                  onChange={e => setResultApprovedEntity(e.target.value)}
                />
              </div>
            </div>

            {resultValue === "rejected" && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                ⚠️ HP Reprovado — recomendado abrir RNC em <strong>Não Conformidades</strong> após guardar.
              </div>
            )}
          </div>

          <div className="-mx-6 px-6 pb-6 flex justify-end gap-2 border-t pt-4">
            <Button size="sm" variant="outline" onClick={() => setResultDialogOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              variant={resultValue === "rejected" ? "destructive" : "default"}
              disabled={resultSaving || ((resultValue === "approved_conditions" || resultValue === "rejected") && !resultObs.trim())}
              onClick={async () => {
                if (!resultTargetId) return;
                setResultSaving(true);
                try {
                  const { data: { user: u } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
                  const updated = await hpNotificationService.registerResult(resultTargetId, resultValue, {
                    result_datetime: resultDatetime || undefined,
                    result_observations: resultObs.trim() || undefined,
                    rnc_ref: resultRnc.trim() || undefined,
                    ata_code: resultAtaCode.trim() || undefined,
                    approved_by_name: resultApprovedBy.trim() || undefined,
                    approved_entity: resultApprovedEntity.trim() || undefined,
                    registered_by: u?.id ?? "",
                  });
                  setNotifications(prev => prev.map(n => n.id === resultTargetId ? { ...n, ...updated } : n));
                  toast.success(`Resultado registado: ${resultValue === "approved" ? "Aprovado ✅" : resultValue === "rejected" ? "Reprovado ❌" : "Aprovado c/ Condições ⚠️"}`);
                  setResultDialogOpen(false);
                  if (resultValue === "rejected") {
                    setTimeout(() => navigate("/non-conformities?new=1"), 1500);
                  }
                } catch (err: any) {
                  toast.error(err?.message ?? "Erro ao registar resultado.");
                } finally {
                  setResultSaving(false);
                }
              }}
            >
              {resultSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar Resultado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Void / Delete dialog (admin only) ────────────────────── */}
      <Dialog open={voidDialogOpen} onOpenChange={(v) => { if (!v) { setVoidDialogOpen(false); setVoidTargetId(null); } }}>
        <DialogContent className="max-w-sm px-6">
          <DialogHeader className="-mx-6 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              {voidIsSent ? <Ban className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {voidIsSent ? "Anular Notificação HP" : "Apagar Notificação HP"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {voidIsSent
                ? <>A notificação <span className="font-mono font-bold">{voidTargetCode}</span> já foi enviada. Será marcada como <strong>ANULADA</strong> mas permanece no histórico para efeitos de auditoria.</>
                : <>A notificação <span className="font-mono font-bold">{voidTargetCode}</span> ainda não foi enviada. Será eliminada permanentemente.</>
              }
            </p>
            {voidIsSent && (
              <div>
                <Label className="text-xs">Motivo da anulação *</Label>
                <Textarea
                  className="text-xs mt-1"
                  rows={3}
                  placeholder="Descreve o motivo (obrigatório para auditoria)…"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="-mx-6 px-6 pb-6 flex justify-end gap-2 border-t pt-4">
            <Button size="sm" variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={voidLoading || (voidIsSent && !voidReason.trim())}
              onClick={async () => {
                if (!voidTargetId) return;
                setVoidLoading(true);
                try {
                  const { supabase: sb } = await import("@/integrations/supabase/client");
                  const { data: { user: u } } = await sb.auth.getUser();
                  if (voidIsSent) {
                    await hpNotificationService.void(voidTargetId, u?.id ?? "", voidReason.trim());
                    // Atualização optimista: marcar como void no estado local imediatamente
                    setNotifications(prev => prev.map(n =>
                      n.id === voidTargetId ? { ...n, is_voided: true, status: "cancelled" as const } : n
                    ));
                    toast.success(`${voidTargetCode} anulada e registada no histórico.`);
                  } else {
                    await hpNotificationService.softDelete(voidTargetId, u?.id ?? "");
                    // Remover do estado local imediatamente
                    setNotifications(prev => prev.filter(n => n.id !== voidTargetId));
                    toast.success(`${voidTargetCode} eliminada.`);
                  }
                  setVoidDialogOpen(false);
                  setVoidTargetId(null);
                  setVoidReason("");
                  // Refresh completo para garantir consistência
                  await load();
                } catch (err: any) {
                  toast.error(err?.message ?? "Erro ao processar operação.");
                } finally {
                  setVoidLoading(false);
                }
              }}
            >
              {voidLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : (voidIsSent ? "Anular" : "Apagar")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create notification dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" />
              {t("ppi.hpNotification.createTitle", { defaultValue: "Notificar HP (48h)" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogItem && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                <span className="font-mono font-bold">{dialogItem.check_code}</span> — {dialogItem.label}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  {t("ppi.hpNotification.dateLabel", { defaultValue: "Data" })} *
                </Label>
                <Input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => { setPlannedDate(e.target.value); setEarlyOverride(false); setEarlyReason(""); }}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">
                  {t("ppi.hpNotification.timeLabel", { defaultValue: "Hora" })} *
                </Label>
                <Input
                  type="time"
                  value={plannedTime}
                  onChange={(e) => setPlannedTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">
                {t("ppi.hpNotification.activityLabel", { defaultValue: "Actividade" })} *
              </Label>
              <Input
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">
                {t("ppi.hpNotification.locationLabel", { defaultValue: "Localização / PK" })}
              </Label>
              <Input
                value={locationPk}
                onChange={(e) => setLocationPk(e.target.value)}
                placeholder="PK 31+670"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">
                {t("ppi.hpNotification.notesLabel", { defaultValue: "Observações" })}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div>
              <Label className="text-xs">
                {t("ppi.hpNotification.rfiRef", { defaultValue: "Referência RFI (se aplicável)" })}
              </Label>
              <Input
                value={rfiRef}
                onChange={(e) => setRfiRef(e.target.value)}
                placeholder="RFI-0001"
                className="text-sm"
              />
            </div>
            {/* Não Aplicável section */}
            <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                id="notApplicable"
                checked={notApplicable}
                onChange={(e) => { setNotApplicable(e.target.checked); setEarlyOverride(false); setEarlyReason(""); }}
                className="mt-0.5 h-4 w-4 accent-destructive"
              />
              <div className="flex-1 space-y-1.5">
                <label htmlFor="notApplicable" className="text-xs font-medium text-foreground cursor-pointer">
                  {t("ppi.hpNotification.notApplicable", { defaultValue: "Não Aplicável — Dispensar notificação HP" })}
                </label>
                {notApplicable && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("ppi.hpNotification.notApplicableReason", { defaultValue: "Justificação (obrigatória)" })} *
                    </Label>
                    <Textarea
                      value={notApplicableReason}
                      onChange={(e) => setNotApplicableReason(e.target.value)}
                      placeholder={t("ppi.hpNotification.notApplicableReasonPlaceholder", { defaultValue: "Ex: HP dispensado por decisão da fiscalização em reunião de obra de dd/mm/aaaa" })}
                      rows={2}
                      className="text-sm resize-none"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Early warning override section */}
            {!notApplicable && earlyOverride && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("ppi.hpNotification.earlyWarning", {
                    defaultValue: "Aviso com menos de 48h — exige justificação",
                  })}
                </div>
                <Textarea
                  value={earlyReason}
                  onChange={(e) => setEarlyReason(e.target.value)}
                  placeholder={t("ppi.hpNotification.earlyReason", {
                    defaultValue: "Motivo do aviso antecipado (obrigatório)",
                  })}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || (notApplicable ? !notApplicableReason.trim() : (!plannedDate || !plannedTime || !activity.trim() || (earlyOverride && !earlyReason.trim())))}
              className="gap-1.5"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              {notApplicable ? t("ppi.hpNotification.markNotApplicable", { defaultValue: "Marcar Não Aplicável" }) : t("ppi.hpNotification.send", { defaultValue: "Enviar Notificação" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm reception dialog ───────────────────────────────── */}
      <Dialog open={confirmDialogOpen} onOpenChange={(v) => { if (!v) setConfirmDialogOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t("ppi.hpNotification.confirmTitle", { defaultValue: "Confirmar Recepção" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("ppi.hpNotification.confirmDesc", {
                defaultValue: "Confirme a recepção da notificação HP. Indique o nome do responsável F/IP.",
              })}
            </p>
            <div>
              <Label className="text-xs">
                {t("ppi.hpNotification.confirmedByLabel", { defaultValue: "Confirmado por" })} *
              </Label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Nome do responsável F/IP"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming || !confirmName.trim()}
              className="gap-1.5"
            >
              {confirming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

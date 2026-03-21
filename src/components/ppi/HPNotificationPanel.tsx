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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";

interface Props {
  instance: PpiInstance;
  items: PpiInstanceItem[];
  projectId: string;
}

export function HPNotificationPanel({ instance, items, projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  // Confirm dialog
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const hpItems = items.filter(
    (it) =>
      (it as any).ipt_e === "hp" ||
      (it as any).ipt_f === "hp" ||
      (it as any).ipt_ip === "hp"
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hpNotificationService.listByInstance(instance.id);
      setNotifications(data);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [instance.id]);

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
    // Default date: 48h+ from now
    const minDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    setPlannedDate(minDate.toISOString().slice(0, 10));
    setPlannedTime("09:00");
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!dialogItem || !plannedDate || !plannedTime) return;

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
                                Criar RFI
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
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("ppi.hpNotification.history", { defaultValue: "Histórico de Notificações" })}
          </h3>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-border bg-card text-sm"
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="font-mono text-xs font-bold text-foreground">{n.code}</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-xs">
                      {n.point_no} — {n.activity.slice(0, 60)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(n as any).advance_notice_override && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {t("ppi.hpNotification.earlyBadge", { defaultValue: "Antecipado" })}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {(n as any).advance_notice_reason || "—"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {(n as any).rfi_ref && (
                    <span className="text-[10px] font-mono text-primary">RFI: {(n as any).rfi_ref}</span>
                  )}
                  {n.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-[10px] h-6 px-2 text-muted-foreground"
                      onClick={() => navigate(`/technical-office?type=rfi&ppi_ref=${encodeURIComponent(n.code)}&subject=${encodeURIComponent(`HP ${n.point_no} ${n.activity.slice(0, 50)}`)}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Criar RFI
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(n.planned_datetime).toLocaleString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      n.status === "confirmed"
                        ? "border-emerald-400/40 bg-emerald-50 text-emerald-700"
                        : n.status === "pending"
                          ? "border-amber-400/40 bg-amber-50 text-amber-700"
                          : n.status === "expired"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border text-muted-foreground"
                    )}
                  >
                    {n.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  onChange={(e) => setPlannedDate(e.target.value)}
                  min={new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10)}
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
                Referência RFI (se aplicável)
              </Label>
              <Input
                value={rfiRef}
                onChange={(e) => setRfiRef(e.target.value)}
                placeholder="RFI-0001"
                className="text-sm"
              />
            </div>
            {/* Early warning override section */}
            {earlyOverride && (
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
              disabled={creating || !plannedDate || !plannedTime || !activity.trim() || (earlyOverride && !earlyReason.trim())}
              className="gap-1.5"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              {t("ppi.hpNotification.send", { defaultValue: "Enviar Notificação" })}
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

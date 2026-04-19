import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { notificationService, type Notification } from "@/lib/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import {
  Bell, AlertTriangle, Clock, CheckCircle2, FlaskConical,
  ClipboardCheck, CheckCheck, RefreshCw, ExternalLink,
  ShieldAlert, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";

// ── Tipos de alertas directos (fora da tabela notifications) ──────────────────
interface LiveAlert {
  id: string;
  type: "nc_overdue" | "hp_pending" | "test_overdue" | "eme_expiring";
  urgency: "critical" | "high" | "normal";
  title: string;
  subtitle: string;
  link: string;
  date: string;
}

const URGENCY_CFG = {
  critical: { cls: "border-l-destructive bg-destructive/5",    dot: "bg-destructive",   badge: "bg-destructive/10 text-destructive" },
  high:     { cls: "border-l-amber-500 bg-amber-500/5",        dot: "bg-amber-500",     badge: "bg-amber-500/10 text-amber-600" },
  normal:   { cls: "border-l-primary/40 bg-primary/5",         dot: "bg-primary",       badge: "bg-primary/10 text-primary" },
} as const;

const TYPE_ICON = {
  nc_overdue:    { icon: ShieldAlert, label: "NC em Atraso" },
  hp_pending:    { icon: Bell,        label: "HP Pendente" },
  test_overdue:  { icon: FlaskConical,label: "Ensaio Atrasado" },
  eme_expiring:  { icon: Calendar,    label: "EME a Expirar" },
} as const;

// ── Componente de alerta ──────────────────────────────────────────────────────
function AlertCard({ alert, onNavigate }: { alert: LiveAlert; onNavigate: (link: string) => void }) {
  const cfg = URGENCY_CFG[alert.urgency];
  const { icon: Icon, label } = TYPE_ICON[alert.type];
  return (
    <div
      className={cn("flex items-start gap-3 px-4 py-3 rounded-lg border border-l-4 cursor-pointer hover:brightness-95 transition-all", cfg.cls)}
      onClick={() => onNavigate(alert.link)}
    >
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{alert.title}</span>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", cfg.badge)}>{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.subtitle}</p>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
    </div>
  );
}

// ── Componente de notificação do sistema ────────────────────────────────────
function NotifCard({ notif, onRead }: { notif: Notification; onRead: (n: Notification) => void }) {
  return (
    <button
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors hover:bg-muted/40",
        !notif.is_read && "bg-primary/5 border-primary/20",
        notif.is_read && "border-border/40",
      )}
      onClick={() => onRead(notif)}
    >
      <div className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", notif.is_read ? "bg-muted" : "bg-primary")} />
      <div className="flex-1 min-w-0 text-left">
        <p className={cn("text-sm leading-snug", !notif.is_read ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {notif.title}
        </p>
        {notif.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {new Date(notif.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>
      {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const db = supabase as any;
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const [notifs, ncsOverdue, hpPending, emesExpiring] = await Promise.allSettled([
        notificationService.getForUser(activeProject.id, 60),
        // NCs em atraso
        db.from("non_conformities")
          .select("id, code, title, due_date, severity")
          .eq("project_id", activeProject.id)
          .eq("is_deleted", false)
          .not("status", "in", '("closed","archived")')
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(20),
        // HPs pendentes há mais de 5 dias
        db.from("hp_notifications")
          .select("id, code, ppi_ref, activity, planned_datetime, notified_at")
          .eq("project_id", activeProject.id)
          .eq("status", "pending")
          .order("planned_datetime", { ascending: true })
          .limit(20),
        // EMEs a expirar em 30 dias
        db.from("measuring_equipment")
          .select("id, code, name, calibration_valid_until")
          .eq("project_id", activeProject.id)
          .gte("calibration_valid_until", today)
          .lte("calibration_valid_until", in30)
          .order("calibration_valid_until", { ascending: true })
          .limit(10),
      ]);

      if (notifs.status === "fulfilled") setNotifications(notifs.value);

      const alerts: LiveAlert[] = [];

      if (ncsOverdue.status === "fulfilled") {
        (ncsOverdue.value.data ?? []).forEach((nc: any) => {
          alerts.push({
            id: `nc-${nc.id}`,
            type: "nc_overdue",
            urgency: nc.severity === "critical" ? "critical" : "high",
            title: `${nc.code} — ${nc.title}`,
            subtitle: `Prazo ultrapassado: ${new Date(nc.due_date + "T00:00:00").toLocaleDateString("pt-PT")}`,
            link: `/non-conformities/${nc.id}`,
            date: nc.due_date,
          });
        });
      }

      if (hpPending.status === "fulfilled") {
        (hpPending.value.data ?? []).forEach((hp: any) => {
          const notifiedAt = new Date(hp.notified_at ?? hp.planned_datetime);
          const days = Math.floor((Date.now() - notifiedAt.getTime()) / 86400000);
          alerts.push({
            id: `hp-${hp.id}`,
            type: "hp_pending",
            urgency: days >= 5 ? "critical" : "high",
            title: `${hp.code} — Aguarda confirmação F/IP`,
            subtitle: `${hp.ppi_ref} · ${hp.activity} · ${days}d sem resposta`,
            link: "/ppi",
            date: hp.planned_datetime,
          });
        });
      }

      if (emesExpiring.status === "fulfilled") {
        (emesExpiring.value.data ?? []).forEach((eme: any) => {
          const daysLeft = Math.ceil((new Date(eme.calibration_valid_until).getTime() - Date.now()) / 86400000);
          alerts.push({
            id: `eme-${eme.id}`,
            type: "eme_expiring",
            urgency: daysLeft <= 7 ? "high" : "normal",
            title: `${eme.code} — Calibração a expirar`,
            subtitle: `${eme.name} · Expira em ${daysLeft} dia(s)`,
            link: "/deadlines",
            date: eme.calibration_valid_until,
          });
        });
      }

      // Ordenar por urgência
      const ORDER = { critical: 0, high: 1, normal: 2 };
      alerts.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);
      setLiveAlerts(alerts);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (n: Notification) => {
    if (!n.is_read) {
      await notificationService.markAsRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link_entity_type === "nc" && n.link_entity_id) navigate(`/non-conformities/${n.link_entity_id}`);
    else if (n.link_entity_type?.startsWith("ppi")) navigate("/ppi");
    else navigate("/deadlines");
  };

  const handleMarkAllRead = async () => {
    if (!activeProject) return;
    await notificationService.markAllAsRead(activeProject.id);
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
    toast({ title: t("notifications.markAllRead") });
  };

  const handleGenerate = async () => {
    if (!activeProject) return;
    setGenerating(true);
    try {
      await notificationService.generateNotifications(activeProject.id, 30);
      await load();
      toast({ title: t("notifications.generated", { count: 0, defaultValue: "Alertas actualizados" }) });
    } catch { /* swallow */ }
    finally { setGenerating(false); }
  };

  // Filtros por tab
  const hpAlerts   = useMemo(() => liveAlerts.filter(a => a.type === "hp_pending"),    [liveAlerts]);
  const ncAlerts   = useMemo(() => liveAlerts.filter(a => a.type === "nc_overdue"),    [liveAlerts]);
  const emeAlerts  = useMemo(() => liveAlerts.filter(a => a.type === "eme_expiring"),  [liveAlerts]);
  const unread     = useMemo(() => notifications.filter(n => !n.is_read).length,       [notifications]);
  const totalAlerts = liveAlerts.length;

  if (!activeProject) return <NoProjectBanner />;

  const renderAlerts = (alerts: LiveAlert[], notifs: Notification[]) => (
    <div className="space-y-2">
      {alerts.length === 0 && notifs.length === 0 && (
        <EmptyState icon={Bell} title="Sem alertas" subtitle="Não há alertas activos de momento" />
      )}
      {alerts.map(a => <AlertCard key={a.id} alert={a} onNavigate={link => navigate(link)} />)}
      {notifs.length > 0 && alerts.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4 mb-2">
          {t("notifications.system", { defaultValue: "Sistema" })}
        </p>
      )}
      {notifs.map(n => <NotifCard key={n.id} notif={n} onRead={handleMarkRead} />)}
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("notifications.category", { defaultValue: "Alertas e Notificações" })}
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t("notifications.centerTitle", { defaultValue: "Centro de Notificações" })}
          </h1>
          {(totalAlerts > 0 || unread > 0) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalAlerts > 0 && `${totalAlerts} alerta(s) activo(s)`}
              {totalAlerts > 0 && unread > 0 && " · "}
              {unread > 0 && `${unread} não lida(s)`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
            {t("notifications.refresh")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/50 rounded-xl border border-border/40 gap-0.5 p-1">
          <TabsTrigger value="all" className="gap-1.5 text-xs rounded-lg">
            <Bell className="h-3 w-3" />
            {t("notifications.tabs.all", { defaultValue: "Todos" })}
            {(totalAlerts + unread) > 0 && (
              <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 rounded-full font-bold">
                {totalAlerts + unread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="hp" className="gap-1.5 text-xs rounded-lg">
            <ClipboardCheck className="h-3 w-3" />
            {t("notifications.tabs.hp", { defaultValue: "Hold Points" })}
            {hpAlerts.length > 0 && <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1.5 rounded-full font-bold">{hpAlerts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="nc" className="gap-1.5 text-xs rounded-lg">
            <AlertTriangle className="h-3 w-3" />
            {t("notifications.tabs.nc", { defaultValue: "NCs" })}
            {ncAlerts.length > 0 && <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 rounded-full font-bold">{ncAlerts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="expirations" className="gap-1.5 text-xs rounded-lg">
            <Clock className="h-3 w-3" />
            {t("notifications.tabs.expirations", { defaultValue: "Expirações" })}
            {emeAlerts.length > 0 && <span className="text-[9px] bg-muted-foreground/20 text-muted-foreground px-1.5 rounded-full font-bold">{emeAlerts.length}</span>}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <>
            <TabsContent value="all" className="mt-4">
              {renderAlerts(liveAlerts, notifications.filter(n => !n.is_read))}
            </TabsContent>
            <TabsContent value="hp" className="mt-4">
              {renderAlerts(hpAlerts, [])}
            </TabsContent>
            <TabsContent value="nc" className="mt-4">
              {renderAlerts(ncAlerts, [])}
            </TabsContent>
            <TabsContent value="expirations" className="mt-4">
              {renderAlerts(emeAlerts, notifications.filter(n => n.type?.includes("expir")))}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

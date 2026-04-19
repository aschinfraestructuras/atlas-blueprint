import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { notificationService, type Notification } from "@/lib/services/notificationService";
import { Bell, Check, CheckCheck, RefreshCw, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";

const SOURCE_ROUTES: Record<string, string> = {
  supplier_doc: "/suppliers",
  material_doc: "/materials",
  subcontractor_doc: "/subcontractors",
  calibration: "/topography",
  nc_due: "/non-conformities",
  rfi_due: "/technical-office/rfis",
  tech_office_due: "/technical-office/items",
  planning_due: "/planning",
  ppi_pending: "/ppi",
  ppi_approval: "/ppi",
  expiration_overdue: "/deadlines",
  expiration_warning: "/deadlines",
  nc: "/non-conformities",
  ppi: "/ppi",
  supplier: "/suppliers",
  subcontractor: "/subcontractors",
  rfi: "/technical-office",
  audit: "/audits",
  warning: "/deadlines",
  info: "/deadlines",
};

const HAS_DETAIL: Record<string, boolean> = {
  nc: true, nc_due: true,
  ppi: true, ppi_pending: true, ppi_approval: true,
  supplier: true, supplier_doc: true,
  subcontractor: true, subcontractor_doc: true,
  rfi: true, rfi_due: true,
};

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!activeProject) return;
    try {
      const [items, count] = await Promise.all([
        notificationService.getForUser(activeProject.id, 20),
        notificationService.getUnreadCount(activeProject.id),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      /* swallow */
    }
  }, [activeProject]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (n: Notification) => {
    if (!n.is_read) {
      await notificationService.markAsRead(n.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const entityType = n.link_entity_type ?? "";
    const base = SOURCE_ROUTES[entityType] ?? "/deadlines";
    if (n.link_entity_id && HAS_DETAIL[entityType]) {
      navigate(`${base}/${n.link_entity_id}`);
    } else {
      navigate(base);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeProject) return;
    await notificationService.markAllAsRead(activeProject.id);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const handleGenerate = async () => {
    if (!activeProject) return;
    setGenerating(true);
    try {
      const count = await notificationService.generateNotifications(activeProject.id, 30);
      toast({ title: t("notifications.generated", { count }) });
      await fetchNotifications();
    } catch {
      toast({ title: t("notifications.generateError"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground">
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">{t("notifications.title")}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleGenerate}
              disabled={generating}
              title={t("notifications.refresh")}
            >
              <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleMarkAllRead}
                title={t("notifications.markAllRead")}
              >
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[320px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("notifications.empty")}</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex gap-2.5 border-b border-border/30 last:border-0",
                  !n.is_read && "bg-primary/5",
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {n.type === "expiration_overdue" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs leading-tight",
                      !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {n.title}
                  </p>
                  {n.body && <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[9px] text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
              </button>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              onClick={() => navigate("/notifications")}
              className="w-full py-2 text-center text-xs text-primary hover:underline flex items-center justify-center gap-1"
            >
              {t("notifications.viewAll")}
              <ExternalLink className="h-3 w-3" />
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

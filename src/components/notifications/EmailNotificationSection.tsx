/**
 * EmailNotificationSection — Reusable "Notify by email" button + send history
 * Used across RFI, NC, Submittal, Transmittal detail pages.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, ChevronDown, ChevronRight, Send, Clock } from "lucide-react";
import { NotificationModal } from "@/components/notifications/NotificationModal";
import { notificationLogService, type NotificationLog, type NotificationRecipient } from "@/lib/services/notificationLogService";

interface Props {
  projectId: string;
  entityType: "hp" | "nc" | "rfi" | "submittal" | "transmittal" | "general";
  entityId: string;
  entityCode?: string;
  defaultSubject?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

export function EmailNotificationSection({
  projectId, entityType, entityId, entityCode, defaultSubject,
  pdfBase64, pdfFilename,
}: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [logs, setLogs] = useState<(NotificationLog & { recipients: NotificationRecipient[] })[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const data = await notificationLogService.listByEntity(projectId, entityType, entityId);
      setLogs(data);
    } catch { /* ignore */ }
  }, [projectId, entityType, entityId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) loadLogs(); // refresh after sending
  };

  return (
    <>
      {/* Notify button */}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 flex-shrink-0"
        onClick={() => setModalOpen(true)}
      >
        <Mail className="h-3.5 w-3.5" />
        {t("notifications.send", { defaultValue: "Notificar" })}
      </Button>

      {/* History section */}
      {logs.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {t("notifications.history", { defaultValue: "Histórico de Envios" })}
              <Badge variant="secondary" className="text-[9px]">{logs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {logs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const sentCount = log.recipients.filter(r => r.sent_status === "sent").length;
              const failedCount = log.recipients.filter(r => r.sent_status === "failed").length;
              return (
                <div key={log.id} className="rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{log.subject}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sentCount > 0 && (
                        <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-700 dark:text-green-400">
                          {sentCount} {t("notifications.sent", { defaultValue: "enviado" })}
                        </Badge>
                      )}
                      {failedCount > 0 && (
                        <Badge variant="secondary" className="text-[9px] bg-destructive/10 text-destructive">
                          {failedCount} falhou
                        </Badge>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-1">
                      {log.recipients.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${r.sent_status === "sent" ? "bg-green-500" : "bg-destructive"}`} />
                          <span className="text-muted-foreground">{r.name || r.email}</span>
                          <span className="text-muted-foreground/60 truncate">{r.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <NotificationModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        entityType={entityType}
        entityId={entityId}
        entityCode={entityCode}
        defaultSubject={defaultSubject}
        pdfBase64={pdfBase64}
        pdfFilename={pdfFilename}
      />
    </>
  );
}
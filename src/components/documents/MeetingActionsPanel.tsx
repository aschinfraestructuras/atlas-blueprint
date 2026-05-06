/**
 * MeetingActionsPanel — acções pendentes das reuniões SGQ
 * Lê dos documentos ATA-Q (form_data.decisoes) — fonte única de verdade.
 * Aparece no fundo da DocumentsPage e complementa o MeetingsTab do ET.
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { meetingActionsService, type MeetingAction } from "@/lib/services/meetingActionsService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CalendarClock, FileText, Plus, ExternalLink, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export function MeetingActionsPanel() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [actions, setActions] = useState<MeetingAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await meetingActionsService.getAll(activeProject.id);
      setActions(data);
    } catch { /* silencioso */ } finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  const createDeadline = async (action: MeetingAction) => {
    if (!activeProject || createdIds.has(action.id)) return;
    setCreatingId(action.id);
    try {
      await meetingActionsService.createDeadline(action, activeProject.id);
      setCreatedIds(prev => new Set([...prev, action.id]));
    } catch { /* silencioso */ } finally { setCreatingId(null); }
  };

  if (loading) return (
    <div className="space-y-2 mt-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-28 w-full" />
    </div>
  );

  if (actions.length === 0) return (
    <div className="mt-6 space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {t("meetings.actionPanel.title", { defaultValue: "Plano de Acção — Reuniões SGQ" })}
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
          onClick={() => navigate("/technical-office?tab=meetings")}>
          <ExternalLink className="h-3 w-3" />
          {t("meetings.actionPanel.goToMeetings", { defaultValue: "Ver reuniões" })}
        </Button>
      </div>
      <div className="py-5 text-center text-sm text-muted-foreground">
        <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-emerald-500 opacity-70" />
        <p>{t("meetings.actionPanel.empty", { defaultValue: "Sem acções pendentes das reuniões ✅" })}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-6 space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {t("meetings.actionPanel.title", { defaultValue: "Plano de Acção — Reuniões SGQ" })}
          </span>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
            {actions.length} {t("meetings.actionPanel.open", { defaultValue: "em aberto" })}
          </Badge>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
          onClick={() => navigate("/technical-office?tab=meetings")}>
          <ExternalLink className="h-3 w-3" />
          {t("meetings.actionPanel.goToMeetings", { defaultValue: "Ver reuniões" })}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Acta</TableHead>
              <TableHead className="text-xs">Acção / Decisão</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Responsável</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Prazo</TableHead>
              <TableHead className="text-xs w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map(action => {
              const isOverdue = action.due_date &&
                new Date(action.due_date.split("/").reverse().join("-")) < new Date();
              const done = createdIds.has(action.id);
              return (
                <TableRow key={action.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {action.ata_number || "—"}<br />
                    <span className="text-[10px]">
                      {action.meeting_date ? new Date(action.meeting_date).toLocaleDateString("pt-PT") : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px]">
                    <span className="line-clamp-2">{action.action_text}</span>
                  </TableCell>
                  <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                    {action.responsible || "—"}
                  </TableCell>
                  <TableCell className="text-xs hidden sm:table-cell">
                    {action.due_date ? (
                      <span className={cn(isOverdue && "text-destructive font-medium")}>
                        {action.due_date}{isOverdue && " ⚠"}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {done ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Criado
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm"
                        className="h-6 text-[10px] gap-1 px-2"
                        disabled={creatingId === action.id}
                        onClick={() => createDeadline(action)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {creatingId === action.id ? "…" : "Criar prazo"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        💡 Decisões extraídas do campo "Decisões Tomadas" dos documentos ATA-Q.
        Formato: <code>1. Texto — Responsável: Nome — Prazo: dd/mm/aaaa</code>
      </p>
    </div>
  );
}

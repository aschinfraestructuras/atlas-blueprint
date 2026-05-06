/**
 * MeetingActionsPanel — painel de reuniões SGQ na página de Documentos
 *
 * Lê da tabela sgq_meetings (mesma fonte que o MeetingsTab do Escritório Técnico).
 * Rastreabilidade partilhada: qualquer acta criada aqui aparece no ET e vice-versa.
 *
 * Mostra acções (action_points) abertas de todas as actas, com link para prazo.
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CalendarDays, ExternalLink, AlertCircle, CheckCircle2, Clock, Plus
} from "lucide-react";

interface ActionPoint {
  id: string;
  description: string;
  responsible: string;
  due_date: string;
  status: "open" | "closed" | "overdue";
}

interface MeetingWithActions {
  id: string;
  code: string;
  meeting_type: string;
  meeting_date: string;
  action_points: ActionPoint[];
}

export function MeetingActionsPanel() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingWithActions[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("sgq_meetings" as any)
      .select("id, code, meeting_type, meeting_date, action_points")
      .eq("project_id", activeProject.id)
      .eq("is_deleted", false)
      .order("meeting_date", { ascending: false })
      .limit(20);

    // Só mostrar actas que têm acções abertas
    const withOpen = ((data ?? []) as MeetingWithActions[]).filter(m =>
      (m.action_points ?? []).some((a: ActionPoint) => a.status === "open" || a.status === "overdue")
    );
    setMeetings(withOpen);
    setLoading(false);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  // Actualizar estado de uma acção directamente
  const toggleAction = async (meetingId: string, actionId: string, newStatus: "open" | "closed") => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const updated = (meeting.action_points ?? []).map((a: ActionPoint) =>
      a.id === actionId ? { ...a, status: newStatus } : a
    );
    await supabase
      .from("sgq_meetings" as any)
      .update({ action_points: updated })
      .eq("id", meetingId);
    await load();
  };

  if (loading) return (
    <div className="space-y-2 mt-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-28 w-full" />
    </div>
  );

  const totalOpen = meetings.reduce((sum, m) =>
    sum + (m.action_points ?? []).filter((a: ActionPoint) => a.status === "open" || a.status === "overdue").length, 0
  );

  return (
    <div className="mt-6 space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {t("meetings.actionPanel.title", { defaultValue: "Plano de Acção — Reuniões SGQ" })}
          </span>
          {totalOpen > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
              {totalOpen} {t("meetings.actionPanel.open", { defaultValue: "em aberto" })}
            </Badge>
          )}
        </div>
        <Button
          variant="outline" size="sm" className="h-7 text-xs gap-1"
          onClick={() => navigate("/technical-office?tab=meetings")}
        >
          <ExternalLink className="h-3 w-3" />
          {t("meetings.actionPanel.goToMeetings", { defaultValue: "Ver todas as actas" })}
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-emerald-500 opacity-60" />
          <p>{t("meetings.actionPanel.empty", { defaultValue: "Sem acções em aberto — tudo resolvido ✅" })}</p>
          <Button
            variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1"
            onClick={() => navigate("/technical-office?tab=meetings")}
          >
            <Plus className="h-3 w-3" />
            {t("meetings.new", { defaultValue: "Nova Acta" })}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Acta</TableHead>
                <TableHead className="text-xs">Acção</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Responsável</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Prazo</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.flatMap(m =>
                (m.action_points ?? [])
                  .filter((a: ActionPoint) => a.status === "open" || a.status === "overdue")
                  .map((a: ActionPoint) => {
                    const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status === "open";
                    return (
                      <TableRow key={`${m.id}-${a.id}`} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {m.code}<br />
                          <span className="text-[10px]">{new Date(m.meeting_date).toLocaleDateString("pt-PT")}</span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          <span className="line-clamp-2">{a.description}</span>
                        </TableCell>
                        <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                          {a.responsible || "—"}
                        </TableCell>
                        <TableCell className="text-xs hidden sm:table-cell">
                          {a.due_date ? (
                            <span className={cn(isOverdue && "text-destructive font-medium")}>
                              {new Date(a.due_date).toLocaleDateString("pt-PT")}
                              {isOverdue && " ⚠"}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                              <AlertCircle className="h-2.5 w-2.5" /> Vencida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1">
                              <Clock className="h-2.5 w-2.5" /> Em aberto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700"
                            onClick={() => toggleAction(m.id, a.id, "closed")}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Fechar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

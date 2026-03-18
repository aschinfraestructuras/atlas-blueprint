/**
 * Meeting Actions Panel
 * Displays parsed actions from ATA-Q meeting minutes with ability
 * to create trackable deadlines from each action.
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { meetingActionsService, type MeetingAction } from "@/lib/services/meetingActionsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarClock, FileText, Plus, ExternalLink, CheckCircle2 } from "lucide-react";

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
      const result = await meetingActionsService.getAll(activeProject.id);
      setActions(result);
    } catch (err) {
      console.error("Failed to load meeting actions", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreateDeadline = async (action: MeetingAction) => {
    if (!activeProject) return;
    setCreatingId(action.id);
    try {
      await meetingActionsService.createDeadlineFromAction(activeProject.id, action);
      setCreatedIds(prev => new Set(prev).add(action.id));
      toast({ title: t("meetingActions.deadlineCreated") });
    } catch (err) {
      toast({ title: t("meetingActions.deadlineError"), variant: "destructive" });
    } finally {
      setCreatingId(null);
    }
  };

  if (loading) return <Skeleton className="h-32" />;
  if (actions.length === 0) return null;

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {t("meetingActions.title")}
          <Badge variant="secondary" className="text-[10px] ml-auto">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">{t("meetingActions.col.ata")}</TableHead>
              <TableHead className="min-w-[80px]">{t("meetingActions.col.date")}</TableHead>
              <TableHead>{t("meetingActions.col.action")}</TableHead>
              <TableHead className="min-w-[100px]">{t("meetingActions.col.responsible")}</TableHead>
              <TableHead className="min-w-[90px]">{t("meetingActions.col.dueDate")}</TableHead>
              <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map(action => (
              <TableRow key={action.id}>
                <TableCell>
                  <button
                    className="text-xs font-mono text-primary hover:underline underline-offset-2"
                    onClick={() => navigate(`/documents/${action.document_id}`)}
                  >
                    {action.ata_number || "ATA"}
                  </button>
                </TableCell>
                <TableCell className="text-xs">{action.meeting_date ? new Date(action.meeting_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-sm max-w-[300px]">
                  <p className="line-clamp-2">{action.action_text}</p>
                </TableCell>
                <TableCell className="text-xs">{action.responsible ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {action.due_date ? (
                    <span className={cn(new Date(action.due_date) < new Date() ? "text-destructive font-semibold" : "")}>
                      {new Date(action.due_date).toLocaleDateString()}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {createdIds.has(action.id) ? (
                    <Badge variant="secondary" className="text-[10px] bg-chart-2/15 text-chart-2 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("meetingActions.created")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      disabled={creatingId === action.id}
                      onClick={() => handleCreateDeadline(action)}
                    >
                      <Plus className="h-3 w-3" />
                      {t("meetingActions.createDeadline")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

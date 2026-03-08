import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { AuditFormDialog, type AuditActivity } from "@/components/audits/AuditFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarClock, ChevronDown, ChevronRight, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

const AUDIT_CHECKLIST: Record<string, string[]> = {
  "AI-PF17A-01": ["PG-01 (Planos)", "PG-02 (Documentos)", "PAME", "Receção de materiais"],
  "AI-PF17A-02": ["NCs em aberto", "Subcontratados", "EMEs (Equipamentos)"],
  "AI-PF17A-03": ["PPIs 04-07", "Catenária", "Sinalização & Telecomunicações"],
  "AI-PF17A-04": ["Todos os módulos", "Arquivo completo", "Relatórios finais"],
};

const STATUS_BADGE: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
};

export default function AuditsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate, canEdit, canDelete } = useProjectRole();
  const [audits, setAudits] = useState<AuditActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // CRUD state
  const [formOpen, setFormOpen] = useState(false);
  const [editAudit, setEditAudit] = useState<AuditActivity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuditActivity | null>(null);

  const fetchAudits = useCallback(async () => {
    if (!activeProject) { setAudits([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("planning_activities")
        .select("id, description, planned_start, planned_end, status, progress_pct, constraints_text")
        .eq("project_id", activeProject.id)
        .like("description", "AI-%")
        .order("planned_start", { ascending: true });
      setAudits((data ?? []) as AuditActivity[]);
    } catch { /* swallow */ }
    finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetchAudits(); }, [fetchAudits]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await (supabase as any)
        .from("planning_activities")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(t("common.deleted", { defaultValue: "Eliminado com sucesso" }));
      fetchAudits();
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (audit: AuditActivity) => {
    setEditAudit(audit);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditAudit(null);
    setFormOpen(true);
  };

  if (!activeProject) return <NoProjectBanner />;

  const today = new Date();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("audits.title", { defaultValue: "Programa de Auditorias" })}
        subtitle={t("audits.subtitle", { defaultValue: "Auditorias internas do programa de qualidade" })}
        icon={CalendarClock}
        actions={canCreate ? (
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("audits.create", { defaultValue: "Nova Auditoria" })}
          </Button>
        ) : undefined}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : audits.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          subtitleKey="audits.empty"
          ctaKey="audits.create"
          onCta={canCreate ? handleCreate : undefined}
        />
      ) : (
        <div className="space-y-4">
          {audits.map(audit => {
            const isExpanded = expanded === audit.id;
            const code = audit.description.split(" ")[0];
            const checklist = AUDIT_CHECKLIST[code] ?? [];
            const daysUntil = audit.planned_start
              ? Math.ceil((new Date(audit.planned_start).getTime() - today.getTime()) / 86400000)
              : null;
            const timelinePct = audit.planned_start && audit.planned_end
              ? Math.min(100, Math.max(0, Math.round(
                  ((today.getTime() - new Date(audit.planned_start).getTime()) /
                  (new Date(audit.planned_end).getTime() - new Date(audit.planned_start).getTime())) * 100
                )))
              : 0;

            return (
              <Card key={audit.id} className="border-0 bg-card shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    {/* Expand toggle */}
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : audit.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">{code}</span>
                          <Badge variant="secondary" className={cn("text-[10px]", STATUS_BADGE[audit.status] ?? "")}>
                            {t(`audits.status.${audit.status}`, { defaultValue: audit.status })}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{audit.description}</p>
                      </div>
                    </div>

                    {/* Right side: dates + actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        {audit.planned_start && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(audit.planned_start).toLocaleDateString()} — {audit.planned_end ? new Date(audit.planned_end).toLocaleDateString() : ""}
                          </p>
                        )}
                        {daysUntil !== null && (
                          <p className={cn("text-sm font-bold tabular-nums mt-0.5",
                            daysUntil > 60 ? "text-emerald-600" : daysUntil >= 30 ? "text-amber-500" : daysUntil >= 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {daysUntil >= 0 ? `${daysUntil}d` : t("audits.past", { defaultValue: "Passado" })}
                          </p>
                        )}
                      </div>

                      {(canEdit || canDelete) && (
                        <RowActionMenu
                          onEdit={canEdit ? () => handleEdit(audit) : undefined}
                          onDelete={canDelete ? () => setDeleteTarget(audit) : undefined}
                        />
                      )}
                    </div>
                  </div>

                  {/* Timeline bar */}
                  {audit.planned_start && audit.planned_end && (
                    <div className="mt-3">
                      <Progress value={timelinePct} className="h-1.5" />
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4 space-y-4">
                      {checklist.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                            {t("audits.checklist", { defaultValue: "Checklist de Preparação" })}
                          </p>
                          <ul className="space-y-1.5">
                            {checklist.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {audit.constraints_text && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">
                            {t("audits.notes", { defaultValue: "Notas / Constatações" })}
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{audit.constraints_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AuditFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editAudit={editAudit}
        onSuccess={fetchAudits}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audits.deleteConfirm", { defaultValue: "Tem a certeza que pretende eliminar esta auditoria?" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

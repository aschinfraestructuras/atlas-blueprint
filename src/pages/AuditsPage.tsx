import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, ChevronDown, ChevronRight, CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditActivity {
  id: string;
  description: string;
  planned_start: string | null;
  planned_end: string | null;
  status: string;
  progress_pct: number;
  constraints_text: string | null;
}

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
  const [audits, setAudits] = useState<AuditActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch = useCallback(async () => {
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

  useEffect(() => { fetch(); }, [fetch]);

  if (!activeProject) return <NoProjectBanner />;

  const today = new Date();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("audits.title", { defaultValue: "Programa de Auditorias" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("audits.subtitle", { defaultValue: "Auditorias internas do programa de qualidade" })}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : audits.length === 0 ? (
        <EmptyState icon={CalendarClock} subtitleKey="audits.empty" />
      ) : (
        <div className="space-y-4">
          {audits.map(audit => {
            const isExpanded = expanded === audit.id;
            const code = audit.description.split(" ")[0]; // e.g. "AI-PF17A-01"
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
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : audit.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">{code}</span>
                        <Badge variant="secondary" className={cn("text-[10px]", STATUS_BADGE[audit.status] ?? "")}>
                          {t(`audits.status.${audit.status}`, { defaultValue: audit.status })}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{audit.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
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
                      {/* Checklist */}
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

                      {/* Notes */}
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
    </div>
  );
}

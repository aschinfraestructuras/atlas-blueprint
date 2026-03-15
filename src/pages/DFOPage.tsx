import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useDocuments } from "@/hooks/useDocuments";
import { dfoService, type DfoVolume, type DfoItem } from "@/lib/services/dfoService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Archive, ChevronDown, FileDown, Loader2, Plus, CheckCircle2, Clock,
  AlertCircle, Minus, FileText, Link2, RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em Curso", cls: "bg-primary/10 text-primary" },
  complete: { label: "Completo", cls: "bg-emerald-500/10 text-emerald-600" },
  not_applicable: { label: "N/A", cls: "bg-muted/50 text-muted-foreground" },
};

export default function DFOPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { isAdmin } = useProjectRole();
  const reportMeta = useReportMeta();
  const { data: allDocs } = useDocuments();

  const [volumes, setVolumes] = useState<DfoVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openVols, setOpenVols] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await dfoService.getVolumes(activeProject.id);
      setVolumes(data);
    } catch {
      // Tables may not exist yet
      setVolumes([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const handleInit = async () => {
    if (!activeProject) return;
    setInitializing(true);
    try {
      await dfoService.initializeForProject(activeProject.id);
      toast({ title: "DFO inicializado com estrutura PF17A" });
      load();
    } catch (err) {
      toast({ title: "Erro ao inicializar DFO", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  };

  const handleStatusChange = async (item: DfoItem, status: string) => {
    try {
      await dfoService.updateItemStatus(item.id, status);
      load();
    } catch {
      toast({ title: "Erro ao atualizar estado", variant: "destructive" });
    }
  };

  const handleLinkDoc = async (item: DfoItem, docId: string | null) => {
    try {
      await dfoService.linkDocument(item.id, docId === "__none" ? null : docId);
      load();
    } catch {
      toast({ title: "Erro ao vincular documento", variant: "destructive" });
    }
  };

  const toggleVol = (id: string) => {
    setOpenVols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!activeProject) return <NoProjectBanner />;

  // Overall stats
  const totalItems = volumes.reduce((s, v) => s + (v.items?.filter(i => i.status !== "not_applicable").length ?? 0), 0);
  const completedItems = volumes.reduce((s, v) => s + (v.completed_count ?? 0), 0);
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="DFO — Dossier Final de Obra"
        subtitle="Índice estruturado de todos os documentos a entregar ao IP no encerramento do projeto"
        icon={Archive}
        iconColor="hsl(var(--primary))"
        actions={
          <div className="flex items-center gap-2">
            {volumes.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                if (!reportMeta) return;
                await dfoService.exportDfoIndex(volumes, reportMeta);
              }}>
                <FileDown className="h-3.5 w-3.5" />
                Exportar Índice DFO
              </Button>
            )}
            {isAdmin && volumes.length === 0 && (
              <Button size="sm" className="gap-1.5" onClick={handleInit} disabled={initializing}>
                {initializing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Inicializar DFO
              </Button>
            )}
          </div>
        }
      />

      {/* Overall progress */}
      {volumes.length > 0 && (
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Progresso Global</span>
              <span className="text-lg font-black tabular-nums text-primary">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5">{completedItems} de {totalItems} itens aplicáveis completos</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : volumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 px-6 text-center">
          <Archive className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma estrutura DFO definida</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            O DFO será inicializado com a estrutura padrão do PQO PF17A (7 volumes).
          </p>
          {isAdmin && (
            <Button size="sm" className="mt-6" onClick={handleInit} disabled={initializing}>
              {initializing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Inicializar DFO
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {volumes.map(vol => {
            const items = vol.items ?? [];
            const applicable = items.filter(i => i.status !== "not_applicable");
            const completed = applicable.filter(i => i.status === "complete").length;
            const pct = applicable.length > 0 ? Math.round((completed / applicable.length) * 100) : 0;
            const isOpen = openVols.has(vol.id);

            return (
              <Collapsible key={vol.id} open={isOpen} onOpenChange={() => toggleVol(vol.id)}>
                <Card className="border-0 bg-card shadow-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors py-4 px-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                            Vol. {vol.volume_no}
                          </span>
                          <CardTitle className="text-sm font-bold">{vol.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {completed}/{applicable.length}
                          </span>
                          <Progress value={pct} className="h-1.5 w-20" />
                          <span className="text-xs font-bold text-primary tabular-nums">{pct}%</span>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="px-5 pb-4 pt-0">
                      <div className="divide-y divide-border">
                        {items.map(item => {
                          const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                          return (
                            <div key={item.id} className="flex items-center gap-3 py-2.5">
                              <span className="font-mono text-[10px] text-muted-foreground w-12 flex-shrink-0">{item.code}</span>
                              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.title}</span>
                              {item.linked_doc && (
                                <Badge variant="outline" className="gap-1 text-[9px] flex-shrink-0">
                                  <Link2 className="h-2.5 w-2.5" />
                                  {item.linked_doc.code ?? item.linked_doc.title.slice(0, 15)}
                                </Badge>
                              )}
                              <Select value={item.status} onValueChange={(v) => handleStatusChange(item, v)}>
                                <SelectTrigger className="h-7 w-[120px] text-xs flex-shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendente</SelectItem>
                                  <SelectItem value="in_progress">Em Curso</SelectItem>
                                  <SelectItem value="complete">Completo</SelectItem>
                                  <SelectItem value="not_applicable">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={item.linked_doc_id ?? "__none"} onValueChange={(v) => handleLinkDoc(item, v)}>
                                <SelectTrigger className="h-7 w-[140px] text-xs flex-shrink-0">
                                  <SelectValue placeholder="Vincular doc..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">Nenhum</SelectItem>
                                  {allDocs.slice(0, 50).map(d => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.code ?? d.title.slice(0, 20)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

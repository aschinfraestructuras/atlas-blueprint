import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useDocuments } from "@/hooks/useDocuments";
import { dfoService, type DfoVolume } from "@/lib/services/dfoService";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Archive, ChevronDown, FileDown, Loader2, Plus, Link2, RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VolumeProgress {
  volume_no: number | null;
  volume_title: string | null;
  total_items: number | null;
  complete_items: number | null;
  pending_items: number | null;
  completion_pct: number | null;
}

interface CompletenessItem {
  id: string | null;
  code: string | null;
  title: string | null;
  status: string | null;
  effective_status: string | null;
  auto_complete: boolean | null;
  support_count: string | null;
  linked_doc_id: string | null;
  volume_id: string | null;
  volume_no: number | null;
  volume_title: string | null;
  document_type: string | null;
  sort_order: number | null;
}

export default function DFOPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { isAdmin } = useProjectRole();
  const reportMeta = useReportMeta();
  const { data: allDocs } = useDocuments();

  const [volumes, setVolumes] = useState<DfoVolume[]>([]);
  const [volumeProgress, setVolumeProgress] = useState<VolumeProgress[]>([]);
  const [completenessItems, setCompletenessItems] = useState<CompletenessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openVols, setOpenVols] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      try { await dfoService.syncItemStatuses(activeProject.id); } catch { /* ignore */ }
      const [volData, { data: progressData }, { data: completenessData }] = await Promise.all([
        dfoService.getVolumes(activeProject.id),
        supabase.from("vw_dfo_volume_progress").select("*").eq("project_id", activeProject.id),
        supabase.from("vw_dfo_completeness").select("*").eq("project_id", activeProject.id),
      ]);
      setVolumes(volData);
      setVolumeProgress((progressData as VolumeProgress[]) ?? []);
      setCompletenessItems((completenessData as CompletenessItem[]) ?? []);
    } catch {
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

  const handleStatusChange = async (itemId: string, status: string) => {
    try {
      await dfoService.updateItemStatus(itemId, status);
      load();
    } catch {
      toast({ title: "Erro ao atualizar estado", variant: "destructive" });
    }
  };

  const handleLinkDoc = async (itemId: string, docId: string | null) => {
    try {
      await dfoService.linkDocument(itemId, docId === "__none" ? null : docId);
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
  const totalItems = volumeProgress.reduce((s, v) => s + (v.total_items ?? 0), 0);
  const completedItems = volumeProgress.reduce((s, v) => s + (v.complete_items ?? 0), 0);
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Build completeness map by volume_id
  const completenessMap = new Map<string, CompletenessItem[]>();
  for (const ci of completenessItems) {
    if (!ci.volume_id) continue;
    const arr = completenessMap.get(ci.volume_id) ?? [];
    arr.push(ci);
    completenessMap.set(ci.volume_id, arr);
  }

  function getProgressColor(pct: number) {
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 40) return "text-amber-600";
    return "text-destructive";
  }

  function EffectiveStatusBadge({ item }: { item: CompletenessItem }) {
    const es = item.effective_status;
    if (es === "auto_complete") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[9px]">{t("dfo.status.auto_complete")}</Badge>
            </TooltipTrigger>
            <TooltipContent>{t("dfo.tooltip.autoComplete", { count: String(item.support_count ?? "0") } as Record<string, string>)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (es === "received") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px]">{t("dfo.status.received")}</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0 text-[9px]">{t("dfo.status.pending")}</Badge>;
  }

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
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                  setSyncing(true);
                  try {
                    await dfoService.syncItemStatuses(activeProject.id);
                    await load();
                    toast({ title: "DFO sincronizado" });
                  } catch { /* ignore */ } finally { setSyncing(false); }
                }} disabled={syncing}>
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  {t("common.sync", { defaultValue: "Sincronizar" })}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                  if (!reportMeta) return;
                  await dfoService.exportDfoIndex(volumes, reportMeta);
                }}>
                  <FileDown className="h-3.5 w-3.5" />
                  {t("common.export", { defaultValue: "Exportar" })} DFO
                </Button>
              </>
            )}
            {isAdmin && volumes.length === 0 && (
              <Button size="sm" className="gap-1.5" onClick={handleInit} disabled={initializing}>
                {initializing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t("common.create", { defaultValue: "Inicializar" })} DFO
              </Button>
            )}
          </div>
        }
      />

      {/* Overall progress + per-volume bars */}
      {volumes.length > 0 && (
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{t("dfo.progress")}</span>
                <span className="text-lg font-black tabular-nums text-primary">{overallPct}%</span>
              </div>
              <Progress value={overallPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-1.5">{t("dfo.volumeComplete", { complete: completedItems, total: totalItems })}</p>
            </div>
            {volumeProgress.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border">
                {volumeProgress.map(vp => {
                  const pct = vp.completion_pct ?? 0;
                  return (
                    <div key={vp.volume_no} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate">Vol. {vp.volume_no} — {vp.volume_title}</span>
                        <span className={cn("text-xs font-bold tabular-nums", getProgressColor(pct))}>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground">{t("dfo.volumeComplete", { complete: vp.complete_items ?? 0, total: vp.total_items ?? 0 })}</p>
                    </div>
                  );
                })}
              </div>
            )}
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
              {t("common.create", { defaultValue: "Inicializar" })} DFO
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {volumes.map(vol => {
            const cItems = completenessMap.get(vol.id) ?? vol.items ?? [];
            const applicable = cItems.filter(i => (i.status ?? i.effective_status) !== "not_applicable");
            const completed = applicable.filter(i => (i.effective_status ?? i.status) === "received" || (i.effective_status ?? i.status) === "auto_complete" || i.status === "complete").length;
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
                          <span className={cn("text-xs font-bold tabular-nums", getProgressColor(pct))}>{pct}%</span>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="px-5 pb-4 pt-0">
                      <div className="divide-y divide-border">
                        {cItems.map(item => {
                          if (!item.id) return null;
                          return (
                            <div key={item.id} className="flex items-center gap-3 py-2.5">
                              <span className="font-mono text-[10px] text-muted-foreground w-12 flex-shrink-0">{item.code}</span>
                              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.title}</span>
                              {item.effective_status && <EffectiveStatusBadge item={item} />}
                              <Select value={item.status ?? "pending"} onValueChange={(v) => handleStatusChange(item.id!, v)}>
                                <SelectTrigger className="h-7 w-[120px] text-xs flex-shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">{t("common.pending")}</SelectItem>
                                  <SelectItem value="in_progress">{t("nc.statusFlow.in_progress", { defaultValue: "Em Curso" })}</SelectItem>
                                  <SelectItem value="complete">{t("nc.statusFlow.closed", { defaultValue: "Completo" })}</SelectItem>
                                  <SelectItem value="not_applicable">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={item.linked_doc_id ?? "__none"} onValueChange={(v) => handleLinkDoc(item.id!, v)}>
                                <SelectTrigger className="h-7 w-[140px] text-xs flex-shrink-0">
                                  <SelectValue placeholder={t("common.linkDoc")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">{t("common.no", { defaultValue: "Nenhum" })}</SelectItem>
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

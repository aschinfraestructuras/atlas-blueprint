/**
 * OrgChartPage — Organigrama real de obra
 *
 * Mostra a equipa de obra (project_workers) em estrutura hierárquica real,
 * com edição de "reporta a" e exportação PDF para o DFO.
 *
 * Substituiu o organigrama anterior que mostrava apenas utilizadores com
 * login no sistema — esse não tinha valor operacional nem para auditorias.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { printHtml } from "@/lib/services/reportService";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import { Users, Download, Pencil, ChevronDown, ChevronRight, HardHat, Building2 } from "lucide-react";

const db = supabase as any;

interface OrgWorker {
  id: string;
  name: string;
  role_function: string | null;
  org_function: string | null;
  company: string | null;
  reports_to: string | null;
  org_order: number;
  status: string;
  subcontractor?: { name: string } | null;
}

// Cores por função de obra
const FUNCTION_COLORS: Record<string, string> = {
  "Director de Obra":       "#1d4ed8",
  "Director Adjunto":       "#2563eb",
  "Técnico de Qualidade":   "#7c3aed",
  "RMSGQ":                  "#7c3aed",
  "Encarregado Geral":      "#b45309",
  "Encarregado":            "#d97706",
  "Topógrafo":              "#0369a1",
  "Laboratorista":          "#0891b2",
  "Técnico HST":            "#dc2626",
  "Soldador":               "#92400e",
  "Operador de Máquina":    "#065f46",
  "Serralheiro":            "#374151",
  "Eletricista":            "#ca8a04",
};
const DEFAULT_COLOR = "#6b7280";

function getColor(w: OrgWorker): string {
  if (w.org_function) {
    const found = Object.keys(FUNCTION_COLORS).find(k =>
      w.org_function!.toLowerCase().includes(k.toLowerCase())
    );
    if (found) return FUNCTION_COLORS[found];
  }
  return DEFAULT_COLOR;
}

// Construir árvore hierárquica
function buildTree(workers: OrgWorker[]): OrgWorker[] {
  const map = new Map(workers.map(w => [w.id, { ...w, _children: [] as OrgWorker[] }]));
  const roots: (OrgWorker & { _children: OrgWorker[] })[] = [];
  for (const w of map.values()) {
    if (w.reports_to && map.has(w.reports_to)) {
      map.get(w.reports_to)!._children.push(w as any);
    } else {
      roots.push(w as any);
    }
  }
  // Ordenar por org_order dentro de cada nível
  const sort = (arr: any[]) => {
    arr.sort((a, b) => (a.org_order - b.org_order) || a.name.localeCompare(b.name));
    arr.forEach(n => sort(n._children));
    return arr;
  };
  return sort(roots) as any;
}

// Componente de nó do organigrama
function OrgNode({
  worker, depth, onEdit, expanded, onToggle, hasChildren
}: {
  worker: OrgWorker & { _children: any[] };
  depth: number;
  onEdit: (w: OrgWorker) => void;
  expanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
}) {
  const color = getColor(worker);
  const company = worker.subcontractor?.name ?? worker.company ?? "ASCH/Cimontubo ACE";

  return (
    <div className="flex flex-col items-center">
      {/* Linha vertical de cima (excepto raiz) */}
      {depth > 0 && <div className="w-px h-4 bg-border" />}

      <Card
        className="border bg-card hover:shadow-md transition-all cursor-pointer group min-w-[160px] max-w-[200px]"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <CardContent className="p-3 space-y-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight truncate">{worker.name}</p>
              <p className="text-[10px] font-semibold mt-0.5 leading-tight" style={{ color }}>
                {worker.org_function || worker.role_function || "—"}
              </p>
              <p className="text-[9px] text-muted-foreground truncate mt-0.5">{company}</p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1"
              onClick={e => { e.stopPropagation(); onEdit(worker); }}
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
          </div>
          {hasChildren && (
            <button
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={e => { e.stopPropagation(); onToggle(); }}
            >
              {expanded
                ? <ChevronDown className="h-2.5 w-2.5" />
                : <ChevronRight className="h-2.5 w-2.5" />
              }
              {worker._children.length} directo(s)
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Nível horizontal de nós
function OrgLevel({ nodes, depth, onEdit, expandedIds, onToggle }: {
  nodes: (OrgWorker & { _children: any[] })[];
  depth: number;
  onEdit: (w: OrgWorker) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (!nodes.length) return null;
  return (
    <div className="flex flex-col items-center w-full">
      {/* Linha horizontal entre nós do mesmo nível */}
      {nodes.length > 1 && depth > 0 && (
        <div className="relative w-full flex justify-center">
          <div className="h-px bg-border"
            style={{ width: `${Math.min((nodes.length - 1) * 220, 900)}px` }}
          />
        </div>
      )}
      {/* Nós em linha */}
      <div className="flex gap-6 flex-wrap justify-center">
        {nodes.map(node => (
          <div key={node.id} className="flex flex-col items-center">
            <OrgNode
              worker={node}
              depth={depth}
              onEdit={onEdit}
              hasChildren={node._children.length > 0}
              expanded={expandedIds.has(node.id)}
              onToggle={() => onToggle(node.id)}
            />
            {/* Filhos */}
            {node._children.length > 0 && expandedIds.has(node.id) && (
              <>
                <div className="w-px h-4 bg-border" />
                <OrgLevel
                  nodes={node._children}
                  depth={depth + 1}
                  onEdit={onEdit}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Dialog de edição de nó
function EditNodeDialog({
  open, onOpenChange, worker, allWorkers, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  worker: OrgWorker | null;
  allWorkers: OrgWorker[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [orgFunction, setOrgFunction] = useState("");
  const [reportsTo, setReportsTo] = useState("__none__");
  const [orgOrder, setOrgOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && worker) {
      setOrgFunction(worker.org_function ?? worker.role_function ?? "");
      setReportsTo(worker.reports_to ?? "__none__");
      setOrgOrder(String(worker.org_order ?? 0));
    }
  }, [open, worker]);

  const handleSave = async () => {
    if (!worker) return;
    setSaving(true);
    try {
      const { error } = await db.from("project_workers").update({
        org_function: orgFunction.trim() || null,
        reports_to: reportsTo === "__none__" ? null : reportsTo,
        org_order: Number(orgOrder) || 0,
      }).eq("id", worker.id);
      if (error) throw error;
      toast({ title: t("orgChart.toast.updated", { defaultValue: "Posição actualizada" }) });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("common.saveError"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Candidatos a "reporta a" — todos excepto o próprio e os seus descendentes
  const candidates = allWorkers.filter(w => w.id !== worker?.id);

  // Sugestões comuns de função
  const COMMON_FUNCTIONS = [
    "Director de Obra", "Director Adjunto", "Técnico de Qualidade", "RMSGQ",
    "Encarregado Geral", "Encarregado", "Topógrafo", "Laboratorista",
    "Técnico HST", "Soldador", "Operador de Máquina",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            {worker?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">
              {t("orgChart.form.function", { defaultValue: "Função no Organigrama" })}
            </Label>
            <Input
              value={orgFunction}
              onChange={e => setOrgFunction(e.target.value)}
              className="h-8 text-xs"
              placeholder="Ex: Director de Obra, TQ, Encarregado..."
              list="org-function-suggestions"
            />
            <datalist id="org-function-suggestions">
              {COMMON_FUNCTIONS.map(f => <option key={f} value={f} />)}
            </datalist>
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_FUNCTIONS.slice(0, 6).map(f => (
                <button key={f}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border hover:bg-muted transition-colors"
                  onClick={() => setOrgFunction(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              {t("orgChart.form.reportsTo", { defaultValue: "Reporta a" })}
            </Label>
            <Select value={reportsTo} onValueChange={setReportsTo}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Topo (sem superior) —</SelectItem>
                {candidates.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {(w.org_function || w.role_function) ? ` · ${w.org_function || w.role_function}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              {t("orgChart.form.order", { defaultValue: "Ordem de apresentação (menor = mais à esquerda)" })}
            </Label>
            <Input
              type="number" min={0} step={1}
              value={orgOrder}
              onChange={e => setOrgOrder(e.target.value)}
              className="h-8 text-xs w-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Página principal
export default function OrgChartPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  const [workers, setWorkers] = useState<OrgWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<OrgWorker | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pid = activeProject?.id ?? "";

  const fetch = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const { data } = await db
        .from("project_workers")
        .select("id, name, role_function, org_function, company, reports_to, org_order, status, subcontractor:subcontractor_id(name)")
        .eq("project_id", pid)
        .eq("status", "active")
        .order("org_order", { ascending: true });
      const ws: OrgWorker[] = (data ?? []).map((w: any) => ({
        ...w,
        subcontractor: Array.isArray(w.subcontractor) ? w.subcontractor[0] : w.subcontractor,
      }));
      setWorkers(ws);
      // Expandir automaticamente o 1.º nível
      const roots = ws.filter(w => !w.reports_to);
      setExpandedIds(new Set(roots.map(r => r.id)));
    } finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetch(); }, [fetch]);

  const tree = useMemo(() => buildTree(workers), [workers]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(workers.map(w => w.id)));
  const collapseAll = () => {
    const roots = workers.filter(w => !w.reports_to);
    setExpandedIds(new Set(roots.map(r => r.id)));
  };

  // PDF — lista hierárquica formatada
  const handleExportPdf = () => {
    const today = new Date().toLocaleDateString("pt-PT");
    const header = fullPdfHeader(logoBase64 ?? null, activeProject?.name ?? "", "ORGANIGRAMA", "0", today);

    const renderNode = (w: OrgWorker & { _children: any[] }, depth: number): string => {
      const color = getColor(w);
      const indent = depth * 20;
      const company = w.subcontractor?.name ?? w.company ?? "ASCH/Cimontubo ACE";
      let html = `
        <div style="margin-left:${indent}px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          ${depth > 0 ? `<div style="width:${depth > 1 ? 16 : 12}px;height:1px;background:#d1d5db;flex-shrink:0"></div>` : ""}
          <div style="border-left:3px solid ${color};padding:4px 8px;background:${color}0d;border-radius:0 4px 4px 0;min-width:200px">
            <div style="font-weight:bold;font-size:10px;color:#1e293b">${w.name}</div>
            <div style="font-size:9px;color:${color};font-weight:600">${w.org_function || w.role_function || "—"}</div>
            <div style="font-size:8px;color:#6b7280">${company}</div>
          </div>
        </div>`;
      for (const child of w._children) {
        html += renderNode(child, depth + 1);
      }
      return html;
    };

    const body = tree.map(n => renderNode(n as any, 0)).join("");

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
      <title>Organigrama — ${activeProject?.name}</title>
      <style>@page{size:A4;margin:18mm 15mm}body{font-family:Arial,sans-serif}</style>
    </head><body>
      ${header}
      <div style="font-size:15px;font-weight:bold;color:#1e3a5f;margin-bottom:12px;border-bottom:2px solid #1e3a5f;padding-bottom:4px">
        Organigrama de Obra — ${activeProject?.name}
      </div>
      <p style="font-size:9px;color:#6b7280;margin-bottom:12px">
        Estrutura organizativa da equipa de obra em ${today} — ${workers.length} elemento(s) activo(s)
      </p>
      ${body}
      <div style="margin-top:20px;font-size:8px;color:#9ca3af;border-top:1px solid #e2e8f0;padding-top:6px">
        Atlas QMS · Gerado em ${today}
      </div>
    </body></html>`;
    printHtml(html, `Organigrama_${activeProject?.code ?? ""}.pdf`);
  };

  if (!activeProject) return <NoProjectBanner />;

  const noWorkers = !loading && workers.length === 0;
  const unassigned = workers.filter(w => !w.reports_to && !w.org_function);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("orgChart.title", { defaultValue: "Organigrama de Obra" })}
        subtitle={t("orgChart.subtitle", { defaultValue: "Estrutura hierárquica da equipa" })}
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            {!loading && workers.length > 0 && (
              <>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={expandAll}>
                  Expandir tudo
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAll}>
                  Colapsar
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf} disabled={workers.length === 0}>
              <Download className="h-3.5 w-3.5" />PDF
            </Button>
          </div>
        }
      />

      {/* Banner informativo se não há equipa */}
      {noWorkers && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("orgChart.empty", { defaultValue: "Sem membros da equipa registados" })}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {t("orgChart.emptyDesc", { defaultValue: "Adiciona os membros da equipa no módulo Equipa e depois define aqui a sua posição hierárquica." })}
          </p>
        </div>
      )}

      {/* Aviso de trabalhadores sem hierarquia definida */}
      {!loading && unassigned.length > 0 && workers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
          <HardHat className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">{unassigned.length} pessoa(s)</span> sem função no organigrama.
            Clica no ícone <Pencil className="h-3 w-3 inline" /> em cada card para definir a função e a quem reporta.
          </div>
        </div>
      )}

      {/* Organigrama */}
      {loading ? (
        <div className="space-y-3 flex flex-col items-center">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" style={{ width: `${(4-i)*180}px` }} />)}
        </div>
      ) : (
        <div className="overflow-auto pb-4">
          <div className="min-w-max flex flex-col items-center px-4">
            <OrgLevel
              nodes={tree as any}
              depth={0}
              onEdit={w => { setEditTarget(w); setEditOpen(true); }}
              expandedIds={expandedIds}
              onToggle={toggleExpand}
            />

            {/* Trabalhadores sem hierarquia (sem reports_to e sem filhos) */}
            {unassigned.length > 0 && workers.length > unassigned.length && (
              <div className="mt-8 w-full border-t border-dashed pt-4">
                <p className="text-[10px] text-muted-foreground text-center mb-3">
                  Sem posição hierárquica definida
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {unassigned.map(w => (
                    <Card key={w.id} className="border bg-card min-w-[140px] max-w-[180px] opacity-60 hover:opacity-100 transition-opacity">
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold truncate">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.role_function ?? "—"}</p>
                        {canCreate && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-[10px] h-5 px-1 mt-1 gap-1 text-primary"
                            onClick={() => { setEditTarget(w); setEditOpen(true); }}
                          >
                            <Pencil className="h-2.5 w-2.5" />Definir posição
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs no rodapé */}
      {!loading && workers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
          {[
            { label: "Total equipa",     value: workers.length },
            { label: "Com hierarquia",   value: workers.filter(w => w.reports_to || tree.some(n => n.id === w.id)).length },
            { label: "Com função",       value: workers.filter(w => w.org_function).length },
            { label: "Sem posição",      value: unassigned.length },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de edição */}
      <EditNodeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        worker={editTarget}
        allWorkers={workers}
        onSaved={fetch}
      />
    </div>
  );
}

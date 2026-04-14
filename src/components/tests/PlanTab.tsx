import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useTestPlans } from "@/hooks/useTestPlans";
import {
  testPlanService,
  type TestPlan, type TestPlanRule, type TestPlanRuleInput,
} from "@/lib/services/testPlanService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/lib/utils/toast";
import { EmptyState } from "@/components/EmptyState";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Pencil, Trash2, ChevronRight, Loader2, FileDown, ChevronDown,
} from "lucide-react";
import { TEST_DISCIPLINES } from "@/lib/services/testService";
import { testService } from "@/lib/services/testService";
import type { TestCatalogEntry } from "@/lib/services/testService";
import { supabase } from "@/integrations/supabase/client";
import { generatePdfDocument, printHtml, buildReportFilename } from "@/lib/services/reportService";
import type { ReportLabels } from "@/lib/services/reportService";

// ─── Plan Status colors ─────────────────────────────────────────────────────
const PLAN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  archived: "bg-muted/60 text-muted-foreground",
};

// ─── Plan Form Dialog ─────────────────────────────────────────────────────────
function PlanFormDialog({ open, onOpenChange, plan, onSuccess }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: TestPlan | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [disciplina, setDisciplina] = useState("geral");
  const [scopeNotes, setScopeNotes] = useState("");

  useEffect(() => {
    if (plan) {
      setCode(plan.code); setTitle(plan.title); setStatus(plan.status);
      setDisciplina(plan.scope_disciplina ?? "geral"); setScopeNotes(plan.scope_notes ?? "");
    } else {
      setCode(""); setTitle(""); setStatus("draft"); setDisciplina("geral"); setScopeNotes("");
    }
  }, [plan, open]);

  const handleSave = async () => {
    if (!activeProject || !code.trim() || !title.trim()) return;
    setSaving(true);
    try {
      if (plan) {
        await testPlanService.update(plan.id, activeProject.id, {
          code, title, status, scope_disciplina: disciplina, scope_notes: scopeNotes || undefined,
        });
        toast({ title: t("tests.plans.toast.updated") });
      } else {
        await testPlanService.create({
          project_id: activeProject.id, code, title, status,
          scope_disciplina: disciplina, scope_notes: scopeNotes || undefined,
        });
        toast({ title: t("tests.plans.toast.created") });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? t("tests.plans.form.titleEdit") : t("tests.plans.form.titleCreate")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("tests.plans.form.code")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("tests.plans.form.codePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("tests.plans.form.disciplina")}</Label>
              <Select value={disciplina} onValueChange={setDisciplina}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEST_DISCIPLINES.map(d => (
                    <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("tests.plans.form.title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("tests.plans.form.titlePlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("tests.plans.form.scopeNotes")}</Label>
            <Textarea value={scopeNotes} onChange={(e) => setScopeNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !code.trim() || !title.trim()}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {plan ? t("tests.plans.form.saveBtn") : t("tests.plans.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule Editor (inline for selected plan) ──────────────────────────────────
function RuleEditor({ plan }: { plan: TestPlan }) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [rules, setRules] = useState<TestPlanRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<TestCatalogEntry[]>([]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testPlanService.getRules(plan.id);
      setRules(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [plan.id]);

  const loadCatalog = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await testService.getCatalogByProject(activeProject.id, false);
      setCatalog(data);
    } catch (err) { console.error(err); }
  }, [activeProject]);

  useEffect(() => { loadRules(); loadCatalog(); }, [loadRules, loadCatalog]);

  const handleAddRule = async (testId: string) => {
    try {
      await testPlanService.createRule({ plan_id: plan.id, test_id: testId });
      toast({ title: t("tests.plans.rules.created") });
      loadRules();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await testPlanService.deleteRule(id);
      toast({ title: t("tests.plans.rules.deleted") });
      loadRules();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleUpdateRule = async (id: string, updates: Partial<TestPlanRuleInput>) => {
    try {
      await testPlanService.updateRule(id, updates);
      loadRules();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const FREQ_TYPES = ["quantity", "time", "event", "manual"];
  const APPLIES_OPTIONS = ["work_item", "activity", "both"];

  return (
    <div className="space-y-3 mt-4 p-4 border border-border rounded-xl bg-muted/20">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{t("tests.plans.rules.title")}</h4>
        <Select onValueChange={handleAddRule}>
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <Plus className="h-3 w-3 mr-1" />
            <SelectValue placeholder={t("tests.plans.rules.newRule")} />
          </SelectTrigger>
          <SelectContent>
            {catalog.filter(c => c.active).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : rules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{t("tests.plans.rules.empty")}</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const cat = rule.tests_catalog;
            return (
              <div key={rule.id} className="flex flex-wrap items-center gap-2 p-2.5 border border-border rounded-lg bg-background text-xs">
                <div className="font-medium text-foreground min-w-[120px]">
                  {cat?.code ?? "?"} — {cat?.name ?? "?"}
                </div>
                <Select value={rule.applies_to} onValueChange={(v) => handleUpdateRule(rule.id, { applies_to: v })}>
                  <SelectTrigger className="h-6 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{t(`tests.plans.rules.appliesOptions.${o}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={rule.frequency_type} onValueChange={(v) => handleUpdateRule(rule.id, { frequency_type: v })}>
                  <SelectTrigger className="h-6 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQ_TYPES.map(f => (
                      <SelectItem key={f} value={f}>{t(`tests.plans.rules.frequencyOptions.${f}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Checkbox checked={rule.requires_report}
                    onCheckedChange={(c) => handleUpdateRule(rule.id, { requires_report: !!c })} />
                  <span className="text-muted-foreground">{t("tests.plans.rules.requiresReport")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Checkbox checked={rule.requires_photos}
                    onCheckedChange={(c) => handleUpdateRule(rule.id, { requires_photos: !!c })} />
                  <span className="text-muted-foreground">{t("tests.plans.rules.requiresPhotos")}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Anexo B PE Section ──────────────────────────────────────────────────────

interface AnnexBRow {
  id: string;
  test_code: string;
  test_name: string;
  disciplina: string;
  standards: string[] | null;
  frequency: string | null;
  acceptance_criteria: string | null;
  requires_lab: boolean;
  material_scope: string;
}

function AnnexBSection() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const reportMeta = useReportMeta();
  const [rows, setRows] = useState<AnnexBRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    supabase
      .from("view_pe_annexb_pf17a" as any)
      .select("*")
      .eq("project_id", activeProject.id)
      .then(({ data, error }: any) => {
        if (error) console.error("[AnnexB]", error);
        setRows((data ?? []) as unknown as AnnexBRow[]);
        setLoading(false);
      });
  }, [activeProject]);

  // Group by discipline
  const grouped = useMemo(() => {
    const map = new Map<string, AnnexBRow[]>();
    rows.forEach(r => {
      const disc = r.disciplina || "outros";
      if (!map.has(disc)) map.set(disc, []);
      map.get(disc)!.push(r);
    });
    return Array.from(map.entries());
  }, [rows]);

  const handleExportPdf = () => {
    if (!reportMeta) return;
    const l: ReportLabels = { appName: "Atlas QMS", reportTitle: "Mapa de Ensaios — Anexo B PE", generatedOn: "Gerado a" };

    let counter = 1;
    let tableHtml = "";
    for (const [disc, items] of grouped) {
      tableHtml += `<div class="atlas-section">${t(`ppi.disciplinas.${disc}`, { defaultValue: disc })}</div>`;
      tableHtml += `<table class="atlas-table"><thead><tr>
        <th>#</th><th>Código</th><th>Ensaio</th><th>Norma</th><th>Frequência</th><th>Critério</th><th>Lab?</th>
      </tr></thead><tbody>`;
      for (const item of items) {
        tableHtml += `<tr>
          <td>${counter++}</td>
          <td>${item.test_code}</td>
          <td>${item.test_name}</td>
          <td>${(item.standards ?? []).join(", ") || "—"}</td>
          <td>${item.frequency ?? "—"}</td>
          <td>${item.acceptance_criteria ?? "—"}</td>
          <td>${item.requires_lab ? "Sim" : "Não"}</td>
        </tr>`;
      }
      tableHtml += `</tbody></table>`;
    }

    const html = generatePdfDocument({
      title: "Mapa de Ensaios — Anexo B PE",
      labels: l,
      meta: reportMeta,
      bodyHtml: tableHtml + `<div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} ensaio(s)</div>`,
      footerRef: `ANEXO-B-${reportMeta.projectCode}`,
    });
    printHtml(html, buildReportFilename("ANEXO-B", reportMeta.projectCode, "PE"));
  };

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Mapa de Ensaios (Anexo B PE)</h4>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExportPdf}>
          <FileDown className="h-3.5 w-3.5" />
          Exportar PDF
        </Button>
      </div>
      {grouped.map(([disc, items]) => (
        <Collapsible key={disc} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [&[data-state=closed]]:rotate-[-90deg]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`ppi.disciplinas.${disc}`, { defaultValue: disc })}
            </span>
            <Badge variant="secondary" className="text-[10px] py-0 ml-auto">{items.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border border-border overflow-hidden mt-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ensaio</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Norma</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frequência</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Critério</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lab?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/10">
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{item.test_code}</TableCell>
                      <TableCell className="text-sm">{item.test_name}</TableCell>
                      <TableCell className="text-xs">{(item.standards ?? []).join(", ") || "—"}</TableCell>
                      <TableCell className="text-xs">{item.frequency ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{item.acceptance_criteria ?? "—"}</TableCell>
                      <TableCell>
                        {item.requires_lab ? (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Sim</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

// ─── Discipline chips for KPIs ───────────────────────────────────────────────
const DISCIPLINE_CHIPS = [
  { code: "D1", key: "terras", label: "Topografia" },
  { code: "D2", key: "betao", label: "Betão" },
  { code: "D3", key: "ferrovia", label: "Via Férrea" },
  { code: "D4", key: "instalacoes", label: "Soldadura" },
  { code: "D5", key: "firmes", label: "Geotecnia" },
  { code: "D6", key: "geral", label: "Catenária" },
  { code: "D7", key: "estruturas", label: "Elétrico" },
  { code: "D8", key: "outros", label: "Auditorias" },
];

// ─── Main PlanTab ────────────────────────────────────────────────────────────
export function PlanTab() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: plans, loading, refetch } = useTestPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState<string | null>(null);
  const [allRules, setAllRules] = useState<TestPlanRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Load all rules for the active plan (PE-PF17A-001 or first active plan)
  const activePlan = plans.find(p => p.status === "active") ?? plans[0];
  
  const loadAllRules = useCallback(async () => {
    if (!activePlan) return;
    setLoadingRules(true);
    try {
      const data = await testPlanService.getRules(activePlan.id);
      setAllRules(data);
    } catch (err) { console.error(err); }
    finally { setLoadingRules(false); }
  }, [activePlan?.id, activePlan]);

  useEffect(() => { loadAllRules(); }, [loadAllRules]);

  // Discipline counts for KPI chips
  const disciplineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allRules.forEach(r => {
      const disc = r.tests_catalog?.disciplina ?? "outros";
      counts[disc] = (counts[disc] || 0) + 1;
    });
    return counts;
  }, [allRules]);

  // Filter rules by discipline
  const filteredRules = useMemo(() => {
    if (!filterDiscipline) return allRules;
    return allRules.filter(r => (r.tests_catalog?.disciplina ?? "outros") === filterDiscipline);
  }, [allRules, filterDiscipline]);

  const handleDelete = async (plan: TestPlan) => {
    if (!activeProject) return;
    try {
      await testPlanService.softDelete(plan.id, activeProject.id);
      toast({ title: t("tests.plans.toast.deleted") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{t("tests.plans.title")}</h3>
        <Button size="sm" className="h-8 gap-1.5"
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("tests.plans.newPlan")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState icon={BookOpen} subtitleKey="tests.plans.empty" />
      ) : (
        <>
          {/* Active plan detail with discipline KPIs */}
          {activePlan && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground">{activePlan.code}</span>
                    <Badge variant="secondary" className={cn("text-xs", PLAN_STATUS_COLORS[activePlan.status] ?? "")}>
                      {t(`tests.plans.status.${activePlan.status}`)}
                    </Badge>
                    {activePlan.status === "draft" && (
                      <button
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5 hover:bg-emerald-100 transition-colors"
                        onClick={async () => {
                          try {
                            await (supabase as any).from("test_plans").update({ status: "active" }).eq("id", activePlan.id);
                            await refetch();
                            toast({ title: "Plano activado", description: "Pode agora gerar agendamentos na tab Agendados." });
                          } catch { toast({ title: "Erro ao activar plano", variant: "destructive" }); }
                        }}
                      >
                        ✓ Activar Plano
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{activePlan.title}</p>
                  {activePlan.scope_notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{activePlan.scope_notes}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">{allRules.length} {t("tests.plans.rules.title", { defaultValue: "regras" })}</span>
              </div>
              
              {/* Discipline KPI chips */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterDiscipline === null ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilterDiscipline(null)}
                >
                  {t("common.all", { defaultValue: "Todos" })} ({allRules.length})
                </Button>
                {DISCIPLINE_CHIPS.map(chip => {
                  const count = disciplineCounts[chip.key] ?? 0;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={chip.code}
                      variant={filterDiscipline === chip.key ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFilterDiscipline(filterDiscipline === chip.key ? null : chip.key)}
                    >
                      {chip.code} {t(`ppi.disciplinas.${chip.key}`, { defaultValue: chip.label })} ({count})
                    </Button>
                  );
                })}
              </div>

              {/* Rules table */}
              {loadingRules ? (
                <Skeleton className="h-32 w-full" />
              ) : filteredRules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("tests.plans.rules.empty")}</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.code")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.name")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.disciplina")}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.plans.rules.frequency", { defaultValue: "Frequência" })}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.plans.rules.labRequired", { defaultValue: "Lab Obrigatório" })}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.plans.rules.witness", { defaultValue: "Testemunha" })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => {
                        const cat = rule.tests_catalog;
                        return (
                          <TableRow key={rule.id} className="hover:bg-muted/10">
                            <TableCell className="font-mono text-xs font-semibold">{cat?.code ?? "—"}</TableCell>
                            <TableCell className="text-sm">{cat?.name ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t(`ppi.disciplinas.${cat?.disciplina ?? "outros"}`, { defaultValue: cat?.disciplina })}
                            </TableCell>
                            <TableCell className="text-xs">
                              {t(`tests.plans.rules.frequencyOptions.${rule.frequency_type}`, { defaultValue: rule.frequency_type })}
                            </TableCell>
                            <TableCell>
                              {rule.requires_report ? (
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">{t("common.yes")}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t("common.no")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule.requires_photos ? (
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">{t("common.yes")}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t("common.no")}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* All plans list */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tests.plans.allPlans", { defaultValue: "Todos os Planos" })}</p>
            {plans.map((plan) => (
              <div key={plan.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer",
                    expandedId === plan.id && "bg-muted/30 border-primary/30"
                  )}
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                >
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedId === plan.id && "rotate-90")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{plan.code}</span>
                      <span className="text-sm font-medium text-foreground truncate">{plan.title}</span>
                    </div>
                    {plan.scope_disciplina && (
                      <span className="text-xs text-muted-foreground">
                        {t(`ppi.disciplinas.${plan.scope_disciplina}`, { defaultValue: plan.scope_disciplina })}
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className={cn("text-xs", PLAN_STATUS_COLORS[plan.status] ?? "")}>
                    {t(`tests.plans.status.${plan.status}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{plan.rules_count ?? 0} {t("tests.plans.rules.title").toLowerCase()}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditing(plan); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(plan)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedId === plan.id && <RuleEditor plan={plan} />}
              </div>
            ))}
          </div>
        </>
      )}

      <AnnexBSection />

      <PlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editing} onSuccess={refetch} />
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTestPlans } from "@/hooks/useTestPlans";
import {
  testPlanService,
  type TestPlan, type TestPlanRule, type TestPlanRuleInput,
} from "@/lib/services/testPlanService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Pencil, Trash2, ChevronRight, Loader2,
} from "lucide-react";
import { TEST_DISCIPLINES } from "@/lib/services/testService";
import { testService } from "@/lib/services/testService";
import type { TestCatalogEntry } from "@/lib/services/testService";

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

// ─── Main PlanTab ────────────────────────────────────────────────────────────
export function PlanTab() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: plans, loading, refetch } = useTestPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div className="space-y-2">
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
      )}

      <PlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editing} onSuccess={refetch} />
    </div>
  );
}

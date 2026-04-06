import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { compareWbsCodes } from "@/lib/utils/wbsSort";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { planningService, type Activity, type WbsNode } from "@/lib/services/planningService";
import { workItemService } from "@/lib/services/workItemService";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { ChevronDown, Construction } from "lucide-react";

const STATUSES = ["planned", "in_progress", "blocked", "completed", "cancelled"] as const;
const WI_DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "via", "geotecnia", "eletrica", "sinalizacao", "geral", "outros"] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wbsNodes: WbsNode[];
  editActivity?: Activity | null;
  onSuccess: () => void;
  preselectedWbsId?: string | null;
}

const EMPTY = {
  wbs_id: "__none__", work_item_id: "__none__", subcontractor_id: "__none__",
  zone: "", description: "", planned_start: "", planned_end: "",
  actual_start: "", actual_end: "", progress_pct: 0, status: "planned" as string,
  constraints_text: "",
  requires_topography: false, requires_tests: false, requires_ppi: false,
};

const EMPTY_WI = {
  sector: "", disciplina: "geral", pk_inicio: "", pk_fim: "",
};

export function ActivityFormDialog({ open, onOpenChange, wbsNodes, editActivity, onSuccess, preselectedWbsId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { data: workItems } = useWorkItems();
  const { data: subcontractors } = useSubcontractors();

  // Mapa wbs_id → nó WBS
  const wbsMap = useMemo(() => new Map(wbsNodes.map(n => [n.id, n])), [wbsNodes]);

  const [form, setForm] = useState(EMPTY);

  // Filtrar work_items pela disciplina do WBS seleccionado
  const filteredWorkItems = useMemo(() => {
    const wbsId = form.wbs_id !== "__none__" ? form.wbs_id : null;
    if (!wbsId) return workItems;
    const node = wbsMap.get(wbsId);
    if (!node) return workItems;
    const rootCode = parseInt(node.wbs_code.split(".")[0]);
    const discMap: Record<number, string[]> = {
      1: ["geral"], 2: ["terras", "geotecnia"], 3: ["drenagem"],
      4: ["betao", "estruturas"], 5: ["estruturas", "betao"],
      6: ["ferrovia", "via"], 7: ["catenaria", "eletrica"],
      8: ["st", "sinalizacao"], 9: ["geral", "outros"],
      10: ["eletrica", "geral"], 11: ["geral"],
    };
    const discs = discMap[rootCode];
    if (!discs) return workItems;
    const filtered = workItems.filter(wi => discs.includes(wi.disciplina));
    return filtered.length > 0 ? filtered : workItems;
  }, [workItems, form.wbs_id, wbsMap]);

  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editActivity;

  // WorkItem creation inline
  const [createWI, setCreateWI] = useState(true);
  const [wiForm, setWiForm] = useState(EMPTY_WI);
  const showWICreation = !isEdit && (form.requires_ppi || form.requires_tests) && form.work_item_id === "__none__";

  useEffect(() => {
    if (editActivity) {
      setForm({
        wbs_id: editActivity.wbs_id ?? "__none__",
        work_item_id: editActivity.work_item_id ?? "__none__",
        subcontractor_id: editActivity.subcontractor_id ?? "__none__",
        zone: editActivity.zone ?? "",
        description: editActivity.description,
        planned_start: editActivity.planned_start ?? "",
        planned_end: editActivity.planned_end ?? "",
        actual_start: editActivity.actual_start ?? "",
        actual_end: editActivity.actual_end ?? "",
        progress_pct: editActivity.progress_pct,
        status: editActivity.status,
        constraints_text: editActivity.constraints_text ?? "",
        requires_topography: editActivity.requires_topography,
        requires_tests: editActivity.requires_tests,
        requires_ppi: editActivity.requires_ppi,
      });
    } else {
      setForm({ ...EMPTY, wbs_id: preselectedWbsId ?? "__none__" });
      setWiForm(EMPTY_WI);
      setCreateWI(true);
    }
  }, [editActivity, open, preselectedWbsId]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !form.description.trim()) return;
    setSubmitting(true);
    try {
      let workItemId = form.work_item_id === "__none__" ? null : form.work_item_id;

      // Create WorkItem inline if needed
      if (!isEdit && showWICreation && createWI && wiForm.sector.trim()) {
        const wi = await workItemService.create({
          project_id: activeProject.id,
          sector: wiForm.sector.trim(),
          disciplina: wiForm.disciplina || "geral",
          pk_inicio: wiForm.pk_inicio ? Number(wiForm.pk_inicio) : null,
          pk_fim: wiForm.pk_fim ? Number(wiForm.pk_fim) : null,
          created_by: user.id,
        });
        workItemId = wi.id;
      }

      const payload = {
        wbs_id: form.wbs_id === "__none__" ? null : form.wbs_id,
        work_item_id: workItemId,
        subcontractor_id: form.subcontractor_id === "__none__" ? null : form.subcontractor_id,
        zone: form.zone || undefined,
        description: form.description.trim(),
        planned_start: form.planned_start || undefined,
        planned_end: form.planned_end || undefined,
        actual_start: form.actual_start || undefined,
        actual_end: form.actual_end || undefined,
        progress_pct: form.progress_pct,
        status: form.status,
        constraints_text: form.constraints_text || undefined,
        requires_topography: form.requires_topography,
        requires_tests: form.requires_tests,
        requires_ppi: form.requires_ppi,
      };

      if (editActivity) {
        await planningService.updateActivity(editActivity.id, activeProject.id, payload);
        toast.success(t("planning.toast.activityUpdated"));
      } else {
        await planningService.createActivity({ ...payload, project_id: activeProject.id, created_by: user.id });
        if (workItemId && showWICreation && createWI) {
          toast.success(t("planning.workItemCreated", { defaultValue: "Atividade e elemento de obra criados" }));
        } else {
          toast.success(t("planning.toast.activityCreated"));
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("planning.activity.editTitle") : t("planning.activity.createTitle")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div><Label>{t("common.description")} *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>

            <div className="flex items-center gap-2 my-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.form.sectionLinks", { defaultValue: "Ligações" })}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>WBS</Label>
                <Select value={form.wbs_id} onValueChange={v => setForm(f => ({ ...f, wbs_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {[...wbsNodes].sort((a, b) => compareWbsCodes(a.wbs_code, b.wbs_code)).map(n => <SelectItem key={n.id} value={n.id}>{n.wbs_code} — {n.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("planning.fields.workItem")}</Label>
                <Select value={form.work_item_id} onValueChange={v => setForm(f => ({ ...f, work_item_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {filteredWorkItems.map(wi => (
                      <SelectItem key={wi.id} value={wi.id}>
                        {wi.sector}{wi.elemento ? ` — ${wi.elemento}` : ""}{wi.parte ? ` (${wi.parte})` : ""}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          · {t(`workItems.disciplines.${t(`workItems.disciplines.${wi.disciplina}`, { defaultValue: wi.disciplina })}`, { defaultValue: wi.disciplina })}
                        </span>
                      </SelectItem>
                    ))}
                    {filteredWorkItems.length < workItems.length && (
                      <SelectItem value="__show_all__" disabled className="text-xs text-muted-foreground italic">
                        {workItems.length - filteredWorkItems.length} {t("common.more", { defaultValue: "mais (outras disciplinas)" })}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("planning.fields.subcontractor")}</Label>
                <Select value={form.subcontractor_id} onValueChange={v => setForm(f => ({ ...f, subcontractor_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.fields.zone")}</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="PK 12+500" /></div>
              <div>
                <Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{t(`planning.status.${s}`, { defaultValue: s })}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.form.sectionDates", { defaultValue: "Datas" })}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.fields.plannedStart")}</Label><Input type="date" value={form.planned_start} onChange={e => setForm(f => ({ ...f, planned_start: e.target.value }))} /></div>
              <div><Label>{t("planning.fields.plannedEnd")}</Label><Input type="date" value={form.planned_end} onChange={e => setForm(f => ({ ...f, planned_end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.fields.actualStart")}</Label><Input type="date" value={form.actual_start} onChange={e => setForm(f => ({ ...f, actual_start: e.target.value }))} /></div>
              <div><Label>{t("planning.fields.actualEnd")}</Label><Input type="date" value={form.actual_end} onChange={e => setForm(f => ({ ...f, actual_end: e.target.value }))} /></div>
            </div>

            <div>
              <Label>{t("planning.fields.progress")}: {form.progress_pct}%</Label>
              <Slider value={[form.progress_pct]} onValueChange={([v]) => setForm(f => ({ ...f, progress_pct: v }))} max={100} step={5} className="mt-2" />
            </div>

            <div><Label>{t("planning.fields.constraints")}</Label><Textarea value={form.constraints_text} onChange={e => setForm(f => ({ ...f, constraints_text: e.target.value }))} rows={2} placeholder={t("planning.fields.constraintsPlaceholder")} /></div>

            <div className="flex items-center gap-2 my-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.form.sectionRequirements", { defaultValue: "Requisitos" })}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="req-topo" checked={form.requires_topography} onCheckedChange={v => setForm(f => ({ ...f, requires_topography: !!v }))} />
                <Label htmlFor="req-topo" className="text-sm">{t("planning.fields.reqTopography")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="req-tests" checked={form.requires_tests} onCheckedChange={v => setForm(f => ({ ...f, requires_tests: !!v }))} />
                <Label htmlFor="req-tests" className="text-sm">{t("planning.fields.reqTests")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="req-ppi" checked={form.requires_ppi} onCheckedChange={v => setForm(f => ({ ...f, requires_ppi: !!v }))} />
                <Label htmlFor="req-ppi" className="text-sm">{t("planning.fields.reqPpi")}</Label>
              </div>
            </div>

            {/* ── Criar WorkItem inline ─────────────────────────────── */}
            {showWICreation && (
              <Collapsible defaultOpen={true}>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Construction className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t("planning.createWorkItem", { defaultValue: "Criar elemento de obra associado" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={createWI} onCheckedChange={setCreateWI} onClick={e => e.stopPropagation()} />
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {createWI && (
                      <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t("workItems.detail.sector")} *</Label>
                            <Input value={wiForm.sector} onChange={e => setWiForm(f => ({ ...f, sector: e.target.value }))} placeholder="Ex: PSR Cachofarra" />
                          </div>
                          <div>
                            <Label className="text-xs">{t("workItems.detail.discipline")}</Label>
                            <Select value={wiForm.disciplina} onValueChange={v => setWiForm(f => ({ ...f, disciplina: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WI_DISCIPLINES.map(d => (
                                  <SelectItem key={d} value={d}>{t(`workItems.disciplines.${d}`, { defaultValue: d })}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">PK {t("workItems.detail.pkStart", { defaultValue: "Início" })}</Label>
                            <Input type="number" value={wiForm.pk_inicio} onChange={e => setWiForm(f => ({ ...f, pk_inicio: e.target.value }))} placeholder="29730" />
                          </div>
                          <div>
                            <Label className="text-xs">PK {t("workItems.detail.pkEnd", { defaultValue: "Fim" })}</Label>
                            <Input type="number" value={wiForm.pk_fim} onChange={e => setWiForm(f => ({ ...f, pk_fim: e.target.value }))} placeholder="33700" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {isEdit && editActivity && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="planning_activities"
                  entityId={editActivity.id}
                />
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? t("common.loading") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

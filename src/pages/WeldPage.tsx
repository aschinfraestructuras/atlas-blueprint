import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useWorkItems } from "@/hooks/useWorkItems";
import { weldService, type WeldRecord, type WeldInput, computeOverallResult } from "@/lib/services/weldService";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  Flame, Plus, Search, Trash2, FileDown, CheckCircle2, XCircle, Wrench, Clock, AlertTriangle, ShieldAlert, Pencil,
} from "lucide-react";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { supabase } from "@/integrations/supabase/client";

const RAIL_PROFILES = ["60E1", "54E1", "55G2", "46E3", "50E6"];
const WELD_TYPES = ["aluminotermica", "continua", "flash_butt"];
const TRACK_SIDES = ["esquerda", "direita", "ambos"];

function resultColor(r: string) {
  if (r === "pass") return "bg-primary/15 text-primary";
  if (r === "fail") return "bg-destructive/10 text-destructive";
  if (r === "repair_needed") return "bg-orange-500/10 text-orange-600";
  return "bg-muted text-muted-foreground";
}

function CertExpiryBadge({ date }: { date: string | null | undefined }) {
  if (!date) return null;
  const today = new Date();
  const expiry = new Date(date);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return <Badge variant="destructive" className="text-[10px] ml-1">Cert. expirado</Badge>;
  if (diff <= 30) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] ml-1">Cert. expira em {diff}d</Badge>;
  return null;
}

export default function WeldPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const { data: workItems } = useWorkItems();
  const [records, setRecords] = useState<WeldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("all");
  const [filterPendingUS, setFilterPendingUS] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetIdState, setDeleteTargetIdState] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<WeldInput>>({
    rail_profile: "60E1",
    weld_type: "aluminotermica",
    track_side: "esquerda",
    alignment_criteria: 0.5,
    hv_criteria_min: 260,
    hv_criteria_max: 380,
    has_ut: false,
    has_hardness: false,
  });

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try { setRecords(await weldService.listByProject(activeProject.id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const sevenDaysAgoDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  }, []);

  const pendingUtCount = useMemo(() => {
    return records.filter(w => !w.has_ut && new Date(w.weld_date) < sevenDaysAgoDate).length;
  }, [records, sevenDaysAgoDate]);

  if (!activeProject) return <NoProjectBanner />;

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.code.toLowerCase().includes(q) || r.pk_location.toLowerCase().includes(q) || (r.operator_name ?? "").toLowerCase().includes(q);
    const matchResult = filterResult === "all" || r.overall_result === filterResult;
    const matchPendingUS = !filterPendingUS || (!r.has_ut && new Date(r.weld_date) < sevenDaysAgoDate);
    return matchSearch && matchResult && matchPendingUS;
  });

  const pass = records.filter(w => w.overall_result === "pass").length;
  const fail = records.filter(w => w.overall_result === "fail").length;
  const repair = records.filter(w => w.overall_result === "repair_needed").length;
  const withUt = records.filter(w => w.has_ut).length;

  const defaultForm: Partial<WeldInput> = { rail_profile: "60E1", weld_type: "aluminotermica", track_side: "esquerda", alignment_criteria: 0.5, hv_criteria_min: 260, hv_criteria_max: 380, has_ut: false, has_hardness: false };

  const openEdit = (w: WeldRecord) => {
    setEditingId(w.id);
    setForm({
      pk_location: w.pk_location, weld_date: w.weld_date, rail_profile: w.rail_profile,
      track_side: w.track_side ?? "esquerda", weld_type: w.weld_type,
      operator_name: w.operator_name, operator_cert_ref: w.operator_cert_ref,
      portion_brand: w.portion_brand, portion_lot: w.portion_lot, mold_type: w.mold_type,
      preheat_temp_c: w.preheat_temp_c, preheat_duration_min: w.preheat_duration_min,
      preheat_pass: w.preheat_pass, visual_pass: w.visual_pass, visual_notes: w.visual_notes,
      excess_material_ok: w.excess_material_ok, alignment_mm: w.alignment_mm,
      alignment_criteria: w.alignment_criteria, has_ut: w.has_ut,
      ut_operator: w.ut_operator, ut_equipment_code: w.ut_equipment_code,
      ut_calibration_date: w.ut_calibration_date, ut_result: w.ut_result, ut_defect_desc: w.ut_defect_desc,
      has_hardness: w.has_hardness, hv_rail_left: w.hv_rail_left, hv_rail_right: w.hv_rail_right,
      hv_weld_center: w.hv_weld_center, hv_criteria_min: w.hv_criteria_min, hv_criteria_max: w.hv_criteria_max,
      notes: w.notes,
    } as any);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.pk_location) { toast({ title: "PK obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await weldService.update(editingId, { ...form } as Partial<WeldRecord>);
        toast({ title: "Soldadura atualizada" });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        await weldService.create({
          ...form,
          project_id: activeProject.id,
          created_by: userData.user?.id ?? null,
          weld_date: form.weld_date || new Date().toISOString().split("T")[0],
          pk_location: form.pk_location!,
          rail_profile: form.rail_profile || "60E1",
          weld_type: form.weld_type || "aluminotermica",
          alignment_criteria: form.alignment_criteria ?? 0.5,
          hv_criteria_min: form.hv_criteria_min ?? 260,
          hv_criteria_max: form.hv_criteria_max ?? 380,
          has_ut: form.has_ut ?? false,
          has_hardness: form.has_hardness ?? false,
        } as WeldInput);
        toast({ title: "Soldadura registada" });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      load();
    } catch (err: any) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const confirmDeleteWeld = async () => {
    if (!deleteTargetIdState) return;
    try { await weldService.remove(deleteTargetIdState); load(); } catch (e) { console.error(e); }
    setDeleteTargetIdState(null);
  };

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title={t("welding.title")} subtitle={t("welding.subtitle")} icon={Flame} backHref="/tests" backLabel="Ensaios" module="Ensaios" />

      {/* AE.3 — US pending banner */}
      {pendingUtCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-fade-in">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm flex-1">
            ⚠ <strong>{pendingUtCount}</strong> {t("welds.usPendingBanner", { defaultValue: "soldadura(s) com US pendente há mais de 7 dias" })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setFilterPendingUS(prev => !prev)}
          >
            {filterPendingUS ? t("common.showAll", { defaultValue: "Mostrar todas" }) : t("welds.filterPendingUS", { defaultValue: "Ver pendentes US" })}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ModuleKPICard label={t("welding.kpi.total")} value={records.length} icon={Flame} />
        <ModuleKPICard label={t("welding.kpi.pass")} value={pass} icon={CheckCircle2} color="hsl(var(--primary))" />
        <ModuleKPICard label={t("welding.kpi.fail")} value={fail} icon={XCircle} color={fail > 0 ? "hsl(var(--destructive))" : undefined} />
        <ModuleKPICard label={t("welding.kpi.repair")} value={repair} icon={Wrench} />
        <ModuleKPICard label={t("welding.kpi.ut")} value={withUt} icon={Flame} />
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar soldaduras..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pass">{t("welding.result.pass")}</SelectItem>
            <SelectItem value="fail">{t("welding.result.fail")}</SelectItem>
            <SelectItem value="repair_needed">{t("welding.result.repair_needed")}</SelectItem>
            <SelectItem value="pending">{t("welding.result.pending")}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5 ml-auto" onClick={() => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />Nova Soldadura
        </Button>
      </FilterBar>

      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Flame} subtitleKey="welding.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">{t("common.code")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">PK</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("common.date")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("welds.workItem", { defaultValue: "Elemento" })}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("welding.fields.operator")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Visual</TableHead>
              <TableHead className="text-xs font-semibold uppercase">UT</TableHead>
              <TableHead className="text-xs font-semibold uppercase">HV</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.result")}</TableHead>
              <TableHead className="w-20" />
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(w => (
                <TableRow key={w.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-semibold">{w.code}</TableCell>
                  <TableCell className="text-xs">{w.pk_location}</TableCell>
                  <TableCell className="text-xs">{w.weld_date}</TableCell>
                  <TableCell className="text-xs">{w.work_item_id ? (() => { const wi = workItems.find(x => x.id === w.work_item_id); return wi ? `${wi.sector} — ${wi.disciplina ?? ""}` : "—"; })() : "—"}</TableCell>
                  <TableCell className="text-xs">
                    {w.operator_name ?? "—"}
                    <CertExpiryBadge date={(w as any).operator_cert_expiry} />
                  </TableCell>
                  <TableCell>{w.visual_pass === true ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : w.visual_pass === false ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}</TableCell>
                  <TableCell>{!w.has_ut ? "—" : w.ut_result === "aceite" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : w.ut_result === "rejeitado" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}</TableCell>
                  <TableCell>{!w.has_hardness ? "—" : w.hv_pass === true ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : w.hv_pass === false ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}</TableCell>
                  <TableCell><Badge variant="secondary" className={resultColor(w.overall_result)}>{t(`welding.result.${w.overall_result}`, { defaultValue: w.overall_result })}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => weldService.exportPdf(w, activeProject.name ?? "Atlas", logoBase64)}><FileDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTargetIdState(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Creation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? t("welding.form.editTitle") : t("welding.form.newTitle")}</DialogTitle></DialogHeader>
          <Tabs defaultValue="id">
            <TabsList className="w-full">
              <TabsTrigger value="id">Identificação</TabsTrigger>
              <TabsTrigger value="materials">Materiais</TabsTrigger>
              <TabsTrigger value="inspection">Inspecção</TabsTrigger>
              <TabsTrigger value="ut_hv">UT e Dureza</TabsTrigger>
            </TabsList>

            <TabsContent value="id" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("welding.fields.pk")} Início</Label>
                  <Input value={form.pk_location ?? ""} onChange={e => setField("pk_location", e.target.value)} placeholder="PK 30+500" />
                </div>
                <div>
                  <Label>PK Fim</Label>
                  <Input value={(form as any).pk_end ?? ""} onChange={e => setField("pk_end", e.target.value)} placeholder="PK 30+520" />
                </div>
                <div><Label>{t("common.date")}</Label><Input type="date" value={form.weld_date ?? new Date().toISOString().split("T")[0]} onChange={e => setField("weld_date", e.target.value)} /></div>
                <div><Label>{t("welding.fields.railProfile")}</Label>
                  <Select value={form.rail_profile ?? "60E1"} onValueChange={v => setField("rail_profile", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RAIL_PROFILES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("welding.form.trackSide")}</Label>
                  <Select value={form.track_side ?? "esquerda"} onValueChange={v => setField("track_side", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRACK_SIDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tipo soldadura</Label>
                  <Select value={form.weld_type ?? "aluminotermica"} onValueChange={v => setField("weld_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WELD_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("welding.fields.operator")}</Label><Input value={form.operator_name ?? ""} onChange={e => setField("operator_name", e.target.value)} /></div>
                <div><Label>{t("welding.fields.certRef")}</Label><Input value={form.operator_cert_ref ?? ""} onChange={e => setField("operator_cert_ref", e.target.value)} /></div>
                <div>
                  <Label>Validade Cert. EN ISO 9712</Label>
                  <Input type="date" value={(form as any).operator_cert_expiry ?? ""} onChange={e => setField("operator_cert_expiry", e.target.value)} />
                  <CertExpiryBadge date={(form as any).operator_cert_expiry} />
                </div>
                <div>
                  <Label>Bloco calibração (ref.)</Label>
                  <Input value={(form as any).bloco_calibracao_ref ?? ""} onChange={e => setField("bloco_calibracao_ref", e.target.value)} placeholder="V1, V2, IIW..." />
                </div>
                <div><Label>{t("welding.fields.portionBrand")}</Label><Input value={form.portion_brand ?? ""} onChange={e => setField("portion_brand", e.target.value)} /></div>
                <div><Label>{t("welding.fields.portionLot")}</Label><Input value={form.portion_lot ?? ""} onChange={e => setField("portion_lot", e.target.value)} /></div>
                <div><Label>Tipo de molde</Label><Input value={form.mold_type ?? ""} onChange={e => setField("mold_type", e.target.value)} /></div>
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Temp. pré-aquecimento (°C)</Label><Input type="number" value={form.preheat_temp_c ?? ""} onChange={e => setField("preheat_temp_c", e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.preheat_duration_min ?? ""} onChange={e => setField("preheat_duration_min", e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.visual_pass ?? false} onCheckedChange={v => setField("visual_pass", v)} />{t("welding.fields.visual")} OK</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.excess_material_ok ?? false} onCheckedChange={v => setField("excess_material_ok", v)} />Excesso material OK</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.preheat_pass ?? false} onCheckedChange={v => setField("preheat_pass", v)} />{t("welding.fields.preheat")} OK</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("welding.fields.alignment")}</Label><Input type="number" step="0.1" value={form.alignment_mm ?? ""} onChange={e => setField("alignment_mm", e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Critério (mm)</Label><Input type="number" step="0.1" value={form.alignment_criteria ?? 0.5} onChange={e => setField("alignment_criteria", Number(e.target.value))} /></div>
              </div>
              <div><Label>Notas visuais</Label><Input value={form.visual_notes ?? ""} onChange={e => setField("visual_notes", e.target.value)} /></div>
            </TabsContent>

            <TabsContent value="ut_hv" className="space-y-4 mt-3">
              <div className="space-y-3 p-3 rounded-lg border border-border">
                <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={form.has_ut ?? false} onCheckedChange={v => setField("has_ut", v)} />{t("welding.fields.ut")}</label>
                {form.has_ut && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Operador UT</Label><Input value={form.ut_operator ?? ""} onChange={e => setField("ut_operator", e.target.value)} /></div>
                    <div><Label>Equipamento</Label><Input value={form.ut_equipment_code ?? ""} onChange={e => setField("ut_equipment_code", e.target.value)} /></div>
                    <div><Label>Calibração</Label><Input type="date" value={form.ut_calibration_date ?? ""} onChange={e => setField("ut_calibration_date", e.target.value)} /></div>
                    <div><Label>Resultado UT</Label>
                      <Select value={form.ut_result ?? "pendente"} onValueChange={v => setField("ut_result", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aceite">Aceite</SelectItem>
                          <SelectItem value="rejeitado">Rejeitado</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label>Defeito (se rejeitado)</Label><Input value={form.ut_defect_desc ?? ""} onChange={e => setField("ut_defect_desc", e.target.value)} /></div>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-border">
                <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={form.has_hardness ?? false} onCheckedChange={v => setField("has_hardness", v)} />{t("welding.fields.hardness")}</label>
                {form.has_hardness && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>HV Esquerda</Label><Input type="number" value={form.hv_rail_left ?? ""} onChange={e => setField("hv_rail_left", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>HV Centro</Label><Input type="number" value={form.hv_weld_center ?? ""} onChange={e => setField("hv_weld_center", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>HV Direita</Label><Input type="number" value={form.hv_rail_right ?? ""} onChange={e => setField("hv_rail_right", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>Critério mín.</Label><Input type="number" value={form.hv_criteria_min ?? 260} onChange={e => setField("hv_criteria_min", Number(e.target.value))} /></div>
                    <div><Label>Critério máx.</Label><Input type="number" value={form.hv_criteria_max ?? 380} onChange={e => setField("hv_criteria_max", Number(e.target.value))} /></div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Attachments */}
          {editingId && activeProject && (
            <div className="mt-4">
              <AttachmentsPanel
                projectId={activeProject.id}
                entityType="weld_records"
                entityId={editingId}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "A guardar..." : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTargetIdState} onOpenChange={(v) => !v && setDeleteTargetIdState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWeld} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

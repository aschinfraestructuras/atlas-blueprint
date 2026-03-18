import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Mountain, Plus, FileDown, Trash2, Eye, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle,
} from "lucide-react";
import { soilService, computeOverallResult, computeAashtoClass, type SoilSample, type CreateSoilInput } from "@/lib/services/soilService";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useWorkItems } from "@/hooks/useWorkItems";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { EmptyState } from "@/components/EmptyState";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { toast } from "@/hooks/use-toast";

const MATERIAL_TYPES = [
  "Solo argiloso",
  "Solo arenoso",
  "Tout-venant",
  "Brita",
  "Aterro seleccionado",
  "Outro",
];

// PK validation: PK NNN+NNN
function validatePK(val: string): boolean {
  if (!val) return true; // optional
  return /^PK\s*\d{1,4}\+\d{1,3}$/i.test(val.trim());
}

function SoilResultBadge({ result }: { result: string }) {
  if (result === "apto") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Apto</Badge>;
  if (result === "inapto") return <Badge variant="destructive">Inapto</Badge>;
  if (result === "conditional") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Condicional</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
}

export default function SoilPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const { data: workItems } = useWorkItems();
  const [samples, setSamples] = useState<SoilSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<SoilSample | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterResult, setFilterResult] = useState("all");

  const [form, setForm] = useState({
    work_item_id: "",
    sample_ref: "",
    pk_location: "",
    depth_from: "",
    depth_to: "",
    sample_date: new Date().toISOString().slice(0, 10),
    material_type: "",
    has_grading: false,
    grading_p0075: "", grading_p0425: "", grading_p2: "", grading_p10: "", grading_p20: "", grading_p50: "",
    grading_d10: "", grading_d30: "", grading_d60: "",
    has_atterberg: false,
    ll_pct: "", lp_pct: "",
    has_proctor: false,
    proctor_gamma_max: "", proctor_wopt: "",
    has_cbr: false,
    cbr_95: "", cbr_98: "", cbr_expansion: "", cbr_criteria: "",
    has_organic: false,
    organic_pct: "", organic_limit: "2.0",
    has_sulfates: false,
    sulfate_pct: "", chloride_pct: "", sulfate_limit: "0.5",
    notes: "",
  });

  const fetchSamples = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await soilService.listByProject(activeProject.id);
      setSamples(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  useEffect(() => {
    if (!detailId) { setDetailData(null); return; }
    soilService.getById(detailId).then(setDetailData);
  }, [detailId]);

  const filtered = samples.filter((s) => {
    if (filterResult !== "all" && s.overall_result !== filterResult) return false;
    return true;
  });

  const totalSamples = samples.length;
  const aptoCount = samples.filter((s) => s.overall_result === "apto").length;
  const conditionalCount = samples.filter((s) => s.overall_result === "conditional").length;
  const inaptoCount = samples.filter((s) => s.overall_result === "inapto").length;

  async function handleCreate() {
    if (!activeProject || !form.sample_ref.trim()) return;

    // PK validation
    if (form.pk_location && !validatePK(form.pk_location)) {
      toast({ title: "Formato PK inválido", description: "Use o formato PK NNN+NNN (ex: PK 30+500)", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const input: CreateSoilInput = {
        project_id: activeProject.id,
        work_item_id: form.work_item_id || null,
        sample_ref: form.sample_ref,
        pk_location: form.pk_location || null,
        depth_from: form.depth_from ? parseFloat(form.depth_from) : null,
        depth_to: form.depth_to ? parseFloat(form.depth_to) : null,
        sample_date: form.sample_date,
        material_type: form.material_type || null,
        has_grading: form.has_grading,
        has_atterberg: form.has_atterberg,
        has_proctor: form.has_proctor,
        has_cbr: form.has_cbr,
        has_organic: form.has_organic,
        has_sulfates: form.has_sulfates,
        notes: form.notes || null,
      };

      if (form.has_grading) {
        input.grading_p0075 = form.grading_p0075 ? parseFloat(form.grading_p0075) : null;
        input.grading_p0425 = form.grading_p0425 ? parseFloat(form.grading_p0425) : null;
        input.grading_p2 = form.grading_p2 ? parseFloat(form.grading_p2) : null;
        input.grading_p10 = form.grading_p10 ? parseFloat(form.grading_p10) : null;
        input.grading_p20 = form.grading_p20 ? parseFloat(form.grading_p20) : null;
        input.grading_p50 = form.grading_p50 ? parseFloat(form.grading_p50) : null;
        input.grading_d10 = form.grading_d10 ? parseFloat(form.grading_d10) : null;
        input.grading_d30 = form.grading_d30 ? parseFloat(form.grading_d30) : null;
        input.grading_d60 = form.grading_d60 ? parseFloat(form.grading_d60) : null;
      }

      if (form.has_atterberg) {
        input.ll_pct = form.ll_pct ? parseFloat(form.ll_pct) : null;
        input.lp_pct = form.lp_pct ? parseFloat(form.lp_pct) : null;
        const aashto = computeAashtoClass({
          grading_p0075: input.grading_p0075 as any,
          ip_pct: input.ll_pct && input.lp_pct ? input.ll_pct - input.lp_pct : null,
          ll_pct: input.ll_pct as any,
        } as any);
        input.aashto_class = aashto;
      }

      if (form.has_proctor) {
        input.proctor_gamma_max = form.proctor_gamma_max ? parseFloat(form.proctor_gamma_max) : null;
        input.proctor_wopt = form.proctor_wopt ? parseFloat(form.proctor_wopt) : null;
      }

      if (form.has_cbr) {
        input.cbr_95 = form.cbr_95 ? parseFloat(form.cbr_95) : null;
        input.cbr_98 = form.cbr_98 ? parseFloat(form.cbr_98) : null;
        input.cbr_expansion = form.cbr_expansion ? parseFloat(form.cbr_expansion) : null;
        input.cbr_criteria = form.cbr_criteria ? parseFloat(form.cbr_criteria) : null;
        input.cbr_pass = input.cbr_95 != null && input.cbr_criteria != null ? input.cbr_95 >= input.cbr_criteria : null;
      }

      if (form.has_organic) {
        input.organic_pct = form.organic_pct ? parseFloat(form.organic_pct) : null;
        input.organic_limit = parseFloat(form.organic_limit) || 2.0;
        input.organic_pass = input.organic_pct != null ? input.organic_pct <= input.organic_limit : null;
      }

      if (form.has_sulfates) {
        input.sulfate_pct = form.sulfate_pct ? parseFloat(form.sulfate_pct) : null;
        input.chloride_pct = form.chloride_pct ? parseFloat(form.chloride_pct) : null;
        input.sulfate_limit = parseFloat(form.sulfate_limit) || 0.5;
        input.sulfate_pass = input.sulfate_pct != null ? input.sulfate_pct <= input.sulfate_limit : null;
      }

      input.overall_result = computeOverallResult(input as any);

      await soilService.create(input);
      toast({ title: t("common.save") });
      setDialogOpen(false);
      fetchSamples();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await soilService.deleteSample(id);
      toast({ title: t("common.delete") });
      fetchSamples();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  function SectionBadges({ s }: { s: SoilSample }) {
    const badges: string[] = [];
    if (s.has_grading) badges.push("Gran.");
    if (s.has_atterberg) badges.push("Att.");
    if (s.has_proctor) badges.push("Proc.");
    if (s.has_cbr) badges.push("CBR");
    if (s.has_organic) badges.push("M.O.");
    if (s.has_sulfates) badges.push("Sulf.");
    return (
      <div className="flex gap-1 flex-wrap">
        {badges.map((b) => <Badge key={b} variant="outline" className="text-[10px] px-1.5 py-0">{b}</Badge>)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title={t("soils.title")}
        subtitle={t("soils.subtitle")}
        backHref="/tests"
        backLabel="Ensaios"
        module="Ensaios"
        icon={Mountain}
        actions={<Button onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> {t("soils.newSample")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ModuleKPICard label={t("soils.kpi.total")} value={totalSamples} icon={Mountain} />
        <ModuleKPICard label={t("soils.kpi.apto")} value={aptoCount} icon={CheckCircle2} color="hsl(158,45%,32%)" />
        <ModuleKPICard label={t("soils.kpi.conditional")} value={conditionalCount} icon={AlertTriangle} color="hsl(33,75%,38%)" />
        <ModuleKPICard label={t("soils.kpi.inapto")} value={inaptoCount} icon={XCircle} color="hsl(2,60%,44%)" />
      </div>

      <FilterBar>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="apto">Apto</SelectItem>
            <SelectItem value="conditional">Condicional</SelectItem>
            <SelectItem value="inapto">Inapto</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Mountain} titleKey="soils.empty" subtitleKey="soils.emptySubtitle" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("concrete.fields.code")}</TableHead>
                  <TableHead>Ref. Amostra</TableHead>
                  <TableHead>PK</TableHead>
                  <TableHead>Prof.</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Secções</TableHead>
                  <TableHead>{t("concrete.fields.result")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(s.id)}>
                    <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                    <TableCell>{s.sample_ref}</TableCell>
                    <TableCell className="text-xs">{s.pk_location ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.depth_from ?? "—"}–{s.depth_to ?? "—"} m</TableCell>
                    <TableCell className="text-xs">{s.material_type ?? "—"}</TableCell>
                    <TableCell><SectionBadges s={s} /></TableCell>
                    <TableCell><SoilResultBadge result={s.overall_result} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu actions={[
                        { key: "view", label: t("common.view"), icon: Eye, onClick: () => setDetailId(s.id) },
                        { key: "pdf", label: t("common.exportPdf"), icon: FileDown, onClick: () => soilService.exportPdf(s, activeProject?.name ?? "PF17A", logoBase64) },
                        { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => handleDelete(s.id), variant: "destructive" as const },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mountain className="h-5 w-5" /> {t("soils.newSample")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Identification */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Atividade</Label>
                <Select value={form.work_item_id} onValueChange={(v) => setForm((f) => ({ ...f, work_item_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {workItems.map((wi) => <SelectItem key={wi.id} value={wi.id}>{wi.sector} — {wi.elemento ?? wi.obra ?? wi.disciplina}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ref. Amostra *</Label><Input value={form.sample_ref} onChange={(e) => setForm((f) => ({ ...f, sample_ref: e.target.value }))} placeholder="S1-C2" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>PK (PK NNN+NNN)</Label>
                <Input
                  value={form.pk_location}
                  onChange={(e) => setForm((f) => ({ ...f, pk_location: e.target.value }))}
                  placeholder="PK 30+500"
                  className={form.pk_location && !validatePK(form.pk_location) ? "border-destructive" : ""}
                />
                {form.pk_location && !validatePK(form.pk_location) && (
                  <p className="text-[10px] text-destructive mt-0.5">Formato: PK NNN+NNN</p>
                )}
              </div>
              <div><Label>Prof. De (m)</Label><Input type="number" value={form.depth_from} onChange={(e) => setForm((f) => ({ ...f, depth_from: e.target.value }))} /></div>
              <div><Label>Prof. Até (m)</Label><Input type="number" value={form.depth_to} onChange={(e) => setForm((f) => ({ ...f, depth_to: e.target.value }))} /></div>
              <div><Label>Data</Label><Input type="date" value={form.sample_date} onChange={(e) => setForm((f) => ({ ...f, sample_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Tipo Material</Label>
              <Select value={form.material_type} onValueChange={(v) => setForm((f) => ({ ...f, material_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Section toggles */}
            <div className="flex flex-wrap gap-4 py-2 border-y border-border">
              {[
                { key: "has_grading", label: "Granulometria" },
                { key: "has_atterberg", label: "Atterberg" },
                { key: "has_proctor", label: "Proctor" },
                { key: "has_cbr", label: "CBR" },
                { key: "has_organic", label: "Mat. Orgânica" },
                { key: "has_sulfates", label: "Sulfatos" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} id={key} />
                  <Label htmlFor={key} className="text-xs cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>

            {/* Conditional sections */}
            {form.has_grading && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Granulometria</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">% P50</Label><Input type="number" className="h-8" value={form.grading_p50} onChange={(e) => setForm((f) => ({ ...f, grading_p50: e.target.value }))} /></div>
                  <div><Label className="text-xs">% P20</Label><Input type="number" className="h-8" value={form.grading_p20} onChange={(e) => setForm((f) => ({ ...f, grading_p20: e.target.value }))} /></div>
                  <div><Label className="text-xs">% P10</Label><Input type="number" className="h-8" value={form.grading_p10} onChange={(e) => setForm((f) => ({ ...f, grading_p10: e.target.value }))} /></div>
                  <div><Label className="text-xs">% P2</Label><Input type="number" className="h-8" value={form.grading_p2} onChange={(e) => setForm((f) => ({ ...f, grading_p2: e.target.value }))} /></div>
                  <div><Label className="text-xs">% P0.425</Label><Input type="number" className="h-8" value={form.grading_p0425} onChange={(e) => setForm((f) => ({ ...f, grading_p0425: e.target.value }))} /></div>
                  <div><Label className="text-xs">% P0.075</Label><Input type="number" className="h-8" value={form.grading_p0075} onChange={(e) => setForm((f) => ({ ...f, grading_p0075: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">D10</Label><Input type="number" className="h-8" value={form.grading_d10} onChange={(e) => setForm((f) => ({ ...f, grading_d10: e.target.value }))} /></div>
                  <div><Label className="text-xs">D30</Label><Input type="number" className="h-8" value={form.grading_d30} onChange={(e) => setForm((f) => ({ ...f, grading_d30: e.target.value }))} /></div>
                  <div><Label className="text-xs">D60</Label><Input type="number" className="h-8" value={form.grading_d60} onChange={(e) => setForm((f) => ({ ...f, grading_d60: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.has_atterberg && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Limites de Atterberg</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">LL (%)</Label><Input type="number" className="h-8" value={form.ll_pct} onChange={(e) => setForm((f) => ({ ...f, ll_pct: e.target.value }))} /></div>
                  <div><Label className="text-xs">LP (%)</Label><Input type="number" className="h-8" value={form.lp_pct} onChange={(e) => setForm((f) => ({ ...f, lp_pct: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.has_proctor && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Proctor Modificado</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">γd máx (kN/m³)</Label><Input type="number" className="h-8" value={form.proctor_gamma_max} onChange={(e) => setForm((f) => ({ ...f, proctor_gamma_max: e.target.value }))} /></div>
                  <div><Label className="text-xs">w óptimo (%)</Label><Input type="number" className="h-8" value={form.proctor_wopt} onChange={(e) => setForm((f) => ({ ...f, proctor_wopt: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.has_cbr && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">CBR</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">CBR 95%</Label><Input type="number" className="h-8" value={form.cbr_95} onChange={(e) => setForm((f) => ({ ...f, cbr_95: e.target.value }))} /></div>
                  <div><Label className="text-xs">CBR 98%</Label><Input type="number" className="h-8" value={form.cbr_98} onChange={(e) => setForm((f) => ({ ...f, cbr_98: e.target.value }))} /></div>
                  <div><Label className="text-xs">Expansão (%)</Label><Input type="number" className="h-8" value={form.cbr_expansion} onChange={(e) => setForm((f) => ({ ...f, cbr_expansion: e.target.value }))} /></div>
                  <div><Label className="text-xs">Critério</Label><Input type="number" className="h-8" value={form.cbr_criteria} onChange={(e) => setForm((f) => ({ ...f, cbr_criteria: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.has_organic && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Matéria Orgânica</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Teor (%)</Label><Input type="number" className="h-8" value={form.organic_pct} onChange={(e) => setForm((f) => ({ ...f, organic_pct: e.target.value }))} /></div>
                  <div><Label className="text-xs">Limite (%)</Label><Input type="number" className="h-8" value={form.organic_limit} onChange={(e) => setForm((f) => ({ ...f, organic_limit: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.has_sulfates && (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Sulfatos e Sais Solúveis</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">SO4 (%)</Label><Input type="number" className="h-8" value={form.sulfate_pct} onChange={(e) => setForm((f) => ({ ...f, sulfate_pct: e.target.value }))} /></div>
                  <div><Label className="text-xs">Cl (%)</Label><Input type="number" className="h-8" value={form.chloride_pct} onChange={(e) => setForm((f) => ({ ...f, chloride_pct: e.target.value }))} /></div>
                  <div><Label className="text-xs">Limite SO4 (%)</Label><Input type="number" className="h-8" value={form.sulfate_limit} onChange={(e) => setForm((f) => ({ ...f, sulfate_limit: e.target.value }))} /></div>
                </div>
              </div>
            )}

            <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !form.sample_ref.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mountain className="h-5 w-5" />
                  <span className="font-mono">{detailData.code}</span>
                  <SoilResultBadge result={detailData.overall_result} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Ref. Amostra</span><p>{detailData.sample_ref}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">PK</span><p>{detailData.pk_location ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Profundidade</span><p>{detailData.depth_from ?? "—"} a {detailData.depth_to ?? "—"} m</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Material</span><p>{detailData.material_type ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Data</span><p>{detailData.sample_date}</p></div>
                </div>

                {detailData.has_grading && (
                  <div className="p-3 border border-border rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Granulometria</h4>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-xs">
                      <div>P50: {detailData.grading_p50 ?? "—"}%</div>
                      <div>P20: {detailData.grading_p20 ?? "—"}%</div>
                      <div>P10: {detailData.grading_p10 ?? "—"}%</div>
                      <div>P2: {detailData.grading_p2 ?? "—"}%</div>
                      <div>P0.425: {detailData.grading_p0425 ?? "—"}%</div>
                      <div>P0.075: {detailData.grading_p0075 ?? "—"}%</div>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">Cu={detailData.grading_cu ?? "—"} · Cc={detailData.grading_cc ?? "—"}</p>
                  </div>
                )}

                {detailData.has_atterberg && (
                  <div className="p-3 border border-border rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Atterberg</h4>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>LL: {detailData.ll_pct ?? "—"}%</div>
                      <div>LP: {detailData.lp_pct ?? "—"}%</div>
                      <div>IP: {detailData.ip_pct ?? "—"}%</div>
                      <div>AASHTO: {detailData.aashto_class ?? "—"}</div>
                    </div>
                  </div>
                )}

                {detailData.has_proctor && (
                  <div className="p-3 border border-border rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Proctor</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>γd máx: {detailData.proctor_gamma_max ?? "—"} kN/m³</div>
                      <div>w óptimo: {detailData.proctor_wopt ?? "—"} %</div>
                    </div>
                  </div>
                )}

                {detailData.has_cbr && (
                  <div className="p-3 border border-border rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">CBR</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>CBR 95%: {detailData.cbr_95 ?? "—"}</div>
                      <div>CBR 98%: {detailData.cbr_98 ?? "—"}</div>
                      <div>Expansão: {detailData.cbr_expansion ?? "—"}%</div>
                    </div>
                    <div className="mt-1 text-xs">
                      Critério: ≥ {detailData.cbr_criteria ?? "—"} → {detailData.cbr_pass ? <span className="text-primary font-semibold">OK</span> : <span className="text-destructive font-semibold">NOK</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <AttachmentsPanel
                projectId={activeProject?.id ?? ""}
                entityType="soil_samples"
                entityId={detailData.id}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => soilService.exportPdf(detailData, activeProject?.name ?? "PF17A", logoBase64)}>
                  <FileDown className="h-4 w-4 mr-1.5" /> {t("common.exportPdf")}
                </Button>
                <DialogClose asChild><Button>{t("common.close")}</Button></DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

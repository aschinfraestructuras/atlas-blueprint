import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Gauge, Plus, FileDown, Trash2, Eye, Pencil, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Link2,
} from "lucide-react";
import { compactionService, type CompactionZoneWithCounts, type CompactionZone, type NuclearPoint, type PlateTest } from "@/lib/services/compactionService";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useWorkItems } from "@/hooks/useWorkItems";
import { usePPIInstances } from "@/hooks/usePPI";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { EmptyState } from "@/components/EmptyState";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function ResultBadge({ result }: { result: string }) {
  if (result === "pass") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Conforme</Badge>;
  if (result === "fail") return <Badge variant="destructive">Não Conforme</Badge>;
  return <Badge variant="outline" className="text-amber-600">Pendente</Badge>;
}

export default function CompactionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const { data: workItems } = useWorkItems();
  const { data: ppis } = usePPIInstances();
  const [zones, setZones] = useState<CompactionZoneWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ zone: CompactionZone; nuclear: NuclearPoint[]; plates: PlateTest[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState("all");

  // Linked concrete lots
  const [concreteLots, setConcreteLots] = useState<Record<string, { lot_code: string; id: string }>>({});

  const [form, setForm] = useState({
    work_item_id: "",
    ppi_instance_id: "",
    zone_description: "",
    pk_start: "",
    pk_end: "",
    layer_no: "",
    material_type: "",
    material_ref: "",
    test_date: new Date().toISOString().slice(0, 10),
    proctor_gamma_max: "",
    proctor_wopt: "",
    compaction_criteria: "95",
    ev2_criteria: "80",
    ev2_ev1_criteria: "2.2",
    technician_name: "",
    notes: "",
  });

  const fetchZones = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await compactionService.listByProject(activeProject.id);
      setZones(data);

      // Check for linked concrete lots via work_item_id
      const wiIds = [...new Set(data.map(z => z.work_item_id).filter(Boolean))] as string[];
      if (wiIds.length > 0) {
        const { data: lots } = await supabase
          .from("concrete_lots")
          .select("id, lot_code, work_item_id")
          .in("work_item_id", wiIds)
          .eq("is_deleted", false);
        const map: Record<string, { lot_code: string; id: string }> = {};
        (lots ?? []).forEach((l: any) => { if (l.work_item_id) map[l.work_item_id] = { lot_code: l.lot_code, id: l.id }; });
        setConcreteLots(map);
      }
    } catch { /* */ } finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  useEffect(() => {
    if (!detailId) { setDetailData(null); return; }
    compactionService.getById(detailId).then(setDetailData);
  }, [detailId]);

  const filtered = zones.filter((z) => {
    if (filterResult !== "all" && z.overall_result !== filterResult) return false;
    return true;
  });

  const totalZones = zones.length;
  const passZones = zones.filter((z) => z.overall_result === "pass").length;
  const failZones = zones.filter((z) => z.overall_result === "fail").length;
  const pendingZones = zones.filter((z) => z.overall_result === "pending").length;

  // AF.3 — KPI: points with GC < 95%
  const [lowGcCount, setLowGcCount] = useState(0);
  useEffect(() => {
    if (!activeProject) return;
    (async () => {
      const { count } = await supabase
        .from("compaction_nuclear_points" as any)
        .select("id", { count: "exact", head: true })
        .eq("project_id", activeProject.id)
        .lt("compaction_degree", 95);
      setLowGcCount(count ?? 0);
    })();
  }, [activeProject, zones]);

  const filteredPpis = form.work_item_id
    ? ppis.filter((p) => (p as any).work_item_id === form.work_item_id)
    : ppis;

  function resetForm() {
    setForm({ work_item_id: "", ppi_instance_id: "", zone_description: "", pk_start: "", pk_end: "", layer_no: "", material_type: "", material_ref: "", test_date: new Date().toISOString().slice(0, 10), proctor_gamma_max: "", proctor_wopt: "", compaction_criteria: "95", ev2_criteria: "80", ev2_ev1_criteria: "2.2", technician_name: "", notes: "" });
    setEditingId(null);
  }

  function openEdit(z: CompactionZoneWithCounts) {
    setForm({
      work_item_id: z.work_item_id ?? "",
      ppi_instance_id: z.ppi_instance_id ?? "",
      zone_description: z.zone_description,
      pk_start: z.pk_start ?? "",
      pk_end: z.pk_end ?? "",
      layer_no: z.layer_no != null ? String(z.layer_no) : "",
      material_type: z.material_type ?? "",
      material_ref: z.material_ref ?? "",
      test_date: z.test_date,
      proctor_gamma_max: z.proctor_gamma_max != null ? String(z.proctor_gamma_max) : "",
      proctor_wopt: z.proctor_wopt != null ? String(z.proctor_wopt) : "",
      compaction_criteria: String(z.compaction_criteria ?? 95),
      ev2_criteria: String(z.ev2_criteria ?? 80),
      ev2_ev1_criteria: String(z.ev2_ev1_criteria ?? 2.2),
      technician_name: z.technician_name ?? "",
      notes: z.notes ?? "",
    });
    setEditingId(z.id);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!activeProject || !form.zone_description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        work_item_id: form.work_item_id || null,
        ppi_instance_id: form.ppi_instance_id || null,
        zone_description: form.zone_description,
        pk_start: form.pk_start || null,
        pk_end: form.pk_end || null,
        layer_no: form.layer_no ? parseInt(form.layer_no) : null,
        material_type: form.material_type || null,
        material_ref: form.material_ref || null,
        test_date: form.test_date,
        proctor_gamma_max: form.proctor_gamma_max ? parseFloat(form.proctor_gamma_max) : null,
        proctor_wopt: form.proctor_wopt ? parseFloat(form.proctor_wopt) : null,
        compaction_criteria: parseFloat(form.compaction_criteria) || 95,
        ev2_criteria: parseFloat(form.ev2_criteria) || 80,
        ev2_ev1_criteria: parseFloat(form.ev2_ev1_criteria) || 2.2,
        technician_name: form.technician_name || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await compactionService.updateZone(editingId, payload);
      } else {
        await compactionService.create({ ...payload, project_id: activeProject.id });
      }

      toast({ title: t("common.save") });
      setDialogOpen(false);
      resetForm();
      fetchZones();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await compactionService.deleteZone(id);
      toast({ title: t("common.delete") });
      fetchZones();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title={t("compaction.title")}
        subtitle={t("compaction.subtitle")}
        backHref="/tests"
        backLabel="Ensaios"
        module="Ensaios"
        icon={Gauge}
        actions={<Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> {t("compaction.newZone")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ModuleKPICard label={t("compaction.kpi.total")} value={totalZones} icon={Gauge} />
        <ModuleKPICard label={t("compaction.kpi.pass")} value={passZones} icon={CheckCircle2} color="hsl(158,45%,32%)" />
        <ModuleKPICard label={t("compaction.kpi.fail")} value={failZones} icon={XCircle} color="hsl(2,60%,44%)" />
        <ModuleKPICard label={t("compaction.kpi.pending")} value={pendingZones} icon={Clock} color="hsl(33,75%,38%)" />
        <ModuleKPICard label="GC < 95%" value={lowGcCount} icon={AlertTriangle} color={lowGcCount > 0 ? "hsl(0,65%,50%)" : undefined} />
      </div>

      <FilterBar>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pass">Conforme</SelectItem>
            <SelectItem value="fail">Não Conforme</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Gauge} titleKey="compaction.empty" subtitleKey="compaction.emptySubtitle" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("concrete.fields.code")}</TableHead>
                  <TableHead>{t("compaction.fields.description")}</TableHead>
                  <TableHead>{t("compaction.workItem", { defaultValue: "Elemento" })}</TableHead>
                  <TableHead>PK</TableHead>
                  <TableHead>{t("compaction.fields.material")}</TableHead>
                  <TableHead>Nuclear</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>{t("concrete.fields.result")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((z) => (
                  <TableRow key={z.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(z.id)}>
                    <TableCell className="font-mono text-xs font-semibold">{z.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {z.zone_description}
                      {z.work_item_id && concreteLots[z.work_item_id] && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] cursor-pointer hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); navigate("/tests/concrete"); }}
                        >
                          <Link2 className="h-2.5 w-2.5 mr-0.5" />
                          {concreteLots[z.work_item_id].lot_code}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{z.work_item_id ? (() => { const wi = workItems.find(x => x.id === z.work_item_id); return wi ? `${wi.sector} — ${wi.disciplina ?? ""}` : "—"; })() : "—"}</TableCell>
                    <TableCell className="text-xs">{z.pk_start ?? "—"}</TableCell>
                    <TableCell className="text-xs">{z.material_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">{z.nuclear_count}</TableCell>
                    <TableCell className="text-xs">{z.plate_count}</TableCell>
                    <TableCell><ResultBadge result={z.overall_result} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu actions={[
                        { key: "view", label: t("common.view"), icon: Eye, onClick: () => setDetailId(z.id) },
                        { key: "edit", label: t("common.edit"), icon: Pencil, onClick: () => openEdit(z) },
                        { key: "pdf", label: t("common.exportPdf"), icon: FileDown, onClick: () => {
                          compactionService.getById(z.id).then((d) => {
                            if (d) compactionService.exportPdf(d.zone, d.nuclear, d.plates, activeProject?.name ?? "PF17A", logoBase64);
                          });
                        }},
                        { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => handleDelete(z.id), variant: "destructive" as const },
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> {editingId ? t("common.edit") : t("compaction.newZone")}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="identification">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="identification">{t("concrete.tabs.identification")}</TabsTrigger>
              <TabsTrigger value="proctor">Proctor / Critérios</TabsTrigger>
            </TabsList>

            <TabsContent value="identification" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Atividade</Label>
                  <Select value={form.work_item_id} onValueChange={(v) => setForm((f) => ({ ...f, work_item_id: v, ppi_instance_id: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {workItems.map((wi) => <SelectItem key={wi.id} value={wi.id}>{wi.sector} — {wi.elemento ?? wi.obra ?? wi.disciplina}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PPI associado</Label>
                  <Select value={form.ppi_instance_id} onValueChange={(v) => setForm((f) => ({ ...f, ppi_instance_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("common.optional")} /></SelectTrigger>
                    <SelectContent>
                      {filteredPpis.map((p) => <SelectItem key={p.id} value={p.id}>{(p as any).code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição da Zona *</Label><Input value={form.zone_description} onChange={(e) => setForm((f) => ({ ...f, zone_description: e.target.value }))} placeholder="Aterro camada 3" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>PK Início</Label><Input value={form.pk_start} onChange={(e) => setForm((f) => ({ ...f, pk_start: e.target.value }))} /></div>
                <div><Label>PK Fim</Label><Input value={form.pk_end} onChange={(e) => setForm((f) => ({ ...f, pk_end: e.target.value }))} /></div>
                <div><Label>Camada</Label><Input type="number" value={form.layer_no} onChange={(e) => setForm((f) => ({ ...f, layer_no: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo Material</Label><Input value={form.material_type} onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))} placeholder="tout-venant" /></div>
                <div><Label>Ref. PAME</Label><Input value={form.material_ref} onChange={(e) => setForm((f) => ({ ...f, material_ref: e.target.value }))} /></div>
              </div>
              <div><Label>{t("common.date")}</Label><Input type="date" value={form.test_date} onChange={(e) => setForm((f) => ({ ...f, test_date: e.target.value }))} /></div>
            </TabsContent>

            <TabsContent value="proctor" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>γd máx (kN/m³)</Label><Input type="number" step="0.1" value={form.proctor_gamma_max} onChange={(e) => setForm((f) => ({ ...f, proctor_gamma_max: e.target.value }))} /></div>
                <div><Label>w óptimo (%)</Label><Input type="number" step="0.1" value={form.proctor_wopt} onChange={(e) => setForm((f) => ({ ...f, proctor_wopt: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Critério GC (%)</Label><Input type="number" step="0.1" value={form.compaction_criteria} onChange={(e) => setForm((f) => ({ ...f, compaction_criteria: e.target.value }))} /></div>
                <div><Label>Ev2 mín. (MPa)</Label><Input type="number" step="0.1" value={form.ev2_criteria} onChange={(e) => setForm((f) => ({ ...f, ev2_criteria: e.target.value }))} /></div>
                <div><Label>Ev2/Ev1 máx.</Label><Input type="number" step="0.1" value={form.ev2_ev1_criteria} onChange={(e) => setForm((f) => ({ ...f, ev2_ev1_criteria: e.target.value }))} /></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.zone_description.trim()}>
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
                  <Gauge className="h-5 w-5" />
                  <span className="font-mono">{detailData.zone.code}</span>
                  <ResultBadge result={compactionService.computeZoneResult(detailData.nuclear, detailData.plates)} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Descrição</span><p>{detailData.zone.zone_description}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">PK</span><p>{detailData.zone.pk_start ?? "—"} a {detailData.zone.pk_end ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Camada</span><p>{detailData.zone.layer_no ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Material</span><p>{detailData.zone.material_type ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">γd máx</span><p>{detailData.zone.proctor_gamma_max ?? "—"} kN/m³</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">w óptimo</span><p>{detailData.zone.proctor_wopt ?? "—"} %</p></div>
                </div>

                {/* Linked concrete lot badge */}
                {detailData.zone.work_item_id && concreteLots[detailData.zone.work_item_id] && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Lote de Betão associado:</span>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => navigate("/tests/concrete")}
                    >
                      {concreteLots[detailData.zone.work_item_id].lot_code}
                    </Badge>
                  </div>
                )}

                {detailData.nuclear.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4">Pontos Nucleares</h4>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Pto</TableHead><TableHead>PK</TableHead><TableHead>γd</TableHead><TableHead>w%</TableHead><TableHead>GC%</TableHead><TableHead>Result.</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {detailData.nuclear.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>{n.point_no}</TableCell>
                            <TableCell className="text-xs">{n.pk_point ?? "—"}</TableCell>
                            <TableCell>{n.gamma_dry_measured}</TableCell>
                            <TableCell>{n.water_content ?? "—"}</TableCell>
                            <TableCell className="font-semibold">{n.compaction_degree ?? "—"}%</TableCell>
                            <TableCell><ResultBadge result={n.pass_fail} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {detailData.plates.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4">Ensaios de Placa</h4>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Pto</TableHead><TableHead>PK</TableHead><TableHead>Ev1</TableHead><TableHead>Ev2</TableHead><TableHead>Ev2/Ev1</TableHead><TableHead>Result.</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {detailData.plates.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.point_no}</TableCell>
                            <TableCell className="text-xs">{p.pk_point ?? "—"}</TableCell>
                            <TableCell>{p.ev1_mpa ?? "—"}</TableCell>
                            <TableCell>{p.ev2_mpa ?? "—"}</TableCell>
                            <TableCell className="font-semibold">{p.ev2_ev1_ratio ?? "—"}</TableCell>
                            <TableCell><ResultBadge result={p.pass_fail} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>

              {/* Attachments */}
              <AttachmentsPanel
                projectId={activeProject?.id ?? ""}
                entityType="compaction_tests"
                entityId={detailData.zone.id}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  if (detailData) compactionService.exportPdf(detailData.zone, detailData.nuclear, detailData.plates, activeProject?.name ?? "PF17A", logoBase64);
                }}>
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

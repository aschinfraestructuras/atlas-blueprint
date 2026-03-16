import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Layers, Plus, FileDown, Trash2, Eye, CheckCircle2, XCircle, Clock,
  FlaskConical, Loader2,
} from "lucide-react";
import { concreteService, computeBatchResult, type ConcreteBatchWithCounts, type ConcreteBatch, type ConcreteSpecimen } from "@/lib/services/concreteService";
import { useProject } from "@/contexts/ProjectContext";
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
import { cn } from "@/lib/utils";

const CONCRETE_CLASSES = ["C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50"];
const CONSISTENCY_CLASSES = ["S1", "S2", "S3", "S4", "S5"];
const CURE_DAYS_OPTIONS = [7, 14, 28, 56];

function ResultBadge({ result }: { result: string }) {
  if (result === "pass") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Conforme</Badge>;
  if (result === "fail") return <Badge variant="destructive">Não Conforme</Badge>;
  return <Badge variant="outline" className="text-amber-600">Pendente</Badge>;
}

export default function ConcretePage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: workItems } = useWorkItems();
  const { data: ppis } = usePPIInstances();
  const [batches, setBatches] = useState<ConcreteBatchWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ batch: ConcreteBatch; specimens: ConcreteSpecimen[] } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWI, setFilterWI] = useState("all");
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    work_item_id: "" as string,
    ppi_instance_id: "" as string,
    element_betonado: "",
    pk_location: "",
    batch_date: new Date().toISOString().slice(0, 10),
    batch_time: "",
    supplier_id: "" as string,
    delivery_note_ref: "",
    truck_plate: "",
    concrete_class: "C25/30",
    cement_type: "",
    max_aggregate: "" as string,
    consistency_class: "S3",
    slump_mm: "" as string,
    slump_pass: null as boolean | null,
    temp_concrete: "" as string,
    temp_ambient: "" as string,
    temp_pass: null as boolean | null,
    air_content: "" as string,
    lab_name: "",
    technician_name: "",
    notes: "",
    specimens: [
      { specimen_no: 1, mold_date: new Date().toISOString().slice(0, 10), cure_days: 28, test_date: "", lab_ref: "", break_load_kn: "", dimension_mm: 150, shape: "cube" },
      { specimen_no: 2, mold_date: new Date().toISOString().slice(0, 10), cure_days: 28, test_date: "", lab_ref: "", break_load_kn: "", dimension_mm: 150, shape: "cube" },
      { specimen_no: 3, mold_date: new Date().toISOString().slice(0, 10), cure_days: 28, test_date: "", lab_ref: "", break_load_kn: "", dimension_mm: 150, shape: "cube" },
    ],
  });

  const fetchBatches = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await concreteService.listByProject(activeProject.id);
      setBatches(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // Detail
  useEffect(() => {
    if (!detailId) { setDetailData(null); return; }
    concreteService.getById(detailId).then(setDetailData);
  }, [detailId]);

  const filtered = batches.filter((b) => {
    if (filterStatus !== "all" && b.overall_result !== filterStatus) return false;
    if (filterWI !== "all" && b.work_item_id !== filterWI) return false;
    return true;
  });

  const totalBatches = batches.length;
  const passBatches = batches.filter((b) => b.overall_result === "pass").length;
  const failBatches = batches.filter((b) => b.overall_result === "fail").length;
  const pendingSpecimens = batches.reduce((acc, b) => acc + (b.specimen_count - b.specimens_tested), 0);

  const filteredPpis = form.work_item_id
    ? ppis.filter((p) => (p as any).work_item_id === form.work_item_id)
    : ppis;

  async function handleCreate() {
    if (!activeProject || !form.element_betonado.trim()) return;
    setSaving(true);
    try {
      const batch = await concreteService.create({
        project_id: activeProject.id,
        work_item_id: form.work_item_id || null,
        ppi_instance_id: form.ppi_instance_id || null,
        element_betonado: form.element_betonado,
        pk_location: form.pk_location || null,
        batch_date: form.batch_date,
        batch_time: form.batch_time || null,
        delivery_note_ref: form.delivery_note_ref || null,
        truck_plate: form.truck_plate || null,
        concrete_class: form.concrete_class,
        cement_type: form.cement_type || null,
        max_aggregate: form.max_aggregate ? parseInt(form.max_aggregate) : null,
        consistency_class: form.consistency_class,
        slump_mm: form.slump_mm ? parseFloat(form.slump_mm) : null,
        slump_pass: form.slump_pass,
        temp_concrete: form.temp_concrete ? parseFloat(form.temp_concrete) : null,
        temp_ambient: form.temp_ambient ? parseFloat(form.temp_ambient) : null,
        temp_pass: form.temp_pass,
        air_content: form.air_content ? parseFloat(form.air_content) : null,
        lab_name: form.lab_name || null,
        technician_name: form.technician_name || null,
        notes: form.notes || null,
      });

      // Add specimens
      for (const spec of form.specimens) {
        await concreteService.addSpecimen(batch.id, activeProject.id, {
          specimen_no: spec.specimen_no,
          mold_date: spec.mold_date,
          cure_days: spec.cure_days,
          test_date: spec.test_date || null,
          lab_ref: spec.lab_ref || null,
          dimension_mm: spec.dimension_mm,
          shape: spec.shape,
          break_load_kn: spec.break_load_kn ? parseFloat(spec.break_load_kn) : null,
          fracture_type: null,
          pass_fail: "pending",
          notes: null,
        });
      }

      toast({ title: t("common.save"), description: batch.code });
      setDialogOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await concreteService.deleteBatch(id);
      toast({ title: t("common.delete") });
      fetchBatches();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  function handleExport(batch: ConcreteBatchWithCounts) {
    concreteService.getById(batch.id).then((d) => {
      if (d) concreteService.exportPdf(d.batch, d.specimens, activeProject?.name ?? "PF17A");
    });
  }

  // Detail dialog
  const detailResult = detailData ? computeBatchResult(detailData.batch.concrete_class, detailData.specimens) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title={t("concrete.title")}
        subtitle={t("concrete.subtitle")}
        icon={Layers}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("concrete.newBatch")}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ModuleKPICard label={t("concrete.kpi.total")} value={totalBatches} icon={Layers} />
        <ModuleKPICard label={t("concrete.kpi.pass")} value={passBatches} icon={CheckCircle2} color="hsl(158,45%,32%)" />
        <ModuleKPICard label={t("concrete.kpi.fail")} value={failBatches} icon={XCircle} color="hsl(2,60%,44%)" />
        <ModuleKPICard label={t("concrete.kpi.pendingSpecimens")} value={pendingSpecimens} icon={Clock} color="hsl(33,75%,38%)" />
      </div>

      {/* Filters */}
      <FilterBar>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.status")}: Todos</SelectItem>
            <SelectItem value="pass">Conforme</SelectItem>
            <SelectItem value="fail">Não Conforme</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterWI} onValueChange={setFilterWI}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Atividade: Todas</SelectItem>
            {workItems.map((wi) => (
              <SelectItem key={wi.id} value={wi.id}>{wi.sector} — {wi.elemento ?? wi.obra ?? wi.disciplina}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Layers} titleKey="concrete.empty" subtitleKey="concrete.emptySubtitle" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("concrete.fields.code")}</TableHead>
                  <TableHead>{t("concrete.fields.element")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("concrete.fields.class")}</TableHead>
                  <TableHead>Slump</TableHead>
                  <TableHead>{t("concrete.fields.specimens")}</TableHead>
                  <TableHead>{t("concrete.fields.result")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(b.id)}>
                    <TableCell className="font-mono text-xs font-semibold">{b.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{b.element_betonado}</TableCell>
                    <TableCell className="text-xs">{new Date(b.batch_date).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{b.concrete_class}</Badge></TableCell>
                    <TableCell>
                      {b.slump_mm != null ? (
                        <span className={cn("text-xs font-medium", b.slump_pass ? "text-emerald-600" : "text-destructive")}>
                          {b.slump_mm} mm
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{b.specimens_tested}/{b.specimen_count}</TableCell>
                    <TableCell><ResultBadge result={b.overall_result} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu actions={[
                        { key: "view", label: t("common.view"), icon: Eye, onClick: () => setDetailId(b.id) },
                        { key: "pdf", label: t("common.exportPdf"), icon: FileDown, onClick: () => handleExport(b) },
                        { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => handleDelete(b.id), variant: "destructive" as const },
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
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" /> {t("concrete.newBatch")}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="identification">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="identification">{t("concrete.tabs.identification")}</TabsTrigger>
              <TabsTrigger value="fresh">{t("concrete.tabs.fresh")}</TabsTrigger>
              <TabsTrigger value="specimens">{t("concrete.tabs.specimens")}</TabsTrigger>
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
              <div>
                <Label>{t("concrete.fields.element")} *</Label>
                <Input value={form.element_betonado} onChange={(e) => setForm((f) => ({ ...f, element_betonado: e.target.value }))} placeholder="Muro M1 — PK 30+500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>PK</Label><Input value={form.pk_location} onChange={(e) => setForm((f) => ({ ...f, pk_location: e.target.value }))} /></div>
                <div><Label>{t("common.date")}</Label><Input type="date" value={form.batch_date} onChange={(e) => setForm((f) => ({ ...f, batch_date: e.target.value }))} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.batch_time} onChange={(e) => setForm((f) => ({ ...f, batch_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Guia Remessa</Label><Input value={form.delivery_note_ref} onChange={(e) => setForm((f) => ({ ...f, delivery_note_ref: e.target.value }))} /></div>
                <div><Label>Matrícula</Label><Input value={form.truck_plate} onChange={(e) => setForm((f) => ({ ...f, truck_plate: e.target.value }))} /></div>
                <div><Label>Central / Lab</Label><Input value={form.lab_name} onChange={(e) => setForm((f) => ({ ...f, lab_name: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="fresh" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("concrete.fields.class")} *</Label>
                  <Select value={form.concrete_class} onValueChange={(v) => setForm((f) => ({ ...f, concrete_class: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONCRETE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("concrete.fields.consistency")}</Label>
                  <Select value={form.consistency_class} onValueChange={(v) => setForm((f) => ({ ...f, consistency_class: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONSISTENCY_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Abaixamento (mm)</Label><Input type="number" value={form.slump_mm} onChange={(e) => setForm((f) => ({ ...f, slump_mm: e.target.value }))} /></div>
                <div><Label>Temp. Betão (°C)</Label><Input type="number" value={form.temp_concrete} onChange={(e) => setForm((f) => ({ ...f, temp_concrete: e.target.value }))} /></div>
                <div><Label>Temp. Ambiente (°C)</Label><Input type="number" value={form.temp_ambient} onChange={(e) => setForm((f) => ({ ...f, temp_ambient: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo de Cimento</Label><Input value={form.cement_type} onChange={(e) => setForm((f) => ({ ...f, cement_type: e.target.value }))} placeholder="CEM II/B-L 32.5N" /></div>
                <div><Label>Máx. Agregado (mm)</Label><Input type="number" value={form.max_aggregate} onChange={(e) => setForm((f) => ({ ...f, max_aggregate: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="specimens" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Moldagem</TableHead>
                    <TableHead>Cura (dias)</TableHead>
                    <TableHead>Data Ensaio</TableHead>
                    <TableHead>Ref. Lab</TableHead>
                    <TableHead>Carga (kN)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.specimens.map((spec, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{spec.specimen_no}</TableCell>
                      <TableCell><Input type="date" value={spec.mold_date} onChange={(e) => {
                        const updated = [...form.specimens];
                        updated[idx] = { ...updated[idx], mold_date: e.target.value };
                        setForm((f) => ({ ...f, specimens: updated }));
                      }} className="h-8" /></TableCell>
                      <TableCell>
                        <Select value={String(spec.cure_days)} onValueChange={(v) => {
                          const updated = [...form.specimens];
                          updated[idx] = { ...updated[idx], cure_days: parseInt(v) };
                          setForm((f) => ({ ...f, specimens: updated }));
                        }}>
                          <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>{CURE_DAYS_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}d</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="date" value={spec.test_date} onChange={(e) => {
                        const updated = [...form.specimens];
                        updated[idx] = { ...updated[idx], test_date: e.target.value };
                        setForm((f) => ({ ...f, specimens: updated }));
                      }} className="h-8" /></TableCell>
                      <TableCell><Input value={spec.lab_ref} onChange={(e) => {
                        const updated = [...form.specimens];
                        updated[idx] = { ...updated[idx], lab_ref: e.target.value };
                        setForm((f) => ({ ...f, specimens: updated }));
                      }} className="h-8" placeholder="Ref." /></TableCell>
                      <TableCell><Input type="number" value={spec.break_load_kn} onChange={(e) => {
                        const updated = [...form.specimens];
                        updated[idx] = { ...updated[idx], break_load_kn: e.target.value };
                        setForm((f) => ({ ...f, specimens: updated }));
                      }} className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !form.element_betonado.trim()}>
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
                  <Layers className="h-5 w-5" />
                  <span className="font-mono">{detailData.batch.code}</span>
                  <ResultBadge result={detailResult?.overall ?? "pending"} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Elemento</span><p>{detailData.batch.element_betonado}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">PK</span><p>{detailData.batch.pk_location ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Classe</span><p>{detailData.batch.concrete_class}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Consistência</span><p>{detailData.batch.consistency_class ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Slump</span><p>{detailData.batch.slump_mm ?? "—"} mm</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Temp. Betão</span><p>{detailData.batch.temp_concrete ?? "—"} °C</p></div>
                </div>

                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-4">{t("concrete.tabs.specimens")}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Moldagem</TableHead>
                      <TableHead>Cura</TableHead>
                      <TableHead>Ensaio</TableHead>
                      <TableHead>Carga (kN)</TableHead>
                      <TableHead>fc (MPa)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.specimens.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.specimen_no}</TableCell>
                        <TableCell className="text-xs">{s.mold_date}</TableCell>
                        <TableCell>{s.cure_days}d</TableCell>
                        <TableCell className="text-xs">{s.test_date ?? "—"}</TableCell>
                        <TableCell>{s.break_load_kn ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{s.strength_mpa ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {detailResult && detailResult.mean != null && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Análise Estatística</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div><span className="text-muted-foreground text-xs">Média fc:</span> <strong>{detailResult.mean} MPa</strong></div>
                      <div><span className="text-muted-foreground text-xs">Mín. fc:</span> <strong>{detailResult.min} MPa</strong></div>
                      <div><span className="text-muted-foreground text-xs">Desvio:</span> <strong>{detailResult.stdDev} MPa</strong></div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  if (detailData) concreteService.exportPdf(detailData.batch, detailData.specimens, activeProject?.name ?? "PF17A");
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

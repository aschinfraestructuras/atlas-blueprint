import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Layers, Plus, FileDown, Trash2, Eye, CheckCircle2, XCircle, Clock,
  FlaskConical, Loader2, X, Info, Package,
} from "lucide-react";
import { concreteService, computeBatchResult, type ConcreteBatchWithCounts, type ConcreteBatch, type ConcreteSpecimen } from "@/lib/services/concreteService";
import { concreteLotService, type ConcreteLotConformity } from "@/lib/services/concreteLotService";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useWorkItems } from "@/hooks/useWorkItems";
import { usePPIInstances } from "@/hooks/usePPI";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { EmptyState } from "@/components/EmptyState";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CONCRETE_CLASSES = ["C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50"];
const CONSISTENCY_CLASSES = ["S1", "S2", "S3", "S4", "S5"];
const CURE_DAYS_OPTIONS = [7, 14, 28, 56, 90];
const EXC_CLASSES = ["EXC1", "EXC2", "EXC3"];
const EXPOSURE_CLASSES = ["XC1", "XC2", "XC3", "XC4", "XS1", "XS2", "XD1"];
const FRACTURE_TYPES = ["cônica", "cónica-cilíndrica", "frágil", "irregular", "—"];

function excFrequency(exc: string): string {
  if (exc === "EXC1") return "1 amostra por 150 m³";
  if (exc === "EXC3") return "1 amostra por 50 m³";
  return "1 amostra por 75 m³";
}

function makeDefaultSpecimen(no: number) {
  return {
    specimen_no: no,
    mold_date: new Date().toISOString().slice(0, 10),
    cure_days: 28,
    test_date: "",
    lab_ref: "",
    break_load_kn: "",
    dimension_mm: 150,
    shape: "cube",
    fracture_type: "",
  };
}

function ResultBadge({ result }: { result: string }) {
  if (result === "pass") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Conforme</Badge>;
  if (result === "fail") return <Badge variant="destructive">Não Conforme</Badge>;
  return <Badge variant="outline" className="text-amber-600">Pendente</Badge>;
}

function LotResultBadge({ result, criterion }: { result: string; criterion: string }) {
  const badge = result === "pass"
    ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Conforme (NA.M)</Badge>
    : result === "fail"
    ? <Badge variant="destructive">Não Conforme</Badge>
    : <Badge variant="outline" className="text-amber-600">Pendente</Badge>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{criterion}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Lots Tab ─────────────────────────────────────────────────────────────────

function LotsTab({
  projectId,
  batches,
  onRefreshBatches,
}: {
  projectId: string;
  batches: ConcreteBatchWithCounts[];
  onRefreshBatches: () => void;
}) {
  const { t } = useTranslation();
  const { data: workItems } = useWorkItems();
  const [lots, setLots] = useState<ConcreteLotConformity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unassigned, setUnassigned] = useState<{ id: string; code: string; element_betonado: string; concrete_class: string; batch_date: string }[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());

  const [lotForm, setLotForm] = useState({
    element_desc: "",
    concrete_class: "C25/30",
    exc_class: "EXC2",
    volume_total_m3: "",
    date_start: "",
    date_end: "",
    work_item_id: "",
    notes: "",
  });

  const fetchLots = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await concreteLotService.listConformity(projectId);
      setLots(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchLots(); }, [fetchLots]);

  const openCreateDialog = async () => {
    try {
      const ub = await concreteLotService.getUnassignedBatches(projectId);
      setUnassigned(ub);
    } catch { /* ignore */ }
    setSelectedBatches(new Set());
    setLotForm({
      element_desc: "",
      concrete_class: "C25/30",
      exc_class: "EXC2",
      volume_total_m3: "",
      date_start: "",
      date_end: "",
      work_item_id: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  async function handleCreateLot() {
    if (!projectId || !lotForm.element_desc.trim()) return;
    setSaving(true);
    try {
      const lot = await concreteLotService.create({
        project_id: projectId,
        element_desc: lotForm.element_desc,
        concrete_class: lotForm.concrete_class,
        exc_class: lotForm.exc_class,
        volume_total_m3: lotForm.volume_total_m3 ? parseFloat(lotForm.volume_total_m3) : null,
        date_start: lotForm.date_start || null,
        date_end: lotForm.date_end || null,
        work_item_id: lotForm.work_item_id || null,
        notes: lotForm.notes || null,
      });

      // Assign selected batches
      for (const batchId of selectedBatches) {
        await concreteLotService.assignBatchToLot(batchId, lot.id);
      }

      toast({ title: t("common.save"), description: lot.lot_code });
      setDialogOpen(false);
      fetchLots();
      onRefreshBatches();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  const [deleteLotTarget, setDeleteLotTarget] = useState<string | null>(null);
  async function confirmDeleteLot() {
    if (!deleteLotTarget) return;
    try {
      await concreteLotService.deleteLot(deleteLotTarget);
      toast({ title: t("common.deleted") });
      fetchLots();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDeleteLotTarget(null);
    }
  }

  const conformes = lots.filter((l) => l.na_m_result === "pass").length;
  const total = lots.length;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ModuleKPICard label={t("concrete.kpi.totalLotes")} value={total} icon={Package} />
        <ModuleKPICard label={t("concrete.kpi.conformesNAM")} value={conformes} icon={CheckCircle2} color="hsl(158,45%,32%)" />
        <ModuleKPICard label={t("concrete.kpi.lotesAvaliados")} value={`${conformes}/${total}`} icon={FlaskConical} />
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Lote
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : lots.length === 0 ? (
            <EmptyState icon={Package} titleKey="concrete.empty" subtitleKey="concrete.emptySubtitle" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("concrete.lots.columns.code")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.element")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.class")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.exc")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.volume")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.samples")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.fcm")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.fcMin")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.criterion")}</TableHead>
                  <TableHead>{t("concrete.lots.columns.result")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.lot_id}>
                    <TableCell className="font-mono text-xs font-semibold">{lot.lot_code}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{lot.element_desc}</TableCell>
                    <TableCell><Badge variant="outline">{lot.concrete_class}</Badge></TableCell>
                    <TableCell className="text-xs">{lot.exc_class}</TableCell>
                    <TableCell className="text-xs">{lot.volume_total_m3 ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {lot.n_tested_28d}
                      {lot.n_required_min != null && (
                        <span className="text-muted-foreground"> / {lot.n_required_min} req.</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">{lot.mean_fc_28d ?? "—"}</TableCell>
                    <TableCell className="text-xs">{lot.min_fc_28d ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{lot.criterion_applied}</TableCell>
                    <TableCell>
                      <LotResultBadge result={lot.na_m_result} criterion={lot.criterion_applied} />
                    </TableCell>
                    <TableCell>
                      <RowActionMenu actions={[
                        { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => setDeleteLotTarget(lot.lot_id), variant: "destructive" as const },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Lot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Novo Lote de Betão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Elemento estrutural *</Label>
              <Input
                value={lotForm.element_desc}
                onChange={(e) => setLotForm((f) => ({ ...f, element_desc: e.target.value }))}
                placeholder="PSR Cachofarra — tabuleiro pré-esforço"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Classe de Betão</Label>
                <Select value={lotForm.concrete_class} onValueChange={(v) => setLotForm((f) => ({ ...f, concrete_class: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONCRETE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Classe de Execução</Label>
                <Select value={lotForm.exc_class} onValueChange={(v) => setLotForm((f) => ({ ...f, exc_class: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXC_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-0.5">{excFrequency(lotForm.exc_class)}</p>
              </div>
              <div>
                <Label>Volume total (m³)</Label>
                <Input type="number" value={lotForm.volume_total_m3} onChange={(e) => setLotForm((f) => ({ ...f, volume_total_m3: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data início</Label><Input type="date" value={lotForm.date_start} onChange={(e) => setLotForm((f) => ({ ...f, date_start: e.target.value }))} /></div>
              <div><Label>Data fim</Label><Input type="date" value={lotForm.date_end} onChange={(e) => setLotForm((f) => ({ ...f, date_end: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Atividade</Label>
              <Select value={lotForm.work_item_id || "__none__"} onValueChange={(v) => setLotForm((f) => ({ ...f, work_item_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {workItems.map((wi) => <SelectItem key={wi.id} value={wi.id}>{wi.sector} — {wi.elemento ?? wi.obra ?? wi.disciplina}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={lotForm.notes} onChange={(e) => setLotForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Batch selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Amassadas a incluir ({selectedBatches.size} selecionadas)
              </Label>
              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Todas as amassadas já estão atribuídas a lotes.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Código</TableHead>
                        <TableHead>Elemento</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassigned.map((b) => (
                        <TableRow key={b.id} className="cursor-pointer" onClick={() => {
                          setSelectedBatches((prev) => {
                            const next = new Set(prev);
                            if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                            return next;
                          });
                        }}>
                          <TableCell>
                            <Checkbox checked={selectedBatches.has(b.id)} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{b.code}</TableCell>
                          <TableCell className="text-xs truncate max-w-[150px]">{b.element_betonado}</TableCell>
                          <TableCell className="text-xs">{b.concrete_class}</TableCell>
                          <TableCell className="text-xs">{new Date(b.batch_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleCreateLot} disabled={saving || !lotForm.element_desc.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Conformity by Class Panel ────────────────────────────────────────────────

function ConformityByClassPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("vw_concrete_conformity_ce" as any)
          .select("*")
          .eq("project_id", projectId);
        setRows(data ?? []);
      } catch { /* view may not exist */ }
      setLoading(false);
    })();
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <EmptyState icon={Layers} titleKey="concrete.empty" subtitleKey="concrete.emptySubtitle" />;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("concrete.class", { defaultValue: "Classe" })}</TableHead>
              <TableHead>{t("concrete.nAmassadas")}</TableHead>
              <TableHead>{t("concrete.nProvetes")}</TableHead>
              <TableHead>{t("concrete.fcmMedio")}</TableHead>
              <TableHead>{t("concrete.criterio")}</TableHead>
              <TableHead>{t("concrete.resultado")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-semibold">{r.concrete_class}</TableCell>
                <TableCell>{r.n_batches ?? "—"}</TableCell>
                <TableCell>{r.n_specimens_28d ?? "—"}</TableCell>
                <TableCell className="font-mono">{r.mean_fc_28d != null ? Number(r.mean_fc_28d).toFixed(1) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{r.criterion_applied ?? "—"}</TableCell>
                <TableCell>
                  {r.result === "pass" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                      {t("common.compliant", { defaultValue: "Conforme" })}
                    </Badge>
                  ) : r.result === "fail" ? (
                    <Badge variant="destructive">{t("common.nonCompliant", { defaultValue: "Não Conforme" })}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">{t("common.pendingStatus", { defaultValue: "Pendente" })}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConcretePage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: workItems } = useWorkItems();
  const { data: ppis } = usePPIInstances();
  const { logoBase64 } = useProjectLogo();
  const [batches, setBatches] = useState<ConcreteBatchWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ batch: ConcreteBatch; specimens: ConcreteSpecimen[] } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWI, setFilterWI] = useState("all");
  const [saving, setSaving] = useState(false);
  const [pageTab, setPageTab] = useState("batches");

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
    exc_class: "EXC2",
    fab_ref: "",
    exposure_class: "XC2",
    structural_element_mqt_code: "",
    specimens: [makeDefaultSpecimen(1), makeDefaultSpecimen(2), makeDefaultSpecimen(3)],
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

  // Specimen management
  function addSpecimen() {
    setForm((f) => ({
      ...f,
      specimens: [...f.specimens, makeDefaultSpecimen(f.specimens.length + 1)],
    }));
  }

  function removeSpecimen(idx: number) {
    if (form.specimens.length <= 1) return;
    setForm((f) => ({
      ...f,
      specimens: f.specimens.filter((_, i) => i !== idx).map((s, i) => ({ ...s, specimen_no: i + 1 })),
    }));
  }

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
        exc_class: form.exc_class || null,
        fab_ref: form.fab_ref || null,
        exposure_class: form.exposure_class || null,
        structural_element_mqt_code: form.structural_element_mqt_code || null,
      });

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
          fracture_type: spec.fracture_type || null,
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

  const [deleteBatchTarget, setDeleteBatchTarget] = useState<string | null>(null);
  async function confirmDeleteBatch() {
    if (!deleteBatchTarget) return;
    try {
      await concreteService.deleteBatch(deleteBatchTarget);
      toast({ title: t("common.deleted") });
      fetchBatches();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDeleteBatchTarget(null);
    }
  }

  function handleExport(batch: ConcreteBatchWithCounts) {
    concreteService.getById(batch.id).then((d) => {
      if (d) concreteService.exportPdf(d.batch, d.specimens, activeProject?.name ?? "PF17A", logoBase64);
    });
  }

  // ─── Detail: inline editing ────────────────────────────────────────────────
  async function handleSpecimenBlur(specimen: ConcreteSpecimen, field: string, value: string) {
    try {
      const update: Record<string, any> = {};
      if (field === "test_date") update.test_date = value || null;
      else if (field === "break_load_kn") update.break_load_kn = value ? parseFloat(value) : null;
      else if (field === "fracture_type") update.fracture_type = value || null;
      else return;
      await concreteService.updateSpecimen(specimen.id, update);
      if (detailId) concreteService.getById(detailId).then(setDetailData);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  async function handleAddDetailSpecimen() {
    if (!detailData || !activeProject) return;
    const nextNo = detailData.specimens.length + 1;
    try {
      await concreteService.addSpecimen(detailData.batch.id, activeProject.id, {
        specimen_no: nextNo,
        mold_date: new Date().toISOString().slice(0, 10),
        cure_days: 28,
        test_date: null,
        lab_ref: null,
        dimension_mm: 150,
        shape: "cube",
        break_load_kn: null,
        fracture_type: null,
        pass_fail: "pending",
        notes: null,
      });
      concreteService.getById(detailData.batch.id).then(setDetailData);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  async function handleDeleteDetailSpecimen(specId: string) {
    if (!detailData || detailData.specimens.length <= 1) return;
    try {
      await concreteService.deleteSpecimen(specId);
      concreteService.getById(detailData.batch.id).then(setDetailData);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  const detailResult = detailData ? computeBatchResult(detailData.batch.concrete_class, detailData.specimens) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title={t("concrete.title")}
        subtitle={t("concrete.subtitle")}
        icon={Layers}
        backHref="/tests"
        backLabel="Ensaios"
        module="Ensaios"
        actions={
          pageTab === "batches" ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("concrete.newBatch")}
            </Button>
          ) : undefined
        }
      />

      {/* Top-level page tabs: Amassadas | Lotes */}
      <Tabs value={pageTab} onValueChange={setPageTab}>
        <TabsList>
          <TabsTrigger value="batches" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> {t("concrete.tabs.batches", { defaultValue: "Amassadas" })}
          </TabsTrigger>
          <TabsTrigger value="lots" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> {t("concrete.tabs.lots", { defaultValue: "Lotes (NA.M)" })}
          </TabsTrigger>
          <TabsTrigger value="conformity" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("concrete.conformityPanel", { defaultValue: "Conformidade" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-5 space-y-4">
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
                            { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => setDeleteBatchTarget(b.id), variant: "destructive" as const },
                          ]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lots" className="mt-5">
          {activeProject && (
            <LotsTab
              projectId={activeProject.id}
              batches={batches}
              onRefreshBatches={fetchBatches}
            />
          )}
        </TabsContent>

        <TabsContent value="conformity" className="mt-5">
          {activeProject && <ConformityByClassPanel projectId={activeProject.id} />}
        </TabsContent>
      </Tabs>

      {/* ────── Create Batch Dialog ────── */}
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
                  <Label>{t("common.activity")}</Label>
                  <Select value={form.work_item_id} onValueChange={(v) => setForm((f) => ({ ...f, work_item_id: v, ppi_instance_id: "" }))}>
                    <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {workItems.map((wi) => <SelectItem key={wi.id} value={wi.id}>{wi.sector} — {wi.elemento ?? wi.obra ?? wi.disciplina}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("concrete.form.ppiAssociated")}</Label>
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
                <div><Label>{t("common.pk")}</Label><Input value={form.pk_location} onChange={(e) => setForm((f) => ({ ...f, pk_location: e.target.value }))} /></div>
                <div><Label>{t("common.date")}</Label><Input type="date" value={form.batch_date} onChange={(e) => setForm((f) => ({ ...f, batch_date: e.target.value }))} /></div>
                <div><Label>{t("concrete.form.hour")}</Label><Input type="time" value={form.batch_time} onChange={(e) => setForm((f) => ({ ...f, batch_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{t("concrete.form.deliveryNote")}</Label><Input value={form.delivery_note_ref} onChange={(e) => setForm((f) => ({ ...f, delivery_note_ref: e.target.value }))} /></div>
                <div><Label>{t("concrete.form.truckPlate")}</Label><Input value={form.truck_plate} onChange={(e) => setForm((f) => ({ ...f, truck_plate: e.target.value }))} /></div>
                <div><Label>{t("concrete.form.labCentral")}</Label><Input value={form.lab_name} onChange={(e) => setForm((f) => ({ ...f, lab_name: e.target.value }))} /></div>
              </div>
              {/* EXC, FAB, exposure, MQT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Label>{t("concrete.form.excClass")}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          Classe de Execução NP EN 13670 AN-PT — determina frequência de amostragem: EXC1=1/150m³ | EXC2=1/75m³ | EXC3=1/50m³
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={form.exc_class} onValueChange={(v) => setForm((f) => ({ ...f, exc_class: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXC_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-0.5">{excFrequency(form.exc_class)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Label>{t("concrete.form.fabRef")}</Label>
                    {(form.exc_class === "EXC2" || form.exc_class === "EXC3") && (
                      <span className="text-xs text-destructive font-medium">(obrigatório EXC2/EXC3)</span>
                    )}
                  </div>
                  <Input value={form.fab_ref} onChange={(e) => setForm((f) => ({ ...f, fab_ref: e.target.value }))} placeholder="Folha de Aprovação de Betonagem" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("concrete.form.exposureClass")}</Label>
                  <Select value={form.exposure_class} onValueChange={(v) => setForm((f) => ({ ...f, exposure_class: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPOSURE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("concrete.form.mqtCode")}</Label>
                  <Input value={form.structural_element_mqt_code} onChange={(e) => setForm((f) => ({ ...f, structural_element_mqt_code: e.target.value }))} placeholder="F-02.05.03.03.07" />
                </div>
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

            <TabsContent value="specimens" className="mt-4 space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Moldagem</TableHead>
                    <TableHead>Cura (dias)</TableHead>
                    <TableHead>{t("concrete.specimens.testDate")}</TableHead>
                    <TableHead>Ref. Lab</TableHead>
                    <TableHead>Carga (kN)</TableHead>
                    <TableHead>Rotura</TableHead>
                    <TableHead className="w-10" />
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
                      <TableCell>
                        <Select value={spec.fracture_type || "—"} onValueChange={(v) => {
                          const updated = [...form.specimens];
                          updated[idx] = { ...updated[idx], fracture_type: v === "—" ? "" : v };
                          setForm((f) => ({ ...f, specimens: updated }));
                        }}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{FRACTURE_TYPES.map((ft) => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSpecimen(idx)} disabled={form.specimens.length <= 1}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addSpecimen} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar Provete
              </Button>
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

      {/* ────── Detail Dialog ────── */}
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
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Classe Execução</span><p>{detailData.batch.exc_class ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Ref. FAB</span><p>{detailData.batch.fab_ref ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Exposição</span><p>{detailData.batch.exposure_class ?? "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs font-semibold uppercase">Código MQT</span><p>{detailData.batch.structural_element_mqt_code ?? "—"}</p></div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("concrete.tabs.specimens")}</h4>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddDetailSpecimen}>
                    <Plus className="h-3.5 w-3.5" /> Provete
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Moldagem</TableHead>
                      <TableHead>Cura</TableHead>
                      <TableHead>Ensaio</TableHead>
                      <TableHead>Carga (kN)</TableHead>
                      <TableHead>fc (MPa)</TableHead>
                      <TableHead>Rotura</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.specimens.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.specimen_no}</TableCell>
                        <TableCell className="text-xs">{s.mold_date}</TableCell>
                        <TableCell>{s.cure_days}d</TableCell>
                        <TableCell>
                          <Input type="date" defaultValue={s.test_date ?? ""} onBlur={(e) => handleSpecimenBlur(s, "test_date", e.target.value)} className="h-7 w-32 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" defaultValue={s.break_load_kn ?? ""} onBlur={(e) => handleSpecimenBlur(s, "break_load_kn", e.target.value)} className="h-7 w-20 text-xs" />
                        </TableCell>
                        <TableCell className="font-semibold">{s.strength_mpa ?? "—"}</TableCell>
                        <TableCell>
                          <Select defaultValue={s.fracture_type ?? "—"} onValueChange={(v) => handleSpecimenBlur(s, "fracture_type", v === "—" ? "" : v)}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{FRACTURE_TYPES.map((ft) => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDetailSpecimen(s.id)} disabled={detailData.specimens.length <= 1}>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {detailResult && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Análise Estatística</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div><span className="text-muted-foreground text-xs">Média fc:</span> <strong>{detailResult.mean ?? "—"} MPa</strong></div>
                      <div><span className="text-muted-foreground text-xs">Mín. fc:</span> <strong>{detailResult.min ?? "—"} MPa</strong></div>
                      <div><span className="text-muted-foreground text-xs">Desvio:</span> <strong>{detailResult.stdDev ?? "—"} MPa</strong></div>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">{detailResult.criterionApplied}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <AttachmentsPanel
                projectId={activeProject?.id ?? ""}
                entityType="concrete_batches"
                entityId={detailData.batch.id}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  if (detailData) concreteService.exportPdf(detailData.batch, detailData.specimens, activeProject?.name ?? "PF17A", logoBase64);
                }}>
                  <FileDown className="h-4 w-4 mr-1.5" /> {t("common.exportPdf")}
                </Button>
                <DialogClose asChild><Button>{t("common.close")}</Button></DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteBatchTarget} onOpenChange={(v) => !v && setDeleteBatchTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteBatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.confirm")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useArchivedProject } from "@/hooks/useArchivedProject";
import {
  fieldRecordService,
  type FieldRecord,
  type FieldRecordInput,
  type FieldRecordMaterial,
  type FieldRecordCheck,
  POINT_TYPES,
  WEATHER_OPTIONS,
  GR_RESULTS,
} from "@/lib/services/fieldRecordService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { EmptyState } from "@/components/EmptyState";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardCheck, Plus, Search, FileDown, Eye, Trash2, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle, CloudSun, Sun, Cloud,
  CloudRain, Wind, Thermometer,
} from "lucide-react";
import { FieldRecordDetailDialog } from "@/components/field-records/FieldRecordDetailDialog";

// ── Cores por resultado ────────────────────────────────────────────────────────
const RESULT_CFG: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
  conforme:       { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",  icon: CheckCircle2,   label: "Conforme" },
  conforme_obs:   { cls: "bg-amber-500/10  text-amber-700  dark:text-amber-400  border-amber-500/20",   icon: AlertTriangle,  label: "Conf. c/ Obs." },
  nao_conforme:   { cls: "bg-destructive/10 text-destructive border-destructive/20",                        icon: XCircle,        label: "Não Conforme" },
  pendente:       { cls: "bg-muted text-muted-foreground border-border",                                    icon: Clock,          label: "Pendente" },
};

const WEATHER_CFG: Record<string, { icon: string; label: string }> = {
  bom:          { icon: "☀️", label: "Bom tempo" },
  nublado:      { icon: "☁️", label: "Nublado" },
  chuva:        { icon: "🌧️", label: "Chuva" },
  chuva_forte:  { icon: "⛈️", label: "Chuva forte" },
  vento:        { icon: "💨", label: "Vento forte" },
};

const TYPE_CFG: Record<string, { cls: string }> = {
  rp: { cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  wp: { cls: "bg-red-500/10  text-red-700  dark:text-red-400"  },
};

// ── Formulário inline (Dialog) ─────────────────────────────────────────────────
interface FormState {
  point_type: "rp" | "wp";
  activity: string;
  disciplina: string;
  location_pk: string;
  pk_fim: string;
  elemento: string;
  inspection_date: string;
  weather: string;
  tq_name: string;
  specialist_name: string;
  ppi_instance_id: string;
  result: string;
  observations: string;
  next_inspection: string;
  has_photos: boolean;
  checks: { description: string; criteria: string; method: string; result: string; measured_value: string }[];
  materials: { material_name: string; fav_pame_ref: string; lot_ref: string; quantity: string }[];
}

const EMPTY_FORM: FormState = {
  point_type: "rp", activity: "", disciplina: "", location_pk: "", pk_fim: "",
  elemento: "", inspection_date: new Date().toISOString().split("T")[0],
  weather: "bom", tq_name: "", specialist_name: "", ppi_instance_id: "",
  result: "pendente", observations: "", next_inspection: "", has_photos: false,
  checks: [], materials: [],
};

interface FormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  projectId: string;
  userId: string;
}

function FieldRecordFormDialog({ open, onOpenChange, onSuccess, projectId, userId }: FormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [ppiOptions, setPpiOptions] = useState<{ id: string; code: string }[]>([]);

  useEffect(() => {
    if (!open) { setForm(EMPTY_FORM); return; }
    (supabase as any).from("ppi_instances").select("id, code")
      .eq("project_id", projectId).eq("is_deleted", false)
      .order("code").then(({ data }: any) => setPpiOptions(data ?? []));
  }, [open, projectId]);

  const setF = (k: keyof FormState, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addCheck = () => setF("checks", [...form.checks, { description: "", criteria: "", method: "", result: "ok", measured_value: "" }]);
  const setCheck = (i: number, k: string, v: string) => setF("checks", form.checks.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removeCheck = (i: number) => setF("checks", form.checks.filter((_, idx) => idx !== i));

  const addMaterial = () => setF("materials", [...form.materials, { material_name: "", fav_pame_ref: "", lot_ref: "", quantity: "" }]);
  const setMaterial = (i: number, k: string, v: string) => setF("materials", form.materials.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const removeMaterial = (i: number) => setF("materials", form.materials.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.activity.trim()) { toast({ title: t("fieldRecords.form.activityRequired", { defaultValue: "Actividade obrigatória" }), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const input: FieldRecordInput = {
        project_id: projectId,
        created_by: userId,
        point_type: form.point_type,
        activity: form.activity.trim(),
        location_pk: form.location_pk.trim() || null,
        inspection_date: form.inspection_date,
        weather: form.weather as any,
        specialist_name: form.specialist_name.trim() || null,
        result: form.result as any,
        has_photos: form.has_photos,
        observations: form.observations.trim() || null,
        ppi_instance_id: form.ppi_instance_id || null,
        checks: form.checks.filter(c => c.description.trim()).map((c, i) => ({
          item_no: i + 1, description: c.description.trim(),
          criteria: c.criteria.trim() || null, method: c.method.trim() || null,
          result: (c.result || "ok") as any, measured_value: c.measured_value.trim() || null,
        })),
        materials: form.materials.filter(m => m.material_name.trim()).map(m => ({
          material_name: m.material_name.trim(),
          fav_pame_ref: m.fav_pame_ref.trim() || null,
          lot_ref: m.lot_ref.trim() || null,
          quantity: m.quantity.trim() || null,
        })),
      };
      await fieldRecordService.create(input);
      toast({ title: t("fieldRecords.toast.created", { defaultValue: "Grelha de Registo criada" }) });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: e.message ?? t("common.saveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {t("fieldRecords.form.title", { defaultValue: "Nova Grelha de Registo de Campo" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Secção 1 — Identificação */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              1 — {t("fieldRecords.form.section1", { defaultValue: "Identificação" })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Tipo */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.pointType", { defaultValue: "Tipo de Ponto" })}</label>
                <Select value={form.point_type} onValueChange={v => setF("point_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rp">RP — Review Point</SelectItem>
                    <SelectItem value="wp">WP — Witness Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Data */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("common.date")}</label>
                <Input type="date" className="mt-1" value={form.inspection_date} onChange={e => setF("inspection_date", e.target.value)} />
              </div>
              {/* Actividade */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.activity", { defaultValue: "Actividade / Trabalho Inspeccionado" })} *</label>
                <Input className="mt-1" value={form.activity} onChange={e => setF("activity", e.target.value)}
                  placeholder={t("fieldRecords.form.activityPlaceholder", { defaultValue: "Ex: Compactação de aterro — camada 3" })} />
              </div>
              {/* PPI */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.ppiRef", { defaultValue: "PPI de Referência (opcional)" })}</label>
                <Select value={form.ppi_instance_id || "__none__"} onValueChange={v => setF("ppi_instance_id", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("common.none", { defaultValue: "Nenhuma" })} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("common.none", { defaultValue: "Nenhuma" })}</SelectItem>
                    {ppiOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Disciplina */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.disciplina", { defaultValue: "Disciplina" })}</label>
                <Input className="mt-1" value={form.disciplina} onChange={e => setF("disciplina", e.target.value)}
                  placeholder="Ex: via_ferrea, betao, catenaria…" />
              </div>
              {/* PK */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.pk", { defaultValue: "PK Início" })}</label>
                <Input className="mt-1" value={form.location_pk} onChange={e => setF("location_pk", e.target.value)} placeholder="31+670" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.pkFim", { defaultValue: "PK Fim" })}</label>
                <Input className="mt-1" value={form.pk_fim} onChange={e => setF("pk_fim", e.target.value)} placeholder="32+000" />
              </div>
              {/* Elemento */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.elemento", { defaultValue: "Elemento" })}</label>
                <Input className="mt-1" value={form.elemento} onChange={e => setF("elemento", e.target.value)} placeholder="Ex: Muro M31.3" />
              </div>
              {/* Meteorologia */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.weather", { defaultValue: "Condições Meteorológicas" })}</label>
                <Select value={form.weather} onValueChange={v => setF("weather", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WEATHER_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* TQ */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.tq", { defaultValue: "TQ / Responsável de Registo" })}</label>
                <Input className="mt-1" value={form.tq_name} onChange={e => setF("tq_name", e.target.value)} placeholder="Nome do TQ" />
              </div>
              {/* Responsável Especialidade */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.specialist", { defaultValue: "Resp. Especialidade / Encarregado" })}</label>
                <Input className="mt-1" value={form.specialist_name} onChange={e => setF("specialist_name", e.target.value)} placeholder="Nome" />
              </div>
            </div>
          </div>

          {/* Secção 2 — Materiais */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                2 — {t("fieldRecords.form.section2", { defaultValue: "Materiais e Equipamentos" })}
              </p>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addMaterial}>
                <Plus className="h-3 w-3" /> {t("common.add")}
              </Button>
            </div>
            {form.materials.length > 0 && (
              <div className="space-y-2">
                {form.materials.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_100px_80px_28px] gap-1.5 items-center">
                    <Input placeholder={t("fieldRecords.form.materialName", { defaultValue: "Material / Equipamento" })} value={m.material_name} onChange={e => setMaterial(i, "material_name", e.target.value)} className="text-xs h-8" />
                    <Input placeholder="FAV/PAME" value={m.fav_pame_ref} onChange={e => setMaterial(i, "fav_pame_ref", e.target.value)} className="text-xs h-8" />
                    <Input placeholder={t("fieldRecords.form.lot", { defaultValue: "Lote" })} value={m.lot_ref} onChange={e => setMaterial(i, "lot_ref", e.target.value)} className="text-xs h-8" />
                    <Input placeholder={t("fieldRecords.form.qty", { defaultValue: "Qtd." })} value={m.quantity} onChange={e => setMaterial(i, "quantity", e.target.value)} className="text-xs h-8" />
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMaterial(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secção 3 — Verificações */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                3 — {t("fieldRecords.form.section3", { defaultValue: "Verificações Realizadas" })}
              </p>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addCheck}>
                <Plus className="h-3 w-3" /> {t("common.add")}
              </Button>
            </div>
            {form.checks.length > 0 && (
              <div className="space-y-2">
                {form.checks.map((c, i) => (
                  <div key={i} className="grid grid-cols-[24px_1fr_120px_100px_80px_80px_28px] gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-muted-foreground text-center">{i + 1}</span>
                    <Input placeholder={t("fieldRecords.form.checkItem", { defaultValue: "Item verificado" })} value={c.description} onChange={e => setCheck(i, "description", e.target.value)} className="text-xs h-8" />
                    <Input placeholder={t("fieldRecords.form.criteria", { defaultValue: "Critério" })} value={c.criteria} onChange={e => setCheck(i, "criteria", e.target.value)} className="text-xs h-8" />
                    <Input placeholder={t("fieldRecords.form.method", { defaultValue: "Método/EME" })} value={c.method} onChange={e => setCheck(i, "method", e.target.value)} className="text-xs h-8" />
                    <Input placeholder={t("fieldRecords.form.measured", { defaultValue: "Valor" })} value={c.measured_value} onChange={e => setCheck(i, "measured_value", e.target.value)} className="text-xs h-8" />
                    <Select value={c.result} onValueChange={v => setCheck(i, "result", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">✓ OK</SelectItem>
                        <SelectItem value="nc">✗ NC</SelectItem>
                        <SelectItem value="na">— N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCheck(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secção 4/5 — Observações e Resultado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                5 — {t("fieldRecords.form.section5", { defaultValue: "Observações e Ocorrências" })}
              </p>
              <Textarea rows={3} value={form.observations} onChange={e => setF("observations", e.target.value)}
                placeholder={t("fieldRecords.form.observationsPlaceholder", { defaultValue: "Observações gerais, RNCs abertas, referências fotográficas…" })} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                6 — {t("fieldRecords.form.section6", { defaultValue: "Resultado Global" })}
              </p>
              <Select value={form.result} onValueChange={v => setF("result", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conforme">✅ Conforme</SelectItem>
                  <SelectItem value="conforme_obs">⚠️ Conforme c/ Observações</SelectItem>
                  <SelectItem value="nao_conforme">❌ Não Conforme</SelectItem>
                  <SelectItem value="pendente">⏳ Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("fieldRecords.form.nextInspection", { defaultValue: "Próxima Verificação Prevista" })}</label>
              <Input className="mt-1" value={form.next_inspection} onChange={e => setF("next_inspection", e.target.value)}
                placeholder="Ex: PPI-PF17A-03 · PK 32+000" />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" id="has_photos" checked={form.has_photos} onChange={e => setF("has_photos", e.target.checked)}
                className="h-4 w-4 rounded border-border" />
              <label htmlFor="has_photos" className="text-sm cursor-pointer">
                {t("fieldRecords.form.hasPhotos", { defaultValue: "Registo fotográfico efectuado" })}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ────────────────────────────────────────────────────────────
export default function FieldRecordsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { canDelete } = usePermissions();
  const isArchived = useArchivedProject();

  const [records, setRecords] = useState<FieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await fieldRecordService.listByProject(activeProject.id);
      setRecords(data);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => records.filter(r => {
    if (filterResult !== "all" && r.result !== filterResult) return false;
    if (filterType !== "all" && r.point_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.code.toLowerCase().includes(q) ||
        r.activity.toLowerCase().includes(q) ||
        (r.location_pk ?? "").toLowerCase().includes(q) ||
        (r.ppi_code ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [records, filterResult, filterType, search]);

  const kpis = useMemo(() => ({
    total:       records.length,
    conforme:    records.filter(r => r.result === "conforme").length,
    obs:         records.filter(r => r.result === "conforme_obs").length,
    naoConforme: records.filter(r => r.result === "nao_conforme").length,
    pendente:    records.filter(r => r.result === "pendente").length,
  }), [records]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await (supabase as any).from("field_records").update({ is_deleted: true }).eq("id", deleteId);
      toast({ title: t("common.softDeleted") });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-5 max-w-[1180px] mx-auto">
      {isArchived && <ArchivedBanner />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("fieldRecords.category", { defaultValue: "Inspecção de Campo" })}
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {t("fieldRecords.title", { defaultValue: "Grelhas de Registo de Campo" })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("fieldRecords.subtitle", { defaultValue: "Registo de RP · WP — verificações, materiais e ensaios in situ" })}
          </p>
        </div>
        {!isArchived && (
          <Button onClick={() => setFormOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t("fieldRecords.new", { defaultValue: "Nova Grelha GR" })}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <ModuleKPICard label={t("common.total")} value={loading ? "—" : kpis.total} icon={ClipboardCheck} />
        <ModuleKPICard label={t("fieldRecords.kpi.conforme", { defaultValue: "Conforme" })} value={loading ? "—" : kpis.conforme} icon={CheckCircle2} color="hsl(142 71% 45%)" />
        <ModuleKPICard label={t("fieldRecords.kpi.obs", { defaultValue: "c/ Obs." })} value={loading ? "—" : kpis.obs} icon={AlertTriangle} color="hsl(38 92% 50%)" />
        <ModuleKPICard label={t("fieldRecords.kpi.naoConforme", { defaultValue: "Não Conforme" })} value={loading ? "—" : kpis.naoConforme} icon={XCircle} color="hsl(var(--destructive))" />
        <ModuleKPICard label={t("fieldRecords.kpi.pendente", { defaultValue: "Pendente" })} value={loading ? "—" : kpis.pendente} icon={Clock} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
            <SelectItem value="rp">RP</SelectItem>
            <SelectItem value="wp">WP</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allResults", { defaultValue: "Todos os resultados" })}</SelectItem>
            {GR_RESULTS.map(r => <SelectItem key={r} value={r}>{RESULT_CFG[r]?.label ?? r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card className="border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs w-32">{t("common.code")}</TableHead>
              <TableHead className="text-xs w-20">{t("fieldRecords.col.type", { defaultValue: "Tipo" })}</TableHead>
              <TableHead className="text-xs">{t("fieldRecords.col.activity", { defaultValue: "Actividade" })}</TableHead>
              <TableHead className="text-xs w-28">{t("fieldRecords.col.pk", { defaultValue: "PK" })}</TableHead>
              <TableHead className="text-xs w-28 hidden sm:table-cell">{t("fieldRecords.col.ppi", { defaultValue: "PPI" })}</TableHead>
              <TableHead className="text-xs w-28">{t("common.date")}</TableHead>
              <TableHead className="text-xs w-36">{t("fieldRecords.col.result", { defaultValue: "Resultado" })}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-0">
                <EmptyState icon={ClipboardCheck}
                  title={t("fieldRecords.empty.title", { defaultValue: "Sem grelhas de registo" })}
                  subtitle={t("fieldRecords.empty.subtitle", { defaultValue: "Cria uma nova grelha para registar uma verificação de campo" })} />
              </TableCell></TableRow>
            ) : filtered.map(r => {
              const resultCfg = RESULT_CFG[r.result] ?? RESULT_CFG.pendente;
              const ResultIcon = resultCfg.icon;
              const typeCfg = TYPE_CFG[r.point_type] ?? TYPE_CFG.rp;
              return (
                <TableRow
                  key={r.id}
                  className="hover:bg-muted/20 cursor-pointer group"
                  onClick={() => setViewId(r.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold", typeCfg.cls)}>
                      {r.point_type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium truncate max-w-[260px]">{r.activity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.location_pk ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{r.ppi_code ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.inspection_date).toLocaleDateString(t("common.locale", { defaultValue: "pt-PT" }))}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", resultCfg.cls)}>
                      <ResultIcon className="h-3 w-3" />
                      {resultCfg.label}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary"
                        title={t("common.view", { defaultValue: "Ver" })}
                        onClick={() => setViewId(r.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        title={t("common.exportPdf", { defaultValue: "Exportar PDF" })}
                        onClick={() => fieldRecordService.exportPdf(r as any, activeProject.name)}>
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive"
                          title={t("common.delete")}
                          onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <FieldRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={load}
        projectId={activeProject.id}
        userId={user?.id ?? ""}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("fieldRecords.deleteConfirm", { defaultValue: "A grelha será arquivada e não aparecerá na lista." })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

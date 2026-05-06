/**
 * MachineryLogTab — Diário de Máquina
 * Tab dentro do SubcontractorDetailPage ou MachineryPanel
 * Registo diário: horas, estado, zona, operador, combustível, avarias
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/utils/toast";
import {
  Plus, Pencil, Trash2, Loader2, Wrench, CheckCircle2,
  AlertTriangle, Clock, Gauge, Fuel, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  machinery_id: string | null;
  log_date: string;
  status: string;
  hours_start: number | null;
  hours_end: number | null;
  hours_worked: number | null;
  location_zone: string | null;
  work_type: string | null;
  breakdown_desc: string | null;
  repair_desc: string | null;
  repair_hours: number | null;
  fuel_liters: number | null;
  operator_name: string | null;
  notes: string | null;
}

interface MachineryItem {
  id: string;
  designation: string;
  plate: string | null;
  type: string | null;
}

interface MachineryLogTabProps {
  /** Se passado, filtra por esta máquina específica. Se null, mostra todas. */
  machineryId?: string | null;
}

const LOG_STATUSES = ["operational","breakdown","maintenance","standby","transferred"] as const;

const STATUS_CONFIG: Record<string, { label: string; labelEs: string; color: string; icon: any }> = {
  operational:  { label: "Operacional",   labelEs: "Operacional",  color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  breakdown:    { label: "Avaria",         labelEs: "Avería",       color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  maintenance:  { label: "Manutenção",     labelEs: "Mantenimiento",color: "bg-amber-500/10 text-amber-700 border-amber-500/30",     icon: Wrench },
  standby:      { label: "Standby",        labelEs: "Espera",       color: "bg-gray-500/10 text-gray-700 border-gray-500/30",        icon: Clock },
  transferred:  { label: "Transferida",    labelEs: "Transferida",  color: "bg-blue-500/10 text-blue-700 border-blue-500/30",        icon: Gauge },
};

const EMPTY_FORM: Partial<LogEntry> = {
  log_date: new Date().toISOString().slice(0,10),
  status: "operational",
};

export function MachineryLogTab({ machineryId }: MachineryLogTabProps) {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const lang = i18n.language?.startsWith("es") ? "es" : "pt";

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [machines, setMachines] = useState<MachineryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<LogEntry>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);

    // Carregar máquinas para o selector
    const { data: machs } = await supabase
      .from("project_machinery" as any)
      .select("id, designation, plate, type")
      .eq("project_id", activeProject.id)
      .eq("status", "active");
    setMachines((machs ?? []) as MachineryItem[]);

    // Carregar registos
    let query = supabase
      .from("machinery_log" as any)
      .select("*")
      .eq("project_id", activeProject.id)
      .eq("is_deleted", false)
      .order("log_date", { ascending: false })
      .limit(200);

    if (machineryId) query = query.eq("machinery_id", machineryId);

    const { data } = await query;
    setEntries((data ?? []) as LogEntry[]);
    setLoading(false);
  }, [activeProject, machineryId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      log_date: new Date().toISOString().slice(0,10),
      machinery_id: machineryId ?? undefined,
    });
    setDialogOpen(true);
  };

  const openEdit = (e: LogEntry) => {
    setEditingId(e.id);
    setForm({ ...e });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeProject || !form.log_date) return;
    setSaving(true);
    try {
      const payload = {
        project_id: activeProject.id,
        machinery_id: form.machinery_id ?? null,
        log_date: form.log_date,
        status: form.status ?? "operational",
        hours_start: form.hours_start ?? null,
        hours_end: form.hours_end ?? null,
        location_zone: form.location_zone ?? null,
        work_type: form.work_type ?? null,
        breakdown_desc: form.breakdown_desc ?? null,
        repair_desc: form.repair_desc ?? null,
        repair_hours: form.repair_hours ?? null,
        fuel_liters: form.fuel_liters ?? null,
        operator_name: form.operator_name ?? null,
        notes: form.notes ?? null,
      };

      if (editingId) {
        await supabase.from("machinery_log" as any).update(payload).eq("id", editingId);
      } else {
        await supabase.from("machinery_log" as any).insert(payload);
      }
      toast({ title: t("common.saved") });
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("machinery_log" as any).update({ is_deleted: true }).eq("id", id);
    toast({ title: t("common.deleted") });
    await load();
  };

  const getMachineName = (id: string | null) => {
    if (!id) return "—";
    const m = machines.find(m => m.id === id);
    return m ? `${m.designation}${m.plate ? ` (${m.plate})` : ""}` : "—";
  };

  const statusLabel = (s: string) => {
    const cfg = STATUS_CONFIG[s];
    if (!cfg) return s;
    return lang === "es" ? cfg.labelEs : cfg.label;
  };

  // KPIs rápidos
  const totalHours = entries.reduce((sum, e) => sum + (e.hours_worked ?? 0), 0);
  const totalFuel = entries.reduce((sum, e) => sum + (e.fuel_liters ?? 0), 0);
  const breakdowns = entries.filter(e => e.status === "breakdown").length;
  const thisMonth = entries.filter(e => e.log_date?.startsWith(new Date().toISOString().slice(0,7)));
  const monthHours = thisMonth.reduce((sum, e) => sum + (e.hours_worked ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: lang === "es" ? "Horas este mes" : "Horas este mês", value: monthHours.toFixed(1) + "h", icon: Gauge },
          { label: lang === "es" ? "Total horas" : "Total horas", value: totalHours.toFixed(1) + "h", icon: Clock },
          { label: lang === "es" ? "Total combustível" : "Total combustível", value: totalFuel.toFixed(0) + "L", icon: Fuel },
          { label: lang === "es" ? "Averías registradas" : "Avarias registadas", value: String(breakdowns), icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <Button size="sm" className="h-8 text-xs gap-1" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" />
          {lang === "es" ? "Nuevo Registro" : "Novo Registo"}
        </Button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>{lang === "es" ? "Sin registros de maquinaria" : "Sem registos de maquinaria"}</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={openNew}>
            <Plus className="h-3 w-3 mr-1" /> {lang === "es" ? "Nuevo Registro" : "Novo Registo"}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Data</TableHead>
                {!machineryId && <TableHead className="text-xs hidden sm:table-cell">Máquina</TableHead>}
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Horas</TableHead>
                <TableHead className="text-xs hidden sm:table-cell"><MapPin className="h-3 w-3 inline mr-1" />Zona</TableHead>
                <TableHead className="text-xs hidden md:table-cell"><Fuel className="h-3 w-3 inline mr-1" />Comb.</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Operador</TableHead>
                <TableHead className="text-xs w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => {
                const cfg = STATUS_CONFIG[e.status];
                const Icon = cfg?.icon ?? CheckCircle2;
                return (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {new Date(e.log_date).toLocaleDateString("pt-PT")}
                    </TableCell>
                    {!machineryId && (
                      <TableCell className="text-xs hidden sm:table-cell">{getMachineName(e.machinery_id)}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] gap-1", cfg?.color)}>
                        <Icon className="h-2.5 w-2.5" />
                        {statusLabel(e.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell">
                      {e.hours_worked != null ? (
                        <span className="font-medium">{e.hours_worked.toFixed(1)}h</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                      {e.location_zone ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                      {e.fuel_liters != null ? `${e.fuel_liters}L` : "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                      {e.operator_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pt-6">
            <DialogTitle className="text-base">
              {lang === "es"
                ? (editingId ? "Editar Registro" : "Nuevo Registro de Maquinaria")
                : (editingId ? "Editar Registo" : "Novo Registo Diário de Máquina")}
            </DialogTitle>
          </DialogHeader>
          <Separator className="-mx-6" />

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" className="h-8 text-xs"
                  value={form.log_date ?? ""}
                  onChange={e => setForm(p => ({ ...p, log_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOG_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!machineryId && (
              <div className="space-y-1">
                <Label className="text-xs">Máquina</Label>
                <Select value={form.machinery_id ?? "__none__"}
                  onValueChange={v => setForm(p => ({ ...p, machinery_id: v === "__none__" ? undefined : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {machines.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.designation}{m.plate ? ` (${m.plate})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Horómetro início (h)</Label>
                <Input type="number" step="0.1" className="h-8 text-xs"
                  value={form.hours_start ?? ""}
                  onChange={e => setForm(p => ({ ...p, hours_start: parseFloat(e.target.value) || undefined }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horómetro fim (h)</Label>
                <Input type="number" step="0.1" className="h-8 text-xs"
                  value={form.hours_end ?? ""}
                  onChange={e => setForm(p => ({ ...p, hours_end: parseFloat(e.target.value) || undefined }))} />
              </div>
              {form.hours_start && form.hours_end && form.hours_end > form.hours_start && (
                <div className="col-span-2 text-xs text-emerald-600 font-medium">
                  ✅ Horas trabalhadas: {(form.hours_end - form.hours_start).toFixed(1)}h
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Zona / Localização</Label>
                <Input className="h-8 text-xs" placeholder="PK 31+500, Cachofarra..."
                  value={form.location_zone ?? ""}
                  onChange={e => setForm(p => ({ ...p, location_zone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de trabalho</Label>
                <Input className="h-8 text-xs" placeholder="Terraplenagem, Drenagem..."
                  value={form.work_type ?? ""}
                  onChange={e => setForm(p => ({ ...p, work_type: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Combustível (litros)</Label>
                <Input type="number" step="0.1" className="h-8 text-xs"
                  value={form.fuel_liters ?? ""}
                  onChange={e => setForm(p => ({ ...p, fuel_liters: parseFloat(e.target.value) || undefined }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operador</Label>
                <Input className="h-8 text-xs"
                  value={form.operator_name ?? ""}
                  onChange={e => setForm(p => ({ ...p, operator_name: e.target.value }))} />
              </div>
            </div>

            {(form.status === "breakdown" || form.status === "maintenance") && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-destructive">Descrição da avaria / intervenção</Label>
                  <Textarea className="text-xs min-h-[60px] resize-none"
                    value={form.breakdown_desc ?? ""}
                    onChange={e => setForm(p => ({ ...p, breakdown_desc: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição da reparação</Label>
                    <Input className="h-8 text-xs"
                      value={form.repair_desc ?? ""}
                      onChange={e => setForm(p => ({ ...p, repair_desc: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horas de reparação</Label>
                    <Input type="number" step="0.5" className="h-8 text-xs"
                      value={form.repair_hours ?? ""}
                      onChange={e => setForm(p => ({ ...p, repair_hours: parseFloat(e.target.value) || undefined }))} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea className="text-xs min-h-[50px] resize-none"
                value={form.notes ?? ""}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <Separator className="-mx-6" />
          <DialogFooter className="pb-6 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { projectMachineryService, type ProjectMachinery, type ProjectMachineryInput } from "@/lib/services/projectMachineryService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { Wrench, Plus, Loader2, Pencil, Trash2, RefreshCw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  on_site: "bg-primary/15 text-primary",
  off_site: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  maintenance: "bg-muted text-muted-foreground",
};

interface MachineryPanelProps {
  projectId: string;
  subcontractorId?: string | null;
  company?: string;
}

export function MachineryPanel({ projectId, subcontractorId, company }: MachineryPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ProjectMachinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOnSite, setFilterOnSite] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMachinery | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ProjectMachinery | null>(null);

  const [form, setForm] = useState({
    designation: "", type: "", plate: "", serial_number: "",
    sound_power_db: "", status: "on_site", notes: "",
    // Novos campos
    itv_cert_ref: "", itv_valid_until: "", insurance_valid_until: "",
    calibration_valid_until: "", last_maintenance_date: "",
    next_maintenance_date: "", horimetro_current: "", max_load_t: "", discipline: "__none__",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectMachineryService.list(projectId, subcontractorId ?? null);
      setItems(data);
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    } finally {
      setLoading(false);
    }
  }, [projectId, subcontractorId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterOnSite ? items.filter(m => m.status === "on_site") : items;

  const openNew = () => {
    setEditing(null);
    setForm({
      designation: "", type: "", plate: "", serial_number: "", sound_power_db: "",
      status: "on_site", notes: "", itv_cert_ref: "", itv_valid_until: "",
      insurance_valid_until: "", calibration_valid_until: "", last_maintenance_date: "",
      next_maintenance_date: "", horimetro_current: "", max_load_t: "", discipline: "__none__",
    });
    setDialogOpen(true);
  };

  const openEdit = (m: ProjectMachinery) => {
    setEditing(m);
    setForm({
      designation: m.designation, type: m.type ?? "", plate: m.plate ?? "",
      serial_number: m.serial_number ?? "",
      sound_power_db: m.sound_power_db?.toString() ?? "",
      status: m.status, notes: m.notes ?? "",
      itv_cert_ref: (m as any).itv_cert_ref ?? "",
      itv_valid_until: (m as any).itv_valid_until ?? "",
      insurance_valid_until: (m as any).insurance_valid_until ?? "",
      calibration_valid_until: (m as any).calibration_valid_until ?? "",
      last_maintenance_date: (m as any).last_maintenance_date ?? "",
      next_maintenance_date: (m as any).next_maintenance_date ?? "",
      horimetro_current: (m as any).horimetro_current?.toString() ?? "",
      max_load_t: (m as any).max_load_t?.toString() ?? "",
      discipline: (m as any).discipline ?? "__none__",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.designation.trim()) return;
    setSaving(true);
    try {
      const payload = {
        designation: form.designation,
        type: form.type || null,
        plate: form.plate || null,
        serial_number: form.serial_number || null,
        sound_power_db: form.sound_power_db ? Number(form.sound_power_db) : null,
        status: form.status,
        notes: form.notes || null,
        // Campos novos
        itv_cert_ref: form.itv_cert_ref.trim() || null,
        itv_valid_until: form.itv_valid_until || null,
        insurance_valid_until: form.insurance_valid_until || null,
        calibration_valid_until: form.calibration_valid_until || null,
        last_maintenance_date: form.last_maintenance_date || null,
        next_maintenance_date: form.next_maintenance_date || null,
        horimetro_current: form.horimetro_current ? Number(form.horimetro_current) : null,
        max_load_t: form.max_load_t ? Number(form.max_load_t) : null,
        discipline: form.discipline === "__none__" ? null : form.discipline,
      };
      if (editing) {
        await projectMachineryService.update(editing.id, payload);
        toast.success(t("common.saved"));
      } else {
        await projectMachineryService.create({
          ...payload,
          project_id: projectId,
          subcontractor_id: subcontractorId ?? null,
          company: company ?? null,
        });
        toast.success(t("common.created"));
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (m: ProjectMachinery, newStatus: string) => {
    try {
      await projectMachineryService.update(m.id, { status: newStatus });
      toast.success(t("common.saved"));
      fetchData();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await projectMachineryService.remove(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
      fetchData();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            {t("machinery.title")}
            {items.length > 0 && <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterOnSite ? "on_site" : "all"} onValueChange={v => setFilterOnSite(v === "on_site")}>
              <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on_site">{t("machinery.status.on_site")}</SelectItem>
                <SelectItem value="all">{t("common.all")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={openNew}>
              <Plus className="h-3 w-3" /> {t("machinery.add")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Wrench} subtitleKey="common.noData" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">{t("machinery.designation")}</TableHead>
                  <TableHead className="text-xs">{t("machinery.type")}</TableHead>
                  <TableHead className="text-xs">{t("machinery.plate")}</TableHead>
                  <TableHead className="text-xs">{t("machinery.soundPower")}</TableHead>
                  <TableHead className="text-xs">{t("common.status")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm font-medium">{m.designation}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.type ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.plate ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.sound_power_db != null ? `${m.sound_power_db} dB` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[m.status] ?? "")}>
                        {t(`machinery.status.${t(`machinery.status.${m.status}`, { defaultValue: m.status })}`, { defaultValue: m.status })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActionMenu actions={[
                        { key: "edit", label: t("common.edit"), icon: Pencil, onClick: () => openEdit(m) },
                        ...(m.status !== "on_site" ? [{ key: "to_on_site", label: t("machinery.status.on_site"), icon: RefreshCw, onClick: () => handleStatusChange(m, "on_site") }] : []),
                        ...(m.status !== "off_site" ? [{ key: "to_off_site", label: t("machinery.status.off_site"), icon: RefreshCw, onClick: () => handleStatusChange(m, "off_site") }] : []),
                        ...(m.status !== "maintenance" ? [{ key: "to_maint", label: t("machinery.status.maintenance"), icon: RefreshCw, onClick: () => handleStatusChange(m, "maintenance") }] : []),
                        { key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => setDeleting(m), variant: "destructive" as const },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("machinery.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t("machinery.designation")} *</Label>
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div>
              <Label>{t("machinery.type")}</Label>
              <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("machinery.plate")}</Label>
                <Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("machinery.serial")}</Label>
                <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("machinery.soundPower")}</Label>
              <Input type="number" value={form.sound_power_db} onChange={e => setForm(f => ({ ...f, sound_power_db: e.target.value }))} />
            </div>
            <div>
              <Label>{t("common.status")}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_site">{t("machinery.status.on_site")}</SelectItem>
                  <SelectItem value="off_site">{t("machinery.status.off_site")}</SelectItem>
                  <SelectItem value="maintenance">{t("machinery.status.maintenance")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            {/* Secção certificações e manutenção */}
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {t("machinery.sectionCerts", { defaultValue: "Certificações e Manutenção" })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("machinery.itvCertRef", { defaultValue: "Ref. ITV/IPO" })}</Label>
                  <Input className="h-8 text-xs" value={form.itv_cert_ref} onChange={e => setForm(f => ({ ...f, itv_cert_ref: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.itvValidUntil", { defaultValue: "Validade ITV" })}</Label>
                  <Input type="date" className="h-8 text-xs" value={form.itv_valid_until} onChange={e => setForm(f => ({ ...f, itv_valid_until: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.insuranceValidUntil", { defaultValue: "Validade Seguro" })}</Label>
                  <Input type="date" className="h-8 text-xs" value={form.insurance_valid_until} onChange={e => setForm(f => ({ ...f, insurance_valid_until: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.calibrationValidUntil", { defaultValue: "Validade Calibração (EME)" })}</Label>
                  <Input type="date" className="h-8 text-xs" value={form.calibration_valid_until} onChange={e => setForm(f => ({ ...f, calibration_valid_until: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.lastMaintenance", { defaultValue: "Última manutenção" })}</Label>
                  <Input type="date" className="h-8 text-xs" value={form.last_maintenance_date} onChange={e => setForm(f => ({ ...f, last_maintenance_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.nextMaintenance", { defaultValue: "Próxima manutenção" })}</Label>
                  <Input type="date" className="h-8 text-xs" value={form.next_maintenance_date} onChange={e => setForm(f => ({ ...f, next_maintenance_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.horimetro", { defaultValue: "Horímetro (h)" })}</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={form.horimetro_current} onChange={e => setForm(f => ({ ...f, horimetro_current: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t("machinery.maxLoad", { defaultValue: "Carga máx. (t)" })}</Label>
                  <Input type="number" min={0} step="0.1" className="h-8 text-xs" value={form.max_load_t} onChange={e => setForm(f => ({ ...f, max_load_t: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.designation.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { topographyControlService, type TopographyEquipment, type TopographyControl } from "@/lib/services/topographyService";
import { auditService } from "@/lib/services/auditService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WorkItemSelect } from "@/components/ui/work-item-select";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipment: TopographyEquipment[];
  editControl?: TopographyControl | null;
  onSuccess: () => void;
}

export function ControlFormDialog({ open, onOpenChange, projectId, equipment, editControl, onSuccess }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isEdit = !!editControl;
  const [workItems, setWorkItems] = useState<{ id: string; sector: string; elemento?: string | null; parte?: string | null }[]>([]);
  const [ppiInstances, setPpiInstances] = useState<{ id: string; code: string; status: string }[]>([]);
  const [ncs, setNcs] = useState<{ id: string; code: string; title: string }[]>([]);
  const [form, setForm] = useState({
    equipment_id: editControl?.equipment_id ?? "",
    element: editControl?.element ?? "",
    zone: editControl?.zone ?? "",
    tolerance: editControl?.tolerance ?? "",
    measured_value: editControl?.measured_value ?? "",
    deviation: editControl?.deviation ?? "",
    result: editControl?.result ?? "conforme",
    execution_date: editControl?.execution_date ?? new Date().toISOString().split("T")[0],
    technician: editControl?.technician ?? "",
    notes: editControl?.notes ?? "",
    work_item_id: editControl?.work_item_id ?? "__none__",
    ppi_id: editControl?.ppi_id ?? "__none__",
    nc_id: editControl?.nc_id ?? "__none__",
  });

  useEffect(() => {
    if (open) {
      if (editControl) {
        setForm({
          equipment_id: editControl.equipment_id,
          element: editControl.element,
          zone: editControl.zone ?? "",
          tolerance: editControl.tolerance ?? "",
          measured_value: editControl.measured_value ?? "",
          deviation: editControl.deviation ?? "",
          result: editControl.result,
          execution_date: editControl.execution_date,
          technician: editControl.technician ?? "",
          notes: editControl.notes ?? "",
          work_item_id: editControl.work_item_id ?? "__none__",
          ppi_id: editControl.ppi_id ?? "__none__",
          nc_id: editControl.nc_id ?? "__none__",
        });
      } else {
        setForm({ equipment_id: "", element: "", zone: "", tolerance: "", measured_value: "", deviation: "", result: "conforme", execution_date: new Date().toISOString().split("T")[0], technician: "", notes: "", work_item_id: "__none__", ppi_id: "__none__", nc_id: "__none__" });
      }
      supabase.from("work_items").select("id, sector, elemento, parte").eq("project_id", projectId).order("sector").then(({ data }) => {
        setWorkItems(data ?? []);
      });
      (supabase as any).from("ppi_instances").select("id, code, status").eq("project_id", projectId)
        .in("status", ["draft", "in_progress", "submitted", "approved"]).order("code").then(({ data }: any) => {
        setPpiInstances(data ?? []);
      });
      (supabase as any).from("non_conformities").select("id, code, title").eq("project_id", projectId)
        .eq("is_deleted", false)
        .not("status", "in", '("closed","archived","cancelled")').order("code").then(({ data }: any) => {
        setNcs(data ?? []);
      });
    }
  }, [open, editControl, projectId]);

  const selectedEquipment = equipment.find(e => e.id === form.equipment_id);
  const isCalibrationInvalid = selectedEquipment && (selectedEquipment.calibration_status === "expired" || selectedEquipment.calibration_status === "unknown");

  const handleSubmit = async () => {
    if (!form.equipment_id) { toast.error(t("topography.form.selectEquipment")); return; }
    if (!form.element.trim()) { toast.error(t("topography.form.elementRequired")); return; }

    if (isCalibrationInvalid) {
      await auditService.log({
        projectId,
        entity: "topography_controls",
        action: "STATUS_CHANGE",
        module: "topography",
        description: `Bloqueio por calibração expirada no equipamento ${selectedEquipment?.code}`,
        diff: { equipment_id: form.equipment_id, calibration_status: selectedEquipment?.calibration_status },
      });
      toast.error(t("topography.calibrationBlocked"));
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        equipment_id: form.equipment_id,
        element: form.element.trim(),
        zone: form.zone || null,
        tolerance: form.tolerance || null,
        measured_value: form.measured_value || null,
        deviation: form.deviation || null,
        result: form.result,
        execution_date: form.execution_date,
        technician: form.technician || null,
        notes: form.notes || null,
        work_item_id: form.work_item_id === "__none__" ? null : form.work_item_id,
        ppi_id: form.ppi_id === "__none__" ? null : form.ppi_id,
        nc_id: form.nc_id === "__none__" ? null : form.nc_id,
      };

      if (editControl) {
        await topographyControlService.update(editControl.id, projectId, payload);
        toast.success(t("topography.toast.controlUpdated"));
      } else {
        await topographyControlService.create({ ...payload, project_id: projectId });
        toast.success(t("topography.toast.controlCreated"));
      }
      onSuccess();
    } catch (e: any) {
      if (e.message?.includes("calibração inválida") || e.message?.includes("calibração")) {
        toast.error(t("topography.calibrationBlocked"));
      } else {
        toast.error(e.message || t("topography.toast.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const validEquipment = equipment.filter(e => e.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("topography.form.editControl") : t("topography.form.newControl")}</DialogTitle>
          <DialogDescription>{t("topography.form.controlDescription")}</DialogDescription>
        </DialogHeader>

        {isCalibrationInvalid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>🔒 {t("topography.form.blocked")}:</strong> {t("topography.calibrationBlocked")}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div>
              <Label>{t("topography.equipment")} *</Label>
              <Select value={form.equipment_id} onValueChange={v => setForm(f => ({ ...f, equipment_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("topography.form.selectEquipment")} /></SelectTrigger>
                <SelectContent>
                  {validEquipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.code} — {t(`topography.equipmentType.${eq.equipment_type}`, { defaultValue: eq.equipment_type })}
                      {eq.calibration_status === "expired" ? ` ⚠️ ${t("topography.status.expired")}` : ""}
                      {eq.calibration_status === "expiring_soon" ? ` ⏰ ${t("topography.status.expiring_soon")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.table.element")} *</Label><Input value={form.element} onChange={e => setForm(f => ({ ...f, element: e.target.value }))} placeholder={t("topography.form.elementPlaceholder")} /></div>
              <div><Label>{t("topography.table.zone")}</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ex: PK 12+500" /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t("topography.table.tolerance")}</Label><Input value={form.tolerance} onChange={e => setForm(f => ({ ...f, tolerance: e.target.value }))} placeholder="±5mm" /></div>
              <div><Label>{t("topography.table.measuredValue")}</Label><Input value={form.measured_value} onChange={e => setForm(f => ({ ...f, measured_value: e.target.value }))} /></div>
              <div><Label>{t("topography.table.deviation")}</Label><Input value={form.deviation} onChange={e => setForm(f => ({ ...f, deviation: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("topography.table.result")} *</Label>
                <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">{t("topography.result.conforme")}</SelectItem>
                    <SelectItem value="nao_conforme">{t("topography.result.nao_conforme")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("common.date")}</Label><Input type="date" value={form.execution_date} onChange={e => setForm(f => ({ ...f, execution_date: e.target.value }))} /></div>
            </div>

            <div><Label>{t("topography.table.technician")}</Label><Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} /></div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("topography.form.links")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("topography.form.workItem")}</Label>
                <Select value={form.work_item_id} onValueChange={v => setForm(f => ({ ...f, work_item_id: v }))}>
                  <FormControl>
                    <WorkItemSelect
                      workItems={workItems}
                      value={field?.value || ""}
                      onValueChange={v => field?.onChange && field.onChange(v || "")}
                      placeholder={t("topography.form.none")}
                    />
                  </FormControl>
              </div>
              <div>
                <Label>{t("topography.form.ppiLinked", { defaultValue: "PPI associada" })}</Label>
                <Select value={form.ppi_id} onValueChange={v => setForm(f => ({ ...f, ppi_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("topography.form.none")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("topography.form.none")}</SelectItem>
                    {ppiInstances.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {t(`ppi.status.${p.status}`, { defaultValue: p.status })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("topography.form.ncLinked", { defaultValue: "NC associada" })}</Label>
              <Select value={form.nc_id} onValueChange={v => setForm(f => ({ ...f, nc_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("topography.form.none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("topography.form.none")}</SelectItem>
                  {ncs.map(nc => (
                    <SelectItem key={nc.id} value={nc.id}>
                      {nc.code} — {nc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div><Label>{t("topography.form.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            {isEdit && editControl && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={projectId}
                  entityType="topography_controls"
                  entityId={editControl.id}
                />
              </>
            )}

            <Button onClick={handleSubmit} disabled={loading || !!isCalibrationInvalid} className="w-full">
              {loading ? t("common.loading") : isEdit ? t("common.save") : t("topography.newControl")}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

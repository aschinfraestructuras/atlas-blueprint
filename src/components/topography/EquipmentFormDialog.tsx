import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { topographyEquipmentService, calibrationService, type TopographyEquipment, type EquipmentCalibration } from "@/lib/services/topographyService";
import { CalibrationFormDialog } from "@/components/topography/CalibrationFormDialog";
import { useProjectRole } from "@/hooks/useProjectRole";
import { CheckCircle, Clock, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipment?: TopographyEquipment | null;
  onSuccess: () => void;
}

export function EquipmentFormDialog({ open, onOpenChange, projectId, equipment, onSuccess }: Props) {
  const { t } = useTranslation();
  const isEdit = !!equipment;
  const { isAdmin } = useProjectRole();
  const [loading, setLoading] = useState(false);
  const [calibrations, setCalibrations] = useState<EquipmentCalibration[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [editCalibration, setEditCalibration] = useState<EquipmentCalibration | null>(null);
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [deleteCalId, setDeleteCalId] = useState<string | null>(null);

  const equipmentTypes = [
    { value: "estacao_total", label: t("topography.equipmentType.estacao_total") },
    { value: "gnss", label: t("topography.equipmentType.gnss") },
    { value: "nivel_otico", label: t("topography.equipmentType.nivel_otico") },
    { value: "drone", label: t("topography.equipmentType.drone") },
    { value: "scanner_3d", label: t("topography.equipmentType.scanner_3d") },
    { value: "outros", label: t("topography.equipmentType.outros") },
  ];

  const eqStatuses = [
    { value: "active", label: t("topography.eqStatus.active") },
    { value: "inactive", label: t("topography.eqStatus.inactive") },
    { value: "archived", label: t("topography.eqStatus.archived") },
  ];

  const [form, setForm] = useState({
    code: equipment?.code ?? "",
    equipment_type: equipment?.equipment_type ?? "estacao_total",
    brand: equipment?.brand ?? "",
    model: equipment?.model ?? "",
    serial_number: equipment?.serial_number ?? "",
    responsible: equipment?.responsible ?? "",
    current_location: equipment?.current_location ?? "",
    status: equipment?.status ?? "active",
  });

  const loadCalibrations = useCallback(async () => {
    if (!equipment?.id) return;
    setCalLoading(true);
    try {
      setCalibrations(await calibrationService.getByEquipment(equipment.id));
    } catch { /* */ } finally { setCalLoading(false); }
  }, [equipment?.id]);

  useEffect(() => {
    if (open && equipment) {
      setForm({
        code: equipment.code,
        equipment_type: equipment.equipment_type,
        brand: equipment.brand ?? "",
        model: equipment.model ?? "",
        serial_number: equipment.serial_number ?? "",
        responsible: equipment.responsible ?? "",
        current_location: equipment.current_location ?? "",
        status: equipment.status ?? "active",
      });
      loadCalibrations();
    } else if (open && !equipment) {
      setForm({ code: "", equipment_type: "estacao_total", brand: "", model: "", serial_number: "", responsible: "", current_location: "", status: "active" });
      setCalibrations([]);
    }
  }, [open, equipment, loadCalibrations]);

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error(t("topography.form.codeRequired")); return; }
    setLoading(true);
    try {
      if (isEdit && equipment) {
        await topographyEquipmentService.update(equipment.id, projectId, {
          code: form.code.trim(),
          equipment_type: form.equipment_type,
          brand: form.brand || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          responsible: form.responsible || null,
          current_location: form.current_location || null,
          status: form.status,
        });
        toast.success(t("topography.toast.equipmentUpdated"));
      } else {
        await topographyEquipmentService.create({
          project_id: projectId,
          code: form.code.trim(),
          equipment_type: form.equipment_type,
          brand: form.brand || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          responsible: form.responsible || null,
          current_location: form.current_location || null,
        });
        toast.success(t("topography.toast.equipmentCreated"));
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("topography.toast.error"));
    } finally {
      setLoading(false);
    }
  };

  const calStatusBadge = (cal: EquipmentCalibration) => {
    const today = new Date().toISOString().split("T")[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d30s = d30.toISOString().split("T")[0];
    if (cal.valid_until < today) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{t("topography.status.expired")}</Badge>;
    if (cal.valid_until <= d30s) return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />{t("topography.status.expiring_soon")}</Badge>;
    return <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />{t("topography.status.valid")}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? t("topography.form.editEquipment") : t("topography.form.newEquipment")}</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.table.code")} *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EQ-001" /></div>
              <div>
                <Label>{t("topography.table.type")} *</Label>
                <Select value={form.equipment_type} onValueChange={v => setForm(f => ({ ...f, equipment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.form.brand")}</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
              <div><Label>{t("topography.form.model")}</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.table.serial")}</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              <div><Label>{t("topography.table.responsible")}</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.form.location")}</Label><Input value={form.current_location} onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} /></div>
              {isEdit && (
                <div>
                  <Label>{t("common.status")}</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {eqStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? t("common.loading") : isEdit ? t("common.save") : t("topography.newEquipment")}
            </Button>

            {isEdit && equipment && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{t("topography.calibrationHistory")}</h3>
                  {calLoading ? (
                    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                  ) : calibrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("topography.noCalibrationsYet")}</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-xs">{t("topography.form.certEntity")}</TableHead>
                          <TableHead className="text-xs">{t("topography.form.certNumber")}</TableHead>
                          <TableHead className="text-xs">{t("topography.form.issueDate")}</TableHead>
                          <TableHead className="text-xs">{t("topography.table.validity")}</TableHead>
                          <TableHead className="text-xs">{t("common.status")}</TableHead>
                          <TableHead className="text-xs w-20" />
                        </TableRow></TableHeader>
                        <TableBody>
                          {calibrations.map(cal => (
                            <TableRow key={cal.id}>
                              <TableCell className="text-sm">{cal.certifying_entity}</TableCell>
                              <TableCell className="text-sm font-mono">{cal.certificate_number || "—"}</TableCell>
                              <TableCell className="text-sm">{cal.issue_date}</TableCell>
                              <TableCell className="text-sm">{cal.valid_until}</TableCell>
                              <TableCell>{calStatusBadge(cal)}</TableCell>
                              <TableCell>
                                <div className="flex gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title={t("common.edit", { defaultValue: "Editar" })}
                                    onClick={() => { setEditCalibration(cal); setCalDialogOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title={t("common.delete")}
                                      onClick={() => setDeleteCalId(cal.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <Separator />
                <AttachmentsPanel
                  projectId={projectId}
                  entityType="topography_equipment"
                  entityId={equipment.id}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

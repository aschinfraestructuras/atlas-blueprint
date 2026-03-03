import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { calibrationService, type EquipmentCalibration } from "@/lib/services/topographyService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipmentId: string | null;
  editCalibration?: EquipmentCalibration | null;
  onSuccess: () => void;
}

export function CalibrationFormDialog({ open, onOpenChange, projectId, equipmentId, editCalibration, onSuccess }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isEdit = !!editCalibration;
  const [form, setForm] = useState({
    certifying_entity: editCalibration?.certifying_entity ?? "",
    certificate_number: editCalibration?.certificate_number ?? "",
    issue_date: editCalibration?.issue_date ?? new Date().toISOString().split("T")[0],
    valid_until: editCalibration?.valid_until ?? "",
    notes: editCalibration?.notes ?? "",
  });

  const handleSubmit = async () => {
    const eqId = editCalibration?.equipment_id ?? equipmentId;
    if (!eqId) { toast.error(t("topography.form.selectEquipment")); return; }
    if (!form.certifying_entity.trim()) { toast.error(t("topography.form.certEntityRequired")); return; }
    if (!form.valid_until) { toast.error(t("topography.form.validUntilRequired")); return; }
    setLoading(true);
    try {
      if (editCalibration) {
        await calibrationService.update(editCalibration.id, projectId, {
          certifying_entity: form.certifying_entity.trim(),
          certificate_number: form.certificate_number || null,
          issue_date: form.issue_date,
          valid_until: form.valid_until,
          notes: form.notes || null,
        });
        toast.success(t("topography.toast.calibrationUpdated"));
      } else {
        await calibrationService.create({
          equipment_id: eqId,
          project_id: projectId,
          certifying_entity: form.certifying_entity.trim(),
          certificate_number: form.certificate_number || null,
          issue_date: form.issue_date,
          valid_until: form.valid_until,
          notes: form.notes || null,
        });
        toast.success(t("topography.toast.calibrationCreated"));
      }
      setForm({ certifying_entity: "", certificate_number: "", issue_date: new Date().toISOString().split("T")[0], valid_until: "", notes: "" });
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("topography.toast.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? t("topography.form.editCalibration") : t("topography.form.newCalibration")}</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div><Label>{t("topography.form.certEntity")} *</Label><Input value={form.certifying_entity} onChange={e => setForm(f => ({ ...f, certifying_entity: e.target.value }))} placeholder={t("topography.form.certEntityPlaceholder")} /></div>
            <div><Label>{t("topography.form.certNumber")}</Label><Input value={form.certificate_number} onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.form.issueDate")} *</Label><Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
              <div><Label>{t("topography.form.validUntil")} *</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
            </div>
            <div><Label>{t("topography.form.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            {isEdit && editCalibration && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={projectId}
                  entityType="equipment_calibrations"
                  entityId={editCalibration.id}
                />
              </>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full">{loading ? t("common.loading") : isEdit ? t("common.save") : t("topography.newCalibration")}</Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

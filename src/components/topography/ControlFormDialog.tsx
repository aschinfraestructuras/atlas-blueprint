import { useState } from "react";
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
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipment: TopographyEquipment[];
  editControl?: TopographyControl | null;
  onSuccess: () => void;
}

export function ControlFormDialog({ open, onOpenChange, projectId, equipment, editControl, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!editControl;
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
  });

  const selectedEquipment = equipment.find(e => e.id === form.equipment_id);
  const isCalibrationInvalid = selectedEquipment && (selectedEquipment.calibration_status === "expired" || selectedEquipment.calibration_status === "unknown");

  const handleSubmit = async () => {
    if (!form.equipment_id) { toast.error("Selecione um equipamento"); return; }
    if (!form.element.trim()) { toast.error("Elemento é obrigatório"); return; }

    if (isCalibrationInvalid) {
      toast.error("Equipamento com calibração inválida. Atualizar certificado antes de registar medições.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
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
      };

      if (editControl) {
        await topographyControlService.update(editControl.id, projectId, payload);
        toast.success("Controlo atualizado com sucesso");
      } else {
        await topographyControlService.create({ ...payload, project_id: projectId });
        toast.success("Controlo geométrico registado com sucesso");
      }
      setForm({ equipment_id: "", element: "", zone: "", tolerance: "", measured_value: "", deviation: "", result: "conforme", execution_date: new Date().toISOString().split("T")[0], technician: "", notes: "" });
      onSuccess();
    } catch (e: any) {
      if (e.message?.includes("calibração inválida")) {
        toast.error("🔒 Equipamento com calibração inválida. Atualizar certificado antes de registar medições.");
      } else {
        toast.error(e.message || "Erro ao registar controlo");
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
          <DialogTitle>{isEdit ? "Editar Controlo Geométrico" : "Novo Controlo Geométrico"}</DialogTitle>
          <DialogDescription>Registo de medição topográfica com verificação de calibração</DialogDescription>
        </DialogHeader>

        {isCalibrationInvalid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>🔒 Bloqueado:</strong> O equipamento selecionado tem calibração expirada ou inválida.
              Atualize o certificado de calibração antes de registar medições.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div>
              <Label>Equipamento *</Label>
              <Select value={form.equipment_id} onValueChange={v => setForm(f => ({ ...f, equipment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione equipamento" /></SelectTrigger>
                <SelectContent>
                  {validEquipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.code} — {eq.equipment_type}
                      {eq.calibration_status === "expired" ? " ⚠️ Expirado" : ""}
                      {eq.calibration_status === "expiring_soon" ? " ⏰ Expira em breve" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Elemento *</Label><Input value={form.element} onChange={e => setForm(f => ({ ...f, element: e.target.value }))} placeholder="Ex: Eixo via, Cota plataforma" /></div>
              <div><Label>Zona</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ex: PK 12+500" /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>Tolerância</Label><Input value={form.tolerance} onChange={e => setForm(f => ({ ...f, tolerance: e.target.value }))} placeholder="±5mm" /></div>
              <div><Label>Valor Medido</Label><Input value={form.measured_value} onChange={e => setForm(f => ({ ...f, measured_value: e.target.value }))} /></div>
              <div><Label>Desvio</Label><Input value={form.deviation} onChange={e => setForm(f => ({ ...f, deviation: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Resultado *</Label>
                <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="nao_conforme">Não conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data Execução</Label><Input type="date" value={form.execution_date} onChange={e => setForm(f => ({ ...f, execution_date: e.target.value }))} /></div>
            </div>

            <div><Label>Técnico</Label><Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} /></div>
            <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

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
              {loading ? "A guardar…" : isEdit ? "Guardar Alterações" : "Registar Controlo"}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

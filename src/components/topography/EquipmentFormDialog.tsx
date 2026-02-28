import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { topographyEquipmentService, type TopographyEquipment } from "@/lib/services/topographyService";
import { toast } from "sonner";

const EQUIPMENT_TYPES = [
  { value: "estacao_total", label: "Estação Total" },
  { value: "gnss", label: "GNSS" },
  { value: "nivel_otico", label: "Nível Ótico" },
  { value: "drone", label: "Drone" },
  { value: "scanner_3d", label: "Scanner 3D" },
  { value: "outros", label: "Outros" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipment?: TopographyEquipment | null;
  onSuccess: () => void;
}

export function EquipmentFormDialog({ open, onOpenChange, projectId, equipment, onSuccess }: Props) {
  const isEdit = !!equipment;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: equipment?.code ?? "",
    equipment_type: equipment?.equipment_type ?? "estacao_total",
    brand: equipment?.brand ?? "",
    model: equipment?.model ?? "",
    serial_number: equipment?.serial_number ?? "",
    responsible: equipment?.responsible ?? "",
    current_location: equipment?.current_location ?? "",
  });

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error("Código é obrigatório"); return; }
    setLoading(true);
    try {
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
      toast.success("Equipamento criado com sucesso");
      setForm({ code: "", equipment_type: "estacao_total", brand: "", model: "", serial_number: "", responsible: "", current_location: "" });
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar equipamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Equipamento Topográfico" : "Novo Equipamento Topográfico"}</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EQ-001" /></div>
              <div>
                <Label>Tipo *</Label>
                <Select value={form.equipment_type} onValueChange={v => setForm(f => ({ ...f, equipment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Marca</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nº Série</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              <div><Label>Responsável</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
            </div>
            <div><Label>Localização Atual</Label><Input value={form.current_location} onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} /></div>
            
            {!isEdit && <Button onClick={handleSubmit} disabled={loading} className="w-full">{loading ? "A guardar…" : "Criar Equipamento"}</Button>}

            {isEdit && equipment && (
              <>
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

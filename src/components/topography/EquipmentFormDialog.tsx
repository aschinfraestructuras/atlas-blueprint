import { useState, useEffect, useCallback } from "react";
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
import { topographyEquipmentService, calibrationService, type TopographyEquipment, type EquipmentCalibration } from "@/lib/services/topographyService";
import { CheckCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

const EQUIPMENT_TYPES = [
  { value: "estacao_total", label: "Estação Total" },
  { value: "gnss", label: "GNSS" },
  { value: "nivel_otico", label: "Nível Ótico" },
  { value: "drone", label: "Drone" },
  { value: "scanner_3d", label: "Scanner 3D" },
  { value: "outros", label: "Outros" },
];

const EQ_STATUSES = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "archived", label: "Arquivado" },
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
  const [calibrations, setCalibrations] = useState<EquipmentCalibration[]>([]);
  const [calLoading, setCalLoading] = useState(false);
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

  // Load calibrations when viewing existing equipment
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
    if (!form.code.trim()) { toast.error("Código é obrigatório"); return; }
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
        toast.success("Equipamento atualizado");
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
        toast.success("Equipamento criado com sucesso");
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar equipamento");
    } finally {
      setLoading(false);
    }
  };

  const calStatusBadge = (cal: EquipmentCalibration) => {
    const today = new Date().toISOString().split("T")[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d30s = d30.toISOString().split("T")[0];
    if (cal.valid_until < today) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>;
    if (cal.valid_until <= d30s) return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Expira em breve</Badge>;
    return <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Válido</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? "Detalhe do Equipamento" : "Novo Equipamento Topográfico"}</DialogTitle></DialogHeader>
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
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Localização Atual</Label><Input value={form.current_location} onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} /></div>
              {isEdit && (
                <div>
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQ_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "A guardar…" : isEdit ? "Guardar Alterações" : "Criar Equipamento"}
            </Button>

            {isEdit && equipment && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Histórico de Calibrações</h3>
                  {calLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar…</p>
                  ) : calibrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem calibrações registadas.</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-xs">Entidade</TableHead>
                          <TableHead className="text-xs">Nº Certificado</TableHead>
                          <TableHead className="text-xs">Emissão</TableHead>
                          <TableHead className="text-xs">Validade</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {calibrations.map(cal => (
                            <TableRow key={cal.id}>
                              <TableCell className="text-sm">{cal.certifying_entity}</TableCell>
                              <TableCell className="text-sm font-mono">{cal.certificate_number || "—"}</TableCell>
                              <TableCell className="text-sm">{cal.issue_date}</TableCell>
                              <TableCell className="text-sm">{cal.valid_until}</TableCell>
                              <TableCell>{calStatusBadge(cal)}</TableCell>
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

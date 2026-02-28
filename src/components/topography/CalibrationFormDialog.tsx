import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calibrationService } from "@/lib/services/topographyService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  equipmentId: string | null;
  onSuccess: () => void;
}

export function CalibrationFormDialog({ open, onOpenChange, projectId, equipmentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    certifying_entity: "",
    certificate_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    valid_until: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!equipmentId) { toast.error("Equipamento não selecionado"); return; }
    if (!form.certifying_entity.trim()) { toast.error("Entidade certificadora é obrigatória"); return; }
    if (!form.valid_until) { toast.error("Data de validade é obrigatória"); return; }
    setLoading(true);
    try {
      await calibrationService.create({
        equipment_id: equipmentId,
        project_id: projectId,
        certifying_entity: form.certifying_entity.trim(),
        certificate_number: form.certificate_number || null,
        issue_date: form.issue_date,
        valid_until: form.valid_until,
        notes: form.notes || null,
      });
      toast.success("Calibração registada com sucesso");
      setForm({ certifying_entity: "", certificate_number: "", issue_date: new Date().toISOString().split("T")[0], valid_until: "", notes: "" });
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Erro ao registar calibração");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registar Calibração</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div><Label>Entidade Certificadora *</Label><Input value={form.certifying_entity} onChange={e => setForm(f => ({ ...f, certifying_entity: e.target.value }))} placeholder="Ex: ISQ, CATIM" /></div>
          <div><Label>Nº Certificado</Label><Input value={form.certificate_number} onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data Emissão *</Label><Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
            <div><Label>Data Validade *</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
          </div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "A guardar…" : "Registar Calibração"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

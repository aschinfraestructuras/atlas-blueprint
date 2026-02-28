import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { topographyRequestService } from "@/lib/services/topographyService";
import { toast } from "sonner";

const REQUEST_TYPES = [
  { value: "implantacao", label: "Implantação" },
  { value: "levantamento", label: "Levantamento" },
  { value: "controlo", label: "Controlo" },
  { value: "verificacao", label: "Verificação" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function RequestFormDialog({ open, onOpenChange, projectId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    request_type: "implantacao",
    description: "",
    zone: "",
    request_date: new Date().toISOString().split("T")[0],
    priority: "normal",
    responsible: "",
  });

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error("Descrição é obrigatória"); return; }
    setLoading(true);
    try {
      await topographyRequestService.create({
        project_id: projectId,
        request_type: form.request_type,
        description: form.description.trim(),
        zone: form.zone || null,
        request_date: form.request_date,
        priority: form.priority,
        responsible: form.responsible || null,
      });
      toast.success("Pedido criado com sucesso");
      setForm({ request_type: "implantacao", description: "", zone: "", request_date: new Date().toISOString().split("T")[0], priority: "normal", responsible: "" });
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Pedido de Topografia</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Descrição *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Zona</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ex: PK 12+500" /></div>
            <div><Label>Data</Label><Input type="date" value={form.request_date} onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))} /></div>
          </div>
          <div><Label>Responsável</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "A guardar…" : "Criar Pedido"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

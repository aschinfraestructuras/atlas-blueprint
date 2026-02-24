import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supplierService } from "@/lib/services/supplierService";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  supplierId: string;
  onSuccess: () => void;
}

export function AddMaterialDialog({ open, onOpenChange, projectId, supplierId, onSuccess }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [leadTime, setLeadTime] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await supplierService.addMaterial({
        project_id: projectId,
        supplier_id: supplierId,
        material_name: name.trim(),
        is_primary: isPrimary,
        lead_time_days: leadTime ? parseInt(leadTime) : undefined,
        unit_price: unitPrice ? parseFloat(unitPrice) : undefined,
        currency: currency || "EUR",
      });
      toast({ title: t("suppliers.toast.materialAdded", { defaultValue: "Material adicionado." }) });
      setName(""); setIsPrimary(false); setLeadTime(""); setUnitPrice("");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: t("suppliers.toast.error"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{t("suppliers.detail.addMaterial", { defaultValue: "Adicionar Material" })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("suppliers.detail.materialName")}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("suppliers.detail.materialNamePlaceholder", { defaultValue: "ex: Betão C30/37" })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("suppliers.detail.leadTime")}</Label>
              <Input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} placeholder="ex: 7" />
            </div>
            <div>
              <Label className="text-xs">{t("suppliers.detail.unitPrice")}</Label>
              <Input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="ex: 85.00" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="primary" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
            <Label htmlFor="primary" className="text-xs cursor-pointer">{t("suppliers.detail.primary")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

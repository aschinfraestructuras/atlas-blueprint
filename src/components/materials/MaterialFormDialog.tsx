import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { materialService, type Material, type MaterialInput } from "@/lib/services/materialService";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  "betao", "aco", "solos", "agregado", "mbc", "pintura",
  "geossintetico", "soldadura", "tubagem", "prefabricado", "outro",
];

const UNITS = ["m3", "t", "m2", "m", "u", "kg", "l"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  onSuccess: () => void;
}

export function MaterialFormDialog({ open, onOpenChange, material, onSuccess }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const isEdit = !!material;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("betao");
  const [subcategory, setSubcategory] = useState("");
  const [specification, setSpecification] = useState("");
  const [unit, setUnit] = useState("");
  const [normativeRefs, setNormativeRefs] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (material) {
      setName(material.name);
      setCategory(material.category);
      setSubcategory(material.subcategory ?? "");
      setSpecification(material.specification ?? "");
      setUnit(material.unit ?? "");
      setNormativeRefs(material.normative_refs ?? "");
      setAcceptanceCriteria(material.acceptance_criteria ?? "");
    } else {
      setName(""); setCategory("betao"); setSubcategory("");
      setSpecification(""); setUnit(""); setNormativeRefs(""); setAcceptanceCriteria("");
    }
  }, [material, open]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !name.trim() || !category) return;
    setSaving(true);
    try {
      if (isEdit && material) {
        await materialService.update(material.id, activeProject.id, {
          name: name.trim(),
          category,
          subcategory: subcategory || undefined,
          specification: specification || undefined,
          unit: unit || undefined,
          normative_refs: normativeRefs || undefined,
          acceptance_criteria: acceptanceCriteria || undefined,
        });
        toast({ title: t("materials.toast.updated") });
      } else {
        await materialService.create({
          project_id: activeProject.id,
          name: name.trim(),
          category,
          subcategory: subcategory || undefined,
          specification: specification || undefined,
          unit: unit || undefined,
          normative_refs: normativeRefs || undefined,
          acceptance_criteria: acceptanceCriteria || undefined,
        });
        toast({ title: t("materials.toast.created") });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: t("materials.toast.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("materials.form.titleEdit") : t("materials.form.titleCreate")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>{t("materials.form.name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("materials.form.namePlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("materials.form.category")} *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{t(`materials.categories.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("materials.form.subcategory")}</Label>
              <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder={t("materials.form.subcategoryPlaceholder")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("materials.form.specification")}</Label>
              <Input value={specification} onChange={e => setSpecification(e.target.value)} placeholder={t("materials.form.specificationPlaceholder")} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("materials.form.unit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder={t("materials.form.unitPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("materials.form.normativeRefs")}</Label>
            <Textarea value={normativeRefs} onChange={e => setNormativeRefs(e.target.value)} placeholder={t("materials.form.normativeRefsPlaceholder")} rows={2} />
          </div>

          <div className="grid gap-1.5">
            <Label>{t("materials.form.acceptanceCriteria")}</Label>
            <Textarea value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} placeholder={t("materials.form.acceptanceCriteriaPlaceholder")} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? t("common.loading") : isEdit ? t("common.save") : t("materials.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

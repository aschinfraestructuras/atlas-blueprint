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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  "betao", "aco", "solos", "agregado", "mbc", "pintura",
  "geossintetico", "soldadura", "tubagem", "prefabricado", "outro",
];

const UNITS = ["m3", "t", "m2", "m", "u", "kg", "l"];

const PAME_PRIORITIES = ["critica", "alta", "normal", "baixa"];

const DISCIPLINAS = [
  "geral", "estruturas", "geotecnia", "hidraulica", "estradas",
  "ambiente", "seguranca", "eletrica", "mecanica", "outro",
];

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

  // Identification fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("betao");
  const [subcategory, setSubcategory] = useState("");
  const [specification, setSpecification] = useState("");
  const [unit, setUnit] = useState("");
  const [normativeRefs, setNormativeRefs] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  // PAME fields
  const [pameCode, setPameCode] = useState("");
  const [pameStatus, setPameStatus] = useState("pending");
  const [pameDisciplina, setPameDisciplina] = useState("");
  const [pamePrioridade, setPamePrioridade] = useState("");
  const [pameNorma, setPameNorma] = useState("");
  const [pameDocsReq, setPameDocsReq] = useState("");
  const [pamePpiRef, setPamePpiRef] = useState("");

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
      setPameCode(material.pame_code ?? "");
      setPameStatus(material.pame_status ?? "pending");
      setPameDisciplina((material as any).pame_disciplina ?? "");
      setPamePrioridade((material as any).pame_prioridade ?? "");
      setPameNorma((material as any).pame_norma ?? "");
      setPameDocsReq((material as any).pame_docs_req ?? "");
      setPamePpiRef((material as any).pame_ppi_ref ?? "");
    } else {
      setName(""); setCategory("betao"); setSubcategory("");
      setSpecification(""); setUnit(""); setNormativeRefs(""); setAcceptanceCriteria("");
      setPameCode(""); setPameStatus("pending"); setPameDisciplina("");
      setPamePrioridade(""); setPameNorma(""); setPameDocsReq(""); setPamePpiRef("");
    }
  }, [material, open]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !name.trim() || !category) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        category,
        subcategory: subcategory || undefined,
        specification: specification || undefined,
        unit: unit || undefined,
        normative_refs: normativeRefs || undefined,
        acceptance_criteria: acceptanceCriteria || undefined,
        pame_code: pameCode || undefined,
        pame_status: pameStatus || undefined,
        pame_disciplina: pameDisciplina || undefined,
        pame_prioridade: pamePrioridade || undefined,
        pame_norma: pameNorma || undefined,
        pame_docs_req: pameDocsReq || undefined,
        pame_ppi_ref: pamePpiRef || undefined,
      };

      if (isEdit && material) {
        await materialService.update(material.id, activeProject.id, payload as any);
        toast({ title: t("materials.toast.updated") });
      } else {
        await materialService.create({
          project_id: activeProject.id,
          ...payload,
        } as any);
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

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 py-2">
            {/* ── Section 1: Identification ── */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("materials.form.sectionIdentification")}</p>

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

            <Separator />

            {/* ── Section 2: PAME ── */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">PAME</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.pameCode")}</Label>
                <Input value={pameCode} onChange={e => setPameCode(e.target.value)} placeholder="VF.02" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.pameStatus")}</Label>
                <Select value={pameStatus} onValueChange={setPameStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending", "submitted", "approved", "conditional", "rejected"] as const).map(status => (
                      <SelectItem key={status} value={status}>{t(`materials.pameStatuses.${status}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.form.pameDisciplina")}</Label>
                <Select value={pameDisciplina} onValueChange={setPameDisciplina}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {DISCIPLINAS.map(d => (
                      <SelectItem key={d} value={d}>{t(`documents.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.pamePrioridade")}</Label>
                <Select value={pamePrioridade} onValueChange={setPamePrioridade}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {PAME_PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{t(`materials.pamePriorities.${p}`, { defaultValue: p })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pameNorma")}</Label>
              <Input value={pameNorma} onChange={e => setPameNorma(e.target.value)} placeholder="EN 10080, UNE-EN 206" />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pameDocsReq")}</Label>
              <Textarea value={pameDocsReq} onChange={e => setPameDocsReq(e.target.value)} placeholder={t("materials.form.pameDocsReqPlaceholder")} rows={2} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pamePpiRef")}</Label>
              <Input value={pamePpiRef} onChange={e => setPamePpiRef(e.target.value)} placeholder="PPI-001" />
            </div>
          </div>
        </ScrollArea>

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

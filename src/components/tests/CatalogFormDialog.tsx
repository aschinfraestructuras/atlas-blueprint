import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { testService, TEST_DISCIPLINES } from "@/lib/services/testService";
import type { TestCatalogEntry, TestCatalogInput } from "@/lib/services/testService";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { withOtherRefinement } from "@/components/ui/select-with-other.utils";

const schema = (t: (k: string) => string) =>
  z.object({
    code:               z.string().min(1, t("tests.catalog.form.validation.codeRequired")).toUpperCase(),
    name:               z.string().min(1, t("tests.catalog.form.validation.nameRequired")),
    disciplina:         z.string().min(1),
    disciplina_outro:   z.string().optional().or(z.literal("")),
    material:           z.string().optional().or(z.literal("")),
    material_outro:     z.string().optional().or(z.literal("")),
    laboratorio:        z.string().optional().or(z.literal("")),
    laboratorio_outro:  z.string().optional().or(z.literal("")),
    standard:           z.string().optional().or(z.literal("")),
    frequency:          z.string().optional().or(z.literal("")),
    acceptance_criteria:z.string().optional().or(z.literal("")),
    description:        z.string().optional().or(z.literal("")),
    unit:               z.string().optional().or(z.literal("")),
  }).superRefine((val, ctx) => {
    withOtherRefinement(val, ctx, "disciplina", "disciplina_outro", t("ppi.templates.validation.disciplinaOutroRequired"));
    withOtherRefinement(val, ctx, "material", "material_outro", t("nc.form.validation.categoryOutroRequired"), "outros");
    withOtherRefinement(val, ctx, "laboratorio", "laboratorio_outro", t("nc.form.validation.categoryOutroRequired"), "outros");
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry?: TestCatalogEntry | null;
  onSuccess: () => void;
}

export function CatalogFormDialog({ open, onOpenChange, entry, onSuccess }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const [standards, setStandards]   = useState<string[]>([]);
  const [stdInput, setStdInput]     = useState("");
  const isEdit = !!entry;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      code: "", name: "", disciplina: "geral", disciplina_outro: "",
      material: "", material_outro: "", laboratorio: "", laboratorio_outro: "",
      standard: "", frequency: "", acceptance_criteria: "", description: "", unit: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(entry ? {
        code:               entry.code,
        name:               entry.name,
        disciplina:         entry.disciplina ?? "geral",
        disciplina_outro:   entry.disciplina_outro ?? "",
        material:           entry.material ?? "",
        material_outro:     entry.material_outro ?? "",
        laboratorio:        entry.laboratorio ?? "",
        laboratorio_outro:  entry.laboratorio_outro ?? "",
        standard:           entry.standard ?? "",
        frequency:          entry.frequency ?? "",
        acceptance_criteria:entry.acceptance_criteria ?? "",
        description:        entry.description ?? "",
        unit:               entry.unit ?? "",
      } : {
        code: "", name: "", disciplina: "geral", disciplina_outro: "",
        material: "", material_outro: "", laboratorio: "", laboratorio_outro: "",
        standard: "", frequency: "", acceptance_criteria: "", description: "", unit: "",
      });
      setStandards(entry?.standards ?? []);
      setStdInput("");
    }
  }, [open, entry, form]);

  const addStandard = () => {
    const v = stdInput.trim().toUpperCase();
    if (v && !standards.includes(v)) setStandards((p) => [...p, v]);
    setStdInput("");
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeProject) return;
    setSubmitting(true);
    try {
      const input: TestCatalogInput = {
        project_id:          activeProject.id,
        code:                values.code.toUpperCase(),
        name:                values.name,
        disciplina:          values.disciplina,
        disciplina_outro:    values.disciplina === "outros" ? values.disciplina_outro || undefined : undefined,
        material:            values.material || undefined,
        material_outro:      values.material === "outros" ? values.material_outro || undefined : undefined,
        laboratorio:         values.laboratorio || undefined,
        laboratorio_outro:   values.laboratorio === "outros" ? values.laboratorio_outro || undefined : undefined,
        standards,
        standard:            values.standard || undefined,
        frequency:           values.frequency || undefined,
        acceptance_criteria: values.acceptance_criteria || undefined,
        description:         values.description || undefined,
        unit:                values.unit || undefined,
      };
      if (isEdit && entry) {
        await testService.updateCatalogEntry(entry.id, activeProject.id, input);
        toast({ title: t("tests.catalog.toast.updated") });
      } else {
        await testService.createCatalogEntry(input);
        toast({ title: t("tests.catalog.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("[CatalogFormDialog] submit error:", err);
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const disciplina = form.watch("disciplina");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("tests.catalog.form.titleEdit") : t("tests.catalog.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Code + Name */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.catalog.form.code")}</FormLabel>
                  <FormControl>
                    <Input placeholder="TST-SOIL-DENS" {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="font-mono text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.catalog.form.unit")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="kN/m², %, mm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.catalog.form.name")}</FormLabel>
                <FormControl><Input placeholder={t("tests.catalog.form.namePlaceholder")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Disciplina */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="disciplina" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.catalog.form.disciplina")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TEST_DISCIPLINES.map((d) => (
                        <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {disciplina === "outros" && (
                <FormField control={form.control} name="disciplina_outro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("tests.catalog.form.disciplinaOutro")}</FormLabel>
                    <FormControl><Input placeholder={t("tests.catalog.form.disciplinaOutroPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {/* Material + Lab */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="material" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.catalog.form.material")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="ex: Areia, Betão C30, AC16" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="laboratorio" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.catalog.form.laboratorio")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="ex: Lab Central, Entidade X" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Normas */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("tests.catalog.form.standards")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={stdInput}
                  onChange={(e) => setStdInput(e.target.value.toUpperCase())}
                  placeholder="ex: EN 13286-2"
                  className="font-mono text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStandard(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addStandard}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {standards.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {standards.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
                      {s}
                      <button type="button" onClick={() => setStandards((p) => p.filter((x) => x !== s))}
                        className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Frequência */}
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.catalog.form.frequency")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <FormControl><Input placeholder="ex: 1 por cada 500m³, cada 500m lineares" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Critérios */}
            <FormField control={form.control} name="acceptance_criteria" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.catalog.form.acceptanceCriteria")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder={t("tests.catalog.form.acceptanceCriteriaPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Descrição */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.description")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder={t("tests.catalog.form.descriptionPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("tests.catalog.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

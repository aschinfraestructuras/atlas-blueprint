import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import {
  ppiService,
  PPI_DISCIPLINAS,
  type PpiTemplate,
  type PpiTemplateItem,
} from "@/lib/services/ppiService";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, AlertCircle, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─── Schema ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  check_code:          z.string().min(1),
  label:               z.string().min(1),
  method:              z.string().optional(),
  acceptance_criteria: z.string().optional(),
  required:            z.boolean().default(true),
  evidence_required:   z.boolean().default(false),
});

const makeSchema = (t: (k: string) => string) =>
  z.object({
    code:             z.string().min(1, t("ppi.templates.validation.codeRequired")),
    title:            z.string().min(1, t("ppi.templates.validation.titleRequired")),
    disciplina:       z.string().min(1, t("ppi.templates.validation.disciplinaRequired")),
    disciplina_outro: z.string().optional(),
    description:      z.string().optional(),
    items:            z.array(itemSchema),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: PpiTemplate | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PPITemplateFormDialog({ open, onOpenChange, template, onSuccess }: Props) {
  const { t }             = useTranslation();
  const { user }          = useAuth();
  const { activeProject } = useProject();
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const isEdit = !!template;

  const schema = makeSchema(t);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "", title: "", disciplina: "geral", disciplina_outro: "", description: "", items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // ── Load template items for edit ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setCodeError(null);
    if (template) {
      form.reset({
        code:             template.code,
        title:            template.title,
        disciplina:       template.disciplina,
        disciplina_outro: (template as any).disciplina_outro ?? "",
        description:      template.description ?? "",
        items:            [],
      });
      setLoadingItems(true);
      ppiService.getTemplate(template.id).then(({ items }) => {
        const mapped = items.map((it: PpiTemplateItem) => ({
          check_code:          it.check_code,
          label:               it.label,
          method:              it.method ?? "",
          acceptance_criteria: it.acceptance_criteria ?? "",
          required:            it.required,
          evidence_required:   it.evidence_required,
        }));
        form.setValue("items", mapped);
      }).finally(() => setLoadingItems(false));
    } else {
      form.reset({ code: "", title: "", disciplina: "geral", disciplina_outro: "", description: "", items: [] });
    }
  }, [open, template, form]);

  function addItem() {
    append({ check_code: "", label: "", method: "", acceptance_criteria: "", required: true, evidence_required: false });
  }

  async function onSubmit(values: FormValues) {
    if (!activeProject || !user) return;
    setCodeError(null);

    // Code uniqueness check (skip if editing same template)
    if (!isEdit || values.code !== template?.code) {
      const { data: existing } = await supabase
        .from("ppi_templates")
        .select("id")
        .eq("project_id", activeProject.id)
        .eq("code", values.code)
        .maybeSingle();
      if (existing) {
        setCodeError(t("ppi.templates.validation.codeUnique"));
        return;
      }
    }

    try {
      let templateId: string;
      if (isEdit && template) {
        await ppiService.updateTemplate(template.id, activeProject.id, {
          title:            values.title,
          disciplina:       values.disciplina as any,
          disciplina_outro: values.disciplina === "outros" ? (values.disciplina_outro || null) : null,
          description:      values.description || null,
        });
        templateId = template.id;
        // Replace items: delete old + re-insert
        await supabase.from("ppi_template_items").delete().eq("template_id", template.id);
      } else {
        const created = await ppiService.createTemplate({
          project_id:       activeProject.id,
          code:             values.code,
          disciplina:       values.disciplina as any,
          disciplina_outro: values.disciplina === "outros" ? (values.disciplina_outro || null) : null,
          title:            values.title,
          description:      values.description || null,
          created_by:       user.id,
        });
        templateId = created.id;
      }

      if (values.items.length > 0) {
        await ppiService.addTemplateItems(
          values.items.map((it, idx) => ({
            template_id:         templateId,
            item_no:             idx + 1,
            check_code:          it.check_code,
            label:               it.label,
            method:              it.method || null,
            acceptance_criteria: it.acceptance_criteria || null,
            required:            it.required,
            evidence_required:   it.evidence_required,
            sort_order:          idx + 1,
          }))
        );
      }

      toast({ title: isEdit ? t("ppi.templates.toast.updated") : t("ppi.templates.toast.created") });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: t("ppi.templates.toast.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("ppi.templates.form.titleEdit") : t("ppi.templates.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Row 1: Code + Disciplina */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("ppi.templates.form.code")} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("ppi.templates.form.codePlaceholder")}
                      className="font-mono"
                      disabled={isEdit}
                      {...field}
                    />
                  </FormControl>
                  {codeError && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> {codeError}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="disciplina" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("ppi.templates.form.disciplina")} <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("ppi.templates.form.disciplina")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PPI_DISCIPLINAS.map((code) => (
                        <SelectItem key={code} value={code}>
                          {t(`ppi.disciplinas.${code}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* disciplina_outro — shown only when disciplina = 'outros' */}
            {form.watch("disciplina") === "outros" && (
              <FormField control={form.control} name="disciplina_outro" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("ppi.templates.form.disciplinaOutro")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("ppi.templates.form.disciplinaOutroPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Title */}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("ppi.templates.form.title")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t("ppi.templates.form.titlePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ppi.templates.form.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder={t("ppi.templates.form.descriptionPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Items section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {t("ppi.templates.items.label")} ({fields.length})
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-7 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t("ppi.templates.addItems")}
                </Button>
              </div>

              {loadingItems ? (
                <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
              ) : fields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  {t("ppi.templates.noItems")}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-8 text-xs">#</TableHead>
                        <TableHead className="text-xs">{t("ppi.templates.items.checkCode")}</TableHead>
                        <TableHead className="text-xs">{t("ppi.templates.items.label")}</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">{t("ppi.templates.items.method")}</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">{t("ppi.templates.items.criteria")}</TableHead>
                        <TableHead className="text-xs text-center w-20">{t("ppi.templates.items.required")}</TableHead>
                        <TableHead className="text-xs text-center w-20">{t("ppi.templates.items.evidenceRequired")}</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => (
                        <TableRow key={field.id}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                          <TableCell>
                            <Input
                              className="h-7 text-xs font-mono w-28"
                              placeholder="VISUAL_OK"
                              {...form.register(`items.${idx}.check_code`)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-7 text-xs min-w-[160px]"
                              placeholder={t("ppi.templates.items.label")}
                              {...form.register(`items.${idx}.label`)}
                            />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Input
                              className="h-7 text-xs w-28"
                              placeholder={t("ppi.templates.items.method")}
                              {...form.register(`items.${idx}.method`)}
                            />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Input
                              className="h-7 text-xs w-32"
                              placeholder={t("ppi.templates.items.criteria")}
                              {...form.register(`items.${idx}.acceptance_criteria`)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={form.watch(`items.${idx}.required`)}
                              onCheckedChange={(v) => form.setValue(`items.${idx}.required`, !!v)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={form.watch(`items.${idx}.evidence_required`)}
                              onCheckedChange={(v) => form.setValue(`items.${idx}.evidence_required`, !!v)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isSubmitting
                  ? t("ppi.templates.form.saving")
                  : isEdit ? t("ppi.templates.form.saveBtn") : t("ppi.templates.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

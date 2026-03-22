import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import {
  workItemService,
  WORK_ITEM_STATUS_OPTIONS,
  type WorkItem,
  type WorkItemStatus,
} from "@/lib/services/workItemService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithOther } from "@/components/ui/select-with-other";
import { withOtherRefinement } from "@/components/ui/select-with-other.utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ─── Discipline codes (stable, stored in DB) ──────────────────────────────────

const DISCIPLINE_CODES = [
  "geral", "estruturas", "via", "catenaria", "sinalizacao",
  "telecomunicacoes", "drenagem", "geotecnia", "terraplenagem",
  "pavimentacao", "outros",
] as const;

// ─── Schema factory ───────────────────────────────────────────────────────────

const makeSchema = (t: (k: string) => string) =>
  z
    .object({
      sector:          z.string().min(1, t("workItems.form.validation.sectorRequired")),
      disciplina:      z.string().min(1, t("workItems.form.validation.disciplineRequired")),
      disciplina_outro:z.string().optional(),
      lote:            z.string().optional(),
      elemento:        z.string().optional(),
      parte:           z.string().optional(),
      pk_inicio:       z.coerce.number().nullable().optional(),
      pk_fim:          z.coerce.number().nullable().optional(),
      status:          z.string().min(1),
    })
    .superRefine((val, ctx) => {
      withOtherRefinement(
        val, ctx,
        "disciplina", "disciplina_outro",
        t("workItems.form.validation.disciplinaOutroRequired"),
      );
      if (val.pk_inicio != null && val.pk_fim != null && val.pk_fim < val.pk_inicio) {
        ctx.addIssue({
          path: ["pk_fim"],
          code: z.ZodIssueCode.custom,
          message: t("workItems.form.validation.pkEndInvalid"),
        });
      }
    });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: WorkItem | null;
  /** Pre-filled clone for duplication (no id) */
  duplicateFrom?: WorkItem | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkItemFormDialog({ open, onOpenChange, item, duplicateFrom, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();

  const schema = makeSchema(t);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sector: "", disciplina: "geral", disciplina_outro: "", lote: "",
      elemento: "", parte: "", pk_inicio: undefined, pk_fim: undefined, status: "planned",
    },
  });

  useEffect(() => {
    if (!open) return;
    const source = item || duplicateFrom;
    form.reset(
      source
        ? {
            sector:          source.sector ?? "",
            disciplina:      (source.disciplina as string) ?? "geral",
            disciplina_outro:(source as any).disciplina_outro ?? "",
            lote:            source.lote      ?? "",
            elemento:        duplicateFrom ? "" : (source.elemento ?? ""),
            parte:           duplicateFrom ? "" : (source.parte ?? ""),
            pk_inicio:       duplicateFrom ? undefined : (source.pk_inicio ?? undefined),
            pk_fim:          duplicateFrom ? undefined : (source.pk_fim ?? undefined),
            status:          duplicateFrom ? "planned" : (source.status ?? "planned"),
          }
        : {
            sector: "", disciplina: "geral", disciplina_outro: "", lote: "",
            elemento: "", parte: "", pk_inicio: undefined, pk_fim: undefined, status: "planned",
          },
    );
  }, [open, item, duplicateFrom, form]);

  const isEdit = !!item && !duplicateFrom;
  const isDuplicate = !!duplicateFrom;

  async function onSubmit(values: FormValues) {
    if (!activeProject || !user) return;
    try {
      const payload = {
        sector:          values.sector,
        disciplina:      values.disciplina,
        disciplina_outro:values.disciplina === "outros" ? (values.disciplina_outro?.trim() || null) : null,
        lote:            values.lote      || undefined,
        elemento:        values.elemento  || undefined,
        parte:           values.parte     || undefined,
        pk_inicio:       values.pk_inicio ?? null,
        pk_fim:          values.pk_fim    ?? null,
        status:          values.status as WorkItemStatus,
      };

      if (isEdit && item) {
        await workItemService.update(item.id, activeProject.id, payload);
        toast({ title: t("workItems.toast.updated") });
      } else {
        await workItemService.create({ project_id: activeProject.id, ...payload, created_by: user.id });
        if (!isDuplicate) {
          toast({ title: t("workItems.toast.created") });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      console.error("[WorkItemFormDialog] error:", err);
      toast({
        title: info.title,
        description: info.description ?? info.raw,
        variant: "destructive",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>
            {isDuplicate
              ? t("workItems.form.titleDuplicate")
              : isEdit
                ? t("workItems.form.titleEdit")
                : t("workItems.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Row 1: Sector + Disciplina */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField control={form.control} name="sector" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("workItems.form.sector")} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("workItems.form.sectorPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="disciplina" render={({ field }) => (
                <SelectWithOther
                  label={t("workItems.form.discipline")}
                  required
                  options={DISCIPLINE_CODES.map((c) => ({
                    value: c,
                    label: t(`workItems.disciplines.${c}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  otherFieldName="disciplina_outro"
                  control={form.control}
                  otherLabel={t("workItems.form.disciplinaOutro")}
                  otherPlaceholder={t("workItems.form.disciplinaOutroPlaceholder")}
                />
              )} />
            </div>

            {/* Row 2: Lote + Elemento */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="lote" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.lote")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("workItems.form.lotePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="elemento" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.element")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("workItems.form.elementPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Parte + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="parte" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.parte")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("workItems.form.partePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("workItems.form.status")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_ITEM_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {t(`workItems.status.${s.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 4: PK Início + PK Fim */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pk_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.pkStart")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t("workItems.form.pkPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pk_fim" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workItems.form.pkEnd")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t("workItems.form.pkEndPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isSubmitting
                  ? t("workItems.form.saving")
                  : isDuplicate
                    ? t("workItems.form.duplicateBtn")
                    : isEdit
                      ? t("workItems.form.saveBtn")
                      : t("workItems.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

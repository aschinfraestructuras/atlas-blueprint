import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { planService, type Plan } from "@/lib/services/planService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/lib/utils/toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const PLAN_TYPES = [
  "MS", "PlanEsc", "PlanBet", "PlanMont", "PlanTraf", "PlanSeg",
  "PlanTopo", "PlanEns", "PlanInsp", "PlanAmb", "PlanQual",
  "Schedule", "Drawing", "Other",
] as const;
const STATUSES = ["draft", "under_review", "approved", "obsolete", "archived"] as const;
const DISCIPLINES = [
  "geral", "terras", "betao", "ferrovia", "catenaria", "st",
  "drenagem", "estruturas", "telecom", "edificacoes", "ambiente",
  "via", "geotecnia", "outros",
] as const;

const schema = z.object({
  plan_type: z.enum(PLAN_TYPES),
  title: z.string().min(1),
  code: z.string().optional().or(z.literal("")),
  discipline: z.string().optional().or(z.literal("")),
  responsible: z.string().optional().or(z.literal("")),
  approval_date: z.string().optional().or(z.literal("")),
  revision: z.string().optional(),
  doc_reference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(STATUSES).default("draft"),
  file_url: z.string().url({ message: "URL inválido" }).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan?: Plan | null;
  onSuccess: () => void;
}

export function PlanFormDialog({ open, onOpenChange, plan, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const isEdit = !!plan;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plan_type: "MS", title: "", code: "", discipline: "", responsible: "",
      approval_date: "", revision: "0", doc_reference: "", notes: "",
      status: "draft", file_url: "",
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        plan_type: (plan.plan_type as typeof PLAN_TYPES[number]) ?? "MS",
        title: plan.title,
        code: plan.code ?? "",
        discipline: plan.discipline ?? "",
        responsible: plan.responsible ?? "",
        approval_date: plan.approval_date ?? "",
        revision: plan.revision ?? "0",
        doc_reference: plan.doc_reference ?? "",
        notes: plan.notes ?? "",
        status: (plan.status as typeof STATUSES[number]) ?? "draft",
        file_url: plan.file_url ?? "",
      });
    } else {
      form.reset({
        plan_type: "MS", title: "", code: "", discipline: "", responsible: "",
        approval_date: "", revision: "0", doc_reference: "", notes: "",
        status: "draft", file_url: "",
      });
    }
  }, [plan, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      const payload = {
        plan_type: values.plan_type,
        title: values.title,
        code: values.code || undefined,
        discipline: values.discipline || undefined,
        responsible: values.responsible || undefined,
        approval_date: values.approval_date || undefined,
        revision: values.revision,
        doc_reference: values.doc_reference || undefined,
        notes: values.notes || undefined,
        status: values.status,
        file_url: values.file_url || undefined,
      };
      if (plan) {
        await planService.update(plan.id, activeProject.id, payload);
        toast({ title: t("plans.toast.updated") });
      } else {
        await planService.create({
          project_id: activeProject.id,
          created_by: user.id,
          ...payload,
        });
        toast({ title: t("plans.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("plans.form.titleEdit") : t("plans.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="plan_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.planType")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PLAN_TYPES.map((pt) => (
                            <SelectItem key={pt} value={pt}>{t(`plans.types.${pt}`, { defaultValue: pt })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.code")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: MS-PF17A-BET-001" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("plans.form.title")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("plans.form.titlePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="discipline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.discipline")}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.optional")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {DISCIPLINES.map((d) => (
                            <SelectItem key={d} value={d}>{t(`plans.disciplines.${d}`, { defaultValue: d })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="responsible" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.responsible")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Pedro Martins" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="approval_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.approvalDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="revision" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.revision")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Rev.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="doc_reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.docReference")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: PG-04 / ADIF-MIGCO-SOE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(`plans.status.${s}`, { defaultValue: s })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("plans.form.notes")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("plans.form.notesPlaceholder")} className="min-h-[60px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="file_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("plans.form.fileUrl")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>

            {isEdit && plan && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="plans"
                  entityId={plan.id}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="plan-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.loading") : isEdit ? t("common.save") : t("plans.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

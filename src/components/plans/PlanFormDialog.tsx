import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { planService, type Plan } from "@/lib/services/planService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const PLAN_TYPES = ["PQO", "PIE", "PPI", "ITP", "MethodStatement", "TestPlan", "Schedule"] as const;
const STATUSES = ["draft", "under_review", "approved", "obsolete", "archived"] as const;

const schema = z.object({
  plan_type: z.enum(PLAN_TYPES),
  title: z.string().min(1),
  revision: z.string().optional(),
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
  const { toast } = useToast();
  const isEdit = !!plan;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan_type: "PQO", title: "", revision: "0", status: "draft", file_url: "" },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        plan_type: (plan.plan_type as typeof PLAN_TYPES[number]) ?? "PQO",
        title: plan.title,
        revision: plan.revision ?? "0",
        status: (plan.status as typeof STATUSES[number]) ?? "draft",
        file_url: plan.file_url ?? "",
      });
    } else {
      form.reset({ plan_type: "PQO", title: "", revision: "0", status: "draft", file_url: "" });
    }
  }, [plan, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      if (plan) {
        await planService.update(plan.id, activeProject.id, {
          plan_type: values.plan_type,
          title: values.title,
          revision: values.revision,
          status: values.status,
          file_url: values.file_url || undefined,
        });
        toast({ title: t("plans.toast.updated") });
      } else {
        await planService.create({
          project_id: activeProject.id,
          created_by: user.id,
          plan_type: values.plan_type,
          title: values.title,
          revision: values.revision,
          status: values.status,
          file_url: values.file_url || undefined,
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
                      <FormLabel>{t("plans.form.planType")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PLAN_TYPES.map((pt) => (
                            <SelectItem key={pt} value={pt}>{t(`plans.types.${pt}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                            <SelectItem key={s} value={s}>{t(`plans.status.${s}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("plans.form.title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("plans.form.titlePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="revision" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("plans.form.revision")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: A, 1, 01" {...field} />
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
                </div>
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

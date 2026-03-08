import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { surveyService, type SurveyRecord } from "@/lib/services/surveyService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { useToast } from "@/hooks/use-toast";
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

const STATUSES = ["pending", "validated", "rejected"] as const;
const SURVEY_TYPES = ["implantacao", "levantamento", "controlo_geometrico", "nivelamento", "as_built"] as const;

const schema = z.object({
  area_or_pk: z.string().min(1),
  survey_type: z.string().optional(),
  responsible: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1),
  status: z.enum(STATUSES).default("pending"),
  file_url: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record?: SurveyRecord | null;
  onSuccess: () => void;
}

export function SurveyFormDialog({ open, onOpenChange, record, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const isEdit = !!record;

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { area_or_pk: "", survey_type: "", responsible: "", description: "", date: today, status: "pending", file_url: "" },
  });

  useEffect(() => {
    if (record) {
      form.reset({
        area_or_pk: record.area_or_pk,
        survey_type: "",
        responsible: "",
        description: record.description ?? "",
        date: record.date,
        status: (record.status as typeof STATUSES[number]) ?? "pending",
        file_url: record.file_url ?? "",
      });
    } else {
      form.reset({ area_or_pk: "", survey_type: "", responsible: "", description: "", date: today, status: "pending", file_url: "" });
    }
  }, [record, open, form, today]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      if (record) {
        await surveyService.update(record.id, activeProject.id, {
          area_or_pk: values.area_or_pk,
          description: values.description,
          date: values.date,
          status: values.status,
          file_url: values.file_url || undefined,
        });
        toast({ title: t("survey.toast.updated") });
      } else {
        await surveyService.create({
          project_id: activeProject.id,
          created_by: user.id,
          area_or_pk: values.area_or_pk,
          description: values.description,
          date: values.date,
          status: values.status,
          file_url: values.file_url || undefined,
        });
        toast({ title: t("survey.toast.created") });
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
            {isEdit ? t("survey.form.titleEdit") : t("survey.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="survey-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="area_or_pk" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("survey.form.areaPk")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("survey.form.areaPkPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.date")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("survey.form.descriptionPlaceholder")} rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(`survey.status.${s}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="file_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("survey.form.fileUrl")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input placeholder="https://…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </form>
            </Form>

            {isEdit && record && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="survey_records"
                  entityId={record.id}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="survey-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.loading") : isEdit ? t("common.save") : t("survey.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

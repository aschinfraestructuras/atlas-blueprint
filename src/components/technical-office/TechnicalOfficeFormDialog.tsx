import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { technicalOfficeService, type TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";
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

const TYPES = ["RFI", "Submittal", "Clarification"] as const;
const STATUSES = ["open", "in_progress", "closed", "cancelled"] as const;

const schema = z.object({
  type: z.enum(TYPES),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(STATUSES).default("open"),
  due_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: TechnicalOfficeItem | null;
  onSuccess: () => void;
}

export function TechnicalOfficeFormDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "RFI", title: "", description: "", status: "open", due_date: "" },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        type: (item.type as typeof TYPES[number]) ?? "RFI",
        title: item.title,
        description: item.description ?? "",
        status: (item.status as typeof STATUSES[number]) ?? "open",
        due_date: item.due_date ?? "",
      });
    } else {
      form.reset({ type: "RFI", title: "", description: "", status: "open", due_date: "" });
    }
  }, [item, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      if (item) {
        await technicalOfficeService.update(item.id, activeProject.id, {
          type: values.type,
          title: values.title,
          description: values.description,
          status: values.status,
          due_date: values.due_date || undefined,
        });
        toast({ title: t("technicalOffice.toast.updated") });
      } else {
        await technicalOfficeService.create({
          project_id: activeProject.id,
          created_by: user.id,
          type: values.type,
          title: values.title,
          description: values.description,
          status: values.status,
          due_date: values.due_date || undefined,
        });
        toast({ title: t("technicalOffice.toast.created") });
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
            {item ? t("technicalOffice.form.titleEdit") : t("technicalOffice.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("technicalOffice.form.type")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TYPES.map((tp) => (
                        <SelectItem key={tp} value={tp}>{t(`technicalOffice.types.${tp}`)}</SelectItem>
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
                        <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("technicalOffice.form.title")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("technicalOffice.form.titlePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.description")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                <FormControl>
                  <Textarea placeholder={t("technicalOffice.form.descriptionPlaceholder")} rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("technicalOffice.form.dueDate")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("common.loading") : item ? t("common.save") : t("technicalOffice.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supplierService } from "@/lib/services/supplierService";
import type { Supplier } from "@/lib/services/supplierService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const schema = (t: (k: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("suppliers.form.validation.nameRequired")).max(200),
    category: z.string().trim().max(100).optional().or(z.literal("")),
    nif_cif: z.string().trim().max(30).optional().or(z.literal("")),
    approval_status: z.string().min(1),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSuccess: () => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSuccess }: SupplierFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!supplier;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: { name: "", category: "", nif_cif: "", approval_status: "pending" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        supplier
          ? { name: supplier.name, category: supplier.category ?? "", nif_cif: supplier.nif_cif ?? "", approval_status: supplier.approval_status }
          : { name: "", category: "", nif_cif: "", approval_status: "pending" }
      );
    }
  }, [open, supplier, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);
    try {
      if (isEdit && supplier) {
        await supplierService.update(supplier.id, activeProject.id, {
          name: values.name,
          category: values.category || undefined,
          nif_cif: values.nif_cif || undefined,
          approval_status: values.approval_status,
        });
        toast({ title: t("suppliers.toast.updated") });
      } else {
        await supplierService.create({
          project_id: activeProject.id,
          name: values.name,
          category: values.category || undefined,
          nif_cif: values.nif_cif || undefined,
          approval_status: values.approval_status,
          created_by: user.id,
        });
        toast({ title: t("suppliers.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
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

  const CATEGORIES = ["materials", "equipment", "services", "subcontractor", "laboratory", "other"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("suppliers.form.titleEdit") : t("suppliers.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("suppliers.form.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("suppliers.form.namePlaceholder")} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("suppliers.form.category")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("suppliers.form.categoryPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {t(`suppliers.categories.${cat}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approval_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers.table.approvalStatus")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t("suppliers.approvalStatus.pending")}</SelectItem>
                        <SelectItem value="approved">{t("suppliers.approvalStatus.approved")}</SelectItem>
                        <SelectItem value="conditional">{t("suppliers.approvalStatus.conditional")}</SelectItem>
                        <SelectItem value="rejected">{t("suppliers.approvalStatus.rejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nif_cif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("suppliers.form.nifCif")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("suppliers.form.nifCifPlaceholder")} className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("suppliers.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

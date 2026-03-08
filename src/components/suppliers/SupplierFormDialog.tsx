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
import { SelectWithOther, withOtherRefinement } from "@/components/ui/select-with-other";
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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const schema = (t: (k: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("suppliers.form.validation.nameRequired")).max(200),
    category: z.string().trim().max(100).optional().or(z.literal("")),
    category_outro: z.string().trim().max(100).optional().or(z.literal("")),
    nif_cif: z.string().trim().max(30).optional().or(z.literal("")),
    country: z.string().trim().max(80).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    contact_name: z.string().trim().max(120).optional().or(z.literal("")),
    contact_email: z.string().trim().max(120).optional().or(z.literal("")),
    contact_phone: z.string().trim().max(30).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    qualification_status: z.string().min(1),
    status: z.string().min(1),
  }).superRefine((val, ctx) => {
    withOtherRefinement(val, ctx, "category", "category_outro", t("suppliers.form.validation.categoryOutroRequired"), "other");
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSuccess: () => void;
}

const CATEGORIES = ["materials", "equipment", "services", "subcontractor", "laboratory", "other"];

export function SupplierFormDialog({ open, onOpenChange, supplier, onSuccess }: SupplierFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!supplier;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      name: "", category: "", nif_cif: "", country: "", address: "",
      contact_name: "", contact_email: "", contact_phone: "", notes: "",
      qualification_status: "pending", status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        supplier
          ? {
              name: supplier.name,
              category: supplier.category ?? "",
              nif_cif: supplier.nif_cif ?? "",
              country: supplier.country ?? "",
              address: supplier.address ?? "",
              contact_name: supplier.contact_name ?? "",
              contact_email: supplier.contact_email ?? "",
              contact_phone: supplier.contact_phone ?? "",
              notes: supplier.notes ?? "",
              qualification_status: supplier.qualification_status ?? supplier.approval_status ?? "pending",
              status: supplier.status ?? "active",
            }
          : {
              name: "", category: "", nif_cif: "", country: "", address: "",
              contact_name: "", contact_email: "", contact_phone: "", notes: "",
              qualification_status: "pending", status: "active",
            }
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
          country: values.country || undefined,
          address: values.address || undefined,
          contact_name: values.contact_name || undefined,
          contact_email: values.contact_email || undefined,
          contact_phone: values.contact_phone || undefined,
          notes: values.notes || undefined,
          qualification_status: values.qualification_status,
          approval_status: values.qualification_status,
        });
        toast({ title: t("suppliers.toast.updated") });
      } else {
        await supplierService.create({
          project_id: activeProject.id,
          name: values.name,
          category: values.category || undefined,
          nif_cif: values.nif_cif || undefined,
          country: values.country || undefined,
          address: values.address || undefined,
          contact_name: values.contact_name || undefined,
          contact_email: values.contact_email || undefined,
          contact_phone: values.contact_phone || undefined,
          notes: values.notes || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("suppliers.form.titleEdit") : t("suppliers.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1 pt-1">
            <Form {...form}>
              <form id="supplier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Row 1: Name */}
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers.form.name")}</FormLabel>
                    <FormControl><Input placeholder={t("suppliers.form.namePlaceholder")} autoFocus {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Row 2: Category + NIF */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.category")} <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("suppliers.form.categoryPlaceholder")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{t(`suppliers.categories.${cat}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nif_cif" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.nifCif")} <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input placeholder={t("suppliers.form.nifCifPlaceholder")} className="font-mono" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Row 3: Country + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.country")} <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input placeholder={t("suppliers.form.countryPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="qualification_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.qualificationStatus")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t("suppliers.qualificationStatus.pending")}</SelectItem>
                          <SelectItem value="approved">{t("suppliers.qualificationStatus.approved")}</SelectItem>
                          <SelectItem value="rejected">{t("suppliers.qualificationStatus.rejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Row 4: Address */}
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers.form.address")} <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input placeholder={t("suppliers.form.addressPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Row 5: Contact */}
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="contact_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.contactName")}</FormLabel>
                      <FormControl><Input placeholder={t("suppliers.form.contactNamePlaceholder")} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contact_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.contactEmail")}</FormLabel>
                      <FormControl><Input type="email" placeholder={t("suppliers.form.contactEmailPlaceholder")} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contact_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("suppliers.form.contactPhone")}</FormLabel>
                      <FormControl><Input placeholder={t("suppliers.form.contactPhonePlaceholder")} {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers.form.notes")} <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span></FormLabel>
                    <FormControl><Textarea placeholder={t("suppliers.form.notesPlaceholder")} rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>

            {isEdit && supplier && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel projectId={activeProject.id} entityType="suppliers" entityId={supplier.id} />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>{t("common.cancel")}</Button>
          <Button type="submit" form="supplier-form" disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            {isEdit ? t("common.save") : t("suppliers.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

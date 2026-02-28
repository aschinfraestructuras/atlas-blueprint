import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { subcontractorService, type Subcontractor } from "@/lib/services/subcontractorService";
import { subcontractorDocService, DOC_TYPES, type SubcontractorDocument } from "@/lib/services/subcontractorDocService";
import { useSuppliers } from "@/hooks/useSuppliers";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileCheck } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const STATUSES = ["active", "suspended", "concluded"] as const;
const DOC_STATUSES = ["pending", "valid", "expired"] as const;

const schema = z.object({
  name: z.string().min(1),
  trade: z.string().optional(),
  status: z.enum(STATUSES).default("active"),
  contact_email: z.string().email().optional().or(z.literal("")),
  supplier_id: z.string().optional(),
  contract: z.string().optional(),
  documentation_status: z.enum(DOC_STATUSES).default("pending"),
  performance_score: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subcontractor?: Subcontractor | null;
  onSuccess: () => void;
}

export function SubcontractorFormDialog({ open, onOpenChange, subcontractor, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { data: suppliers } = useSuppliers();
  const isEdit = !!subcontractor;

  const [docs, setDocs] = useState<SubcontractorDocument[]>([]);
  const [newDoc, setNewDoc] = useState({ doc_type: "seguro", title: "", valid_to: "" });
  const [addingDoc, setAddingDoc] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!subcontractor) return;
    try {
      const result = await subcontractorDocService.getBySubcontractor(subcontractor.id);
      setDocs(result);
    } catch { /* swallow */ }
  }, [subcontractor]);

  useEffect(() => { if (isEdit) fetchDocs(); }, [isEdit, fetchDocs]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", trade: "", status: "active", contact_email: "", supplier_id: "", contract: "", documentation_status: "pending", performance_score: "" },
  });

  useEffect(() => {
    if (subcontractor) {
      form.reset({
        name: subcontractor.name,
        trade: subcontractor.trade ?? "",
        status: (subcontractor.status as typeof STATUSES[number]) ?? "active",
        contact_email: subcontractor.contact_email ?? "",
        supplier_id: subcontractor.supplier_id ?? "",
        contract: subcontractor.contract ?? "",
        documentation_status: (subcontractor.documentation_status as typeof DOC_STATUSES[number]) ?? "pending",
        performance_score: subcontractor.performance_score?.toString() ?? "",
      });
    } else {
      form.reset({ name: "", trade: "", status: "active", contact_email: "", supplier_id: "", contract: "", documentation_status: "pending", performance_score: "" });
    }
  }, [subcontractor, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      const supplierIdValue = values.supplier_id || undefined;
      const score = values.performance_score ? parseFloat(values.performance_score) : undefined;
      if (subcontractor) {
        await subcontractorService.update(subcontractor.id, activeProject.id, {
          name: values.name,
          trade: values.trade || undefined,
          status: values.status,
          contact_email: values.contact_email || undefined,
          supplier_id: supplierIdValue,
          contract: values.contract || undefined,
          documentation_status: values.documentation_status,
          performance_score: score,
        });
        toast({ title: t("subcontractors.toast.updated") });
      } else {
        await subcontractorService.create({
          project_id: activeProject.id,
          created_by: user.id,
          name: values.name,
          trade: values.trade || undefined,
          status: values.status,
          contact_email: values.contact_email || undefined,
          supplier_id: supplierIdValue,
          contract: values.contract || undefined,
          documentation_status: values.documentation_status,
          performance_score: score,
        });
        toast({ title: t("subcontractors.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  const handleAddDoc = async () => {
    if (!activeProject || !subcontractor || !newDoc.title.trim()) return;
    setAddingDoc(true);
    try {
      await subcontractorDocService.create({
        project_id: activeProject.id,
        subcontractor_id: subcontractor.id,
        doc_type: newDoc.doc_type,
        title: newDoc.title.trim(),
        valid_to: newDoc.valid_to || undefined,
      });
      sonnerToast.success("Documento adicionado");
      setNewDoc({ doc_type: "seguro", title: "", valid_to: "" });
      fetchDocs();
    } catch (e: any) {
      sonnerToast.error(e.message || "Erro");
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!activeProject) return;
    try {
      await subcontractorDocService.delete(docId, activeProject.id);
      sonnerToast.success("Documento removido");
      fetchDocs();
    } catch { sonnerToast.error("Erro ao remover"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("subcontractors.form.titleEdit") : t("subcontractors.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="sub-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subcontractors.form.name")}</FormLabel>
                    <FormControl><Input placeholder={t("subcontractors.form.namePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="trade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("subcontractors.form.trade")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input placeholder={t("subcontractors.form.tradePlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`subcontractors.status.${s}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subcontractors.form.contactEmail")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input type="email" placeholder="email@empresa.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contract" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input placeholder="Referência do contrato" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="documentation_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Documentação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="valid">Válida</SelectItem>
                          <SelectItem value="expired">Expirada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="performance_score" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score Desempenho <span className="text-muted-foreground text-xs">(0-100)</span></FormLabel>
                      <FormControl><Input type="number" min={0} max={100} placeholder="—" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {suppliers.length > 0 && (
                  <FormField control={form.control} name="supplier_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("subcontractors.form.linkedSupplier")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("subcontractors.form.linkedSupplierPlaceholder")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t("subcontractors.form.noSupplier")}</SelectItem>
                          {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </form>
            </Form>

            {isEdit && subcontractor && activeProject && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Documentação Obrigatória
                    {docs.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{docs.length}</Badge>}
                  </div>

                  {docs.length > 0 && (
                    <ul className="space-y-1.5">
                      {docs.map(d => {
                        const isExpired = d.valid_to && new Date(d.valid_to) < new Date();
                        return (
                          <li key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground">{d.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {DOC_TYPES.find(dt => dt.value === d.doc_type)?.label ?? d.doc_type}
                                {d.valid_to ? ` · Válido até ${d.valid_to}` : ""}
                              </p>
                            </div>
                            {isExpired && <Badge variant="destructive" className="text-[10px]">Expirado</Badge>}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteDoc(d.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                      <Select value={newDoc.doc_type} onValueChange={v => setNewDoc(d => ({ ...d, doc_type: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Título</label>
                      <Input className="h-8 text-xs" value={newDoc.title} onChange={e => setNewDoc(d => ({ ...d, title: e.target.value }))} placeholder="Ex: Seguro RC" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Validade</label>
                      <Input type="date" className="h-8 text-xs" value={newDoc.valid_to} onChange={e => setNewDoc(d => ({ ...d, valid_to: e.target.value }))} />
                    </div>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleAddDoc} disabled={addingDoc || !newDoc.title.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="subcontractors"
                  entityId={subcontractor.id}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="sub-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.loading") : isEdit ? t("common.save") : t("subcontractors.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

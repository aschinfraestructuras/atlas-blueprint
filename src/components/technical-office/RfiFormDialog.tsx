import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useNonConformities } from "@/hooks/useNonConformities";
import { rfiService, type Rfi } from "@/lib/services/rfiService";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const PRIORITIES = ["normal", "urgent", "critical"] as const;
const STATUSES = ["open", "in_review", "answered", "closed"] as const;
const DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "outros"] as const;

function getDefaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

const schema = z.object({
  subject: z.string().min(1, "Assunto obrigatório"),
  description: z.string().optional(),
  zone: z.string().optional(),
  discipline: z.string().optional(),
  ppi_ref: z.string().optional(),
  doc_reference: z.string().optional(),
  priority: z.enum(PRIORITIES).default("normal"),
  status: z.enum(STATUSES).default("open"),
  deadline: z.string().optional(),
  work_item_id: z.string().optional(),
  recipient: z.string().optional(),
  nc_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfi?: Rfi | null;
  onSuccess: () => void;
}

export function RfiFormDialog({ open, onOpenChange, rfi, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { data: workItems } = useWorkItems();
  const { data: ncs } = useNonConformities();
  const isEdit = !!rfi;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "", description: "", zone: "", discipline: "",
      ppi_ref: "", doc_reference: "",
      priority: "normal", status: "open",
      deadline: getDefaultDeadline(), work_item_id: "",
      recipient: "", nc_id: "",
    },
  });

  useEffect(() => {
    if (rfi) {
      form.reset({
        subject: rfi.subject,
        description: rfi.description ?? "",
        zone: rfi.zone ?? "",
        discipline: (rfi as any).discipline ?? "",
        ppi_ref: (rfi as any).ppi_ref ?? "",
        doc_reference: (rfi as any).doc_reference ?? "",
        priority: (rfi.priority as typeof PRIORITIES[number]) ?? "normal",
        status: (rfi.status as typeof STATUSES[number]) ?? "open",
        deadline: rfi.deadline ?? "",
        work_item_id: rfi.work_item_id ?? "",
        recipient: rfi.recipient ?? "",
        nc_id: rfi.nc_id ?? "",
      });
    } else {
      form.reset({
        subject: "", description: "", zone: "", discipline: "",
        ppi_ref: "", doc_reference: "",
        priority: "normal", status: "open",
        deadline: getDefaultDeadline(), work_item_id: "",
        recipient: "", nc_id: "",
      });
    }
  }, [rfi, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      const payload: Record<string, unknown> = {
        subject: values.subject,
        description: values.description ?? null,
        zone: values.zone ?? null,
        discipline: values.discipline ?? null,
        ppi_ref: values.ppi_ref ?? null,
        doc_reference: values.doc_reference ?? null,
        priority: values.priority,
        deadline: values.deadline || null,
        work_item_id: values.work_item_id || null,
        recipient: values.recipient || null,
        nc_id: values.nc_id || null,
      };

      if (rfi) {
        await rfiService.update(rfi.id, activeProject.id, {
          ...payload,
          status: values.status,
        } as any);
        toast({ title: t("technicalOffice.toast.rfiUpdated", { defaultValue: "RFI atualizado" }) });
      } else {
        await rfiService.create({
          project_id: activeProject.id,
          created_by: user.id,
          ...payload,
        } as any);
        toast({ title: t("technicalOffice.toast.rfiCreated", { defaultValue: "RFI criado com sucesso" }) });
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
          <DialogTitle>{isEdit ? t("technicalOffice.rfi.editTitle", { defaultValue: "Editar RFI" }) : t("technicalOffice.rfi.createTitle", { defaultValue: "Novo RFI" })}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="rfi-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("technicalOffice.table.subject", { defaultValue: "Assunto" })} *</FormLabel>
                    <FormControl><Input placeholder={t("technicalOffice.rfi.subjectPlaceholder", { defaultValue: "Assunto do RFI" })} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="discipline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.discipline", { defaultValue: "Disciplina" })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {DISCIPLINES.map(d => (
                          <SelectItem key={d} value={d}>{t(`nc.discipline.${d}`, { defaultValue: d })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Textarea placeholder={t("technicalOffice.rfi.descriptionPlaceholder", { defaultValue: "Detalhes do pedido" })} rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="zone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.rfi.zone", { defaultValue: "PK / Zona" })}</FormLabel>
                      <FormControl><Input placeholder="Ex: PK 12+500" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ppi_ref" render={({ field }) => (
                    <FormItem>
                      <FormLabel>PPI Referência</FormLabel>
                      <FormControl><Input placeholder="Ex: PPI-01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="recipient" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rfis.form.recipient")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input placeholder={t("rfis.form.recipientPlaceholder", { defaultValue: "Nome / entidade a quem se dirige" })} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("technicalOffice.table.priority", { defaultValue: "Prioridade" })}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        {PRIORITIES.map(p => (
                          <div key={p} className="flex items-center gap-2">
                            <RadioGroupItem value={p} id={`rfi-p-${p}`} />
                            <Label htmlFor={`rfi-p-${p}`} className="text-sm">
                              {t(`technicalOffice.priority.${p}`, { defaultValue: p })}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="doc_reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rfis.form.docReference", { defaultValue: "Referência documental" })} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input placeholder="Ex: DES-EST-001 Rev.B" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.rfi.responseDeadline", { defaultValue: "Prazo de resposta" })}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {isEdit && (
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.status")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`, { defaultValue: s })}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                <FormField control={form.control} name="work_item_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("technicalOffice.rfi.workItem", { defaultValue: "Atividade" })} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("technicalOffice.rfi.selectWorkItem", { defaultValue: "Selecionar atividade…" })} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {workItems.map(wi => (
                          <SelectItem key={wi.id} value={wi.id}>
                            {wi.sector} — {wi.disciplina}{wi.elemento ? ` — ${wi.elemento}` : ""}{wi.parte ? ` (${wi.parte})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nc_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rfis.form.ncRelated")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("rfis.form.ncNone")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t("rfis.form.ncNone")}</SelectItem>
                        {ncs.map(nc => (
                          <SelectItem key={nc.id} value={nc.id}>{nc.code ?? "NC"} — {nc.title ?? nc.description?.slice(0, 40)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>

            {isEdit && rfi && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="rfis"
                  entityId={rfi.id}
                />
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="rfi-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.loading") : isEdit ? t("common.save") : t("technicalOffice.rfi.createBtn", { defaultValue: "Criar RFI" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

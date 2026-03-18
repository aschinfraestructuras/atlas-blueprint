import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { useNonConformities } from "@/hooks/useNonConformities";
import { technicalOfficeService, type TechnicalOfficeItem, TECH_OFFICE_TYPES, TECH_OFFICE_STATUSES, PRIORITIES } from "@/lib/services/technicalOfficeService";
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

const schema = z.object({
  type: z.enum(TECH_OFFICE_TYPES),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TECH_OFFICE_STATUSES).default("open"),
  priority: z.enum(PRIORITIES).default("normal"),
  deadline: z.string().optional(),
  recipient: z.string().optional(),
  assigned_to: z.string().optional(),
  work_item_id: z.string().optional(),
  nc_id: z.string().optional(),
  // Transmittal-specific fields (stored in description as structured text)
  emitter_entity: z.string().optional(),
  receiver_entity: z.string().optional(),
  transmittal_reason: z.string().optional(),
  response_status: z.string().optional(),
  docs_sent: z.string().optional(),
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
  const { data: workItems } = useWorkItems();
  const { data: ncs } = useNonConformities();
  const isEdit = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "SUBMITTAL", title: "", description: "", status: "open", priority: "normal", deadline: "", recipient: "", assigned_to: "", work_item_id: "", nc_id: "", emitter_entity: "", receiver_entity: "", transmittal_reason: "", response_status: "", docs_sent: "" },
  });

  const watchedType = form.watch("type");
  const isTransmittal = watchedType === "TRANSMITTAL";

  useEffect(() => {
    if (item) {
      // Parse transmittal metadata from description if exists
      let desc = item.description ?? "";
      let emitter = "", receiver = "", reason = "", respStatus = "", docsSent = "";
      if (item.type === "TRANSMITTAL" && desc.includes("{{TRANSMITTAL_META}}")) {
        const metaPart = desc.split("{{TRANSMITTAL_META}}")[1] ?? "";
        const lines = metaPart.split("\n").filter(Boolean);
        lines.forEach(l => {
          if (l.startsWith("EMITTER:")) emitter = l.replace("EMITTER:", "").trim();
          if (l.startsWith("RECEIVER:")) receiver = l.replace("RECEIVER:", "").trim();
          if (l.startsWith("REASON:")) reason = l.replace("REASON:", "").trim();
          if (l.startsWith("RESPONSE:")) respStatus = l.replace("RESPONSE:", "").trim();
          if (l.startsWith("DOCS:")) docsSent = l.replace("DOCS:", "").trim();
        });
        desc = desc.split("{{TRANSMITTAL_META}}")[0].trim();
      }
      form.reset({
        type: (item.type as typeof TECH_OFFICE_TYPES[number]) ?? "SUBMITTAL",
        title: item.title,
        description: desc,
        status: (item.status as typeof TECH_OFFICE_STATUSES[number]) ?? "open",
        priority: (item.priority as typeof PRIORITIES[number]) ?? "normal",
        deadline: item.deadline ?? item.due_date ?? "",
        recipient: item.recipient ?? "",
        assigned_to: item.assigned_to ?? "",
        work_item_id: item.work_item_id ?? "",
        nc_id: item.nc_id ?? "",
        emitter_entity: emitter,
        receiver_entity: receiver,
        transmittal_reason: reason,
        response_status: respStatus,
        docs_sent: docsSent,
      });
    } else {
      form.reset({ type: "SUBMITTAL", title: "", description: "", status: "open", priority: "normal", deadline: "", recipient: "", assigned_to: "", work_item_id: "", nc_id: "", emitter_entity: "", receiver_entity: "", transmittal_reason: "", response_status: "", docs_sent: "" });
    }
  }, [item, open, form]);

  const buildDescription = (values: FormValues) => {
    let desc = values.description ?? "";
    if (values.type === "TRANSMITTAL") {
      const meta = [
        values.emitter_entity ? `EMITTER:${values.emitter_entity}` : "",
        values.receiver_entity ? `RECEIVER:${values.receiver_entity}` : "",
        values.transmittal_reason ? `REASON:${values.transmittal_reason}` : "",
        values.response_status ? `RESPONSE:${values.response_status}` : "",
        values.docs_sent ? `DOCS:${values.docs_sent}` : "",
      ].filter(Boolean).join("\n");
      if (meta) desc = `${desc}\n{{TRANSMITTAL_META}}\n${meta}`;
    }
    return desc;
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      const description = buildDescription(values);
      if (item) {
        await technicalOfficeService.update(item.id, activeProject.id, {
          type: values.type,
          title: values.title,
          description,
          status: values.status,
          priority: values.priority,
          deadline: values.deadline || undefined,
          recipient: values.recipient || undefined,
          assigned_to: values.assigned_to || undefined,
          work_item_id: values.work_item_id || null,
          nc_id: values.nc_id || null,
        });
        toast({ title: t("technicalOffice.toast.updated") });
      } else {
        await technicalOfficeService.create({
          project_id: activeProject.id,
          created_by: user.id,
          type: values.type,
          title: values.title,
          description,
          status: values.status,
          priority: values.priority,
          deadline: values.deadline || undefined,
          recipient: values.recipient || undefined,
          assigned_to: values.assigned_to || undefined,
          work_item_id: values.work_item_id || null,
          nc_id: values.nc_id || null,
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
            {isEdit ? t("technicalOffice.form.titleEdit") : t("technicalOffice.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="to-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.form.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {TECH_OFFICE_TYPES.map((tp) => (
                            <SelectItem key={tp} value={tp}>{t(`technicalOffice.types.${tp}`, { defaultValue: tp })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.table.priority", { defaultValue: "Prioridade" })}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>{t(`technicalOffice.priority.${p}`, { defaultValue: p })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {isEdit && (
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {TECH_OFFICE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(`technicalOffice.status.${s}`, { defaultValue: s })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

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

                {/* Transmittal-specific fields */}
                {isTransmittal && (
                  <>
                    <Separator className="my-1" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("technicalOffice.transmittal.section", { defaultValue: "Dados do Transmittal" })}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="emitter_entity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("technicalOffice.transmittal.emitter", { defaultValue: "Entidade Emissora" })}</FormLabel>
                          <FormControl><Input placeholder="Ex: ACE ASCH + Cimontubo" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="receiver_entity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("technicalOffice.transmittal.receiver", { defaultValue: "Entidade Recetora" })}</FormLabel>
                          <FormControl><Input placeholder="Ex: Fiscalização / DO" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="transmittal_reason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("technicalOffice.transmittal.reason", { defaultValue: "Motivo do Envio" })}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="approval">{t("technicalOffice.transmittal.reasonApproval", { defaultValue: "Para Aprovação" })}</SelectItem>
                            <SelectItem value="information">{t("technicalOffice.transmittal.reasonInfo", { defaultValue: "Para Informação" })}</SelectItem>
                            <SelectItem value="review">{t("technicalOffice.transmittal.reasonReview", { defaultValue: "Para Revisão" })}</SelectItem>
                            <SelectItem value="record">{t("technicalOffice.transmittal.reasonRecord", { defaultValue: "Para Registo" })}</SelectItem>
                            <SelectItem value="response">{t("technicalOffice.transmittal.reasonResponse", { defaultValue: "Em Resposta a" })}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="docs_sent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("technicalOffice.transmittal.docsSent", { defaultValue: "Documentos Enviados" })}</FormLabel>
                        <FormControl><Textarea placeholder={t("technicalOffice.transmittal.docsSentPlaceholder", { defaultValue: "Lista de documentos, revisões e códigos enviados…" })} rows={2} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {isEdit && (
                      <FormField control={form.control} name="response_status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("technicalOffice.transmittal.responseStatus", { defaultValue: "Resposta" })}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="pending">{t("technicalOffice.transmittal.respPending", { defaultValue: "Pendente" })}</SelectItem>
                              <SelectItem value="approved">{t("technicalOffice.transmittal.respApproved", { defaultValue: "Aprovado" })}</SelectItem>
                              <SelectItem value="approved_comments">{t("technicalOffice.transmittal.respApprovedComments", { defaultValue: "Aprovado c/ Comentários" })}</SelectItem>
                              <SelectItem value="rejected">{t("technicalOffice.transmittal.respRejected", { defaultValue: "Rejeitado" })}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.table.deadline", { defaultValue: "Prazo" })} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="recipient" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("technicalOffice.detail.recipient", { defaultValue: "Destinatário" })} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input placeholder="Ex: Fiscalização, Projetista" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="assigned_to" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("technicalOffice.form.assignedTo")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input placeholder={t("technicalOffice.form.assignedToPlaceholder", { defaultValue: "Nome do responsável" })} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="work_item_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("technicalOffice.rfi.workItem", { defaultValue: "Atividade" })} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("technicalOffice.rfi.selectWorkItem", { defaultValue: "Selecionar…" })} /></SelectTrigger></FormControl>
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
                    <FormLabel>{t("technicalOffice.form.ncRelated")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
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

            {isEdit && item && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel projectId={activeProject.id} entityType="technical_office" entityId={item.id} />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="to-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common.loading") : isEdit ? t("common.save") : t("technicalOffice.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

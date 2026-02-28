import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const schema = z.object({
  subject: z.string().min(1, "Assunto obrigatório"),
  description: z.string().optional(),
  zone: z.string().optional(),
  priority: z.enum(PRIORITIES).default("normal"),
  deadline: z.string().optional(),
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
  const isEdit = !!rfi;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", description: "", zone: "", priority: "normal", deadline: "" },
  });

  useEffect(() => {
    if (rfi) {
      form.reset({
        subject: rfi.subject,
        description: rfi.description ?? "",
        zone: rfi.zone ?? "",
        priority: (rfi.priority as typeof PRIORITIES[number]) ?? "normal",
        deadline: rfi.deadline ?? "",
      });
    } else {
      form.reset({ subject: "", description: "", zone: "", priority: "normal", deadline: "" });
    }
  }, [rfi, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      if (rfi) {
        await rfiService.update(rfi.id, activeProject.id, {
          subject: values.subject,
          description: values.description ?? null,
          zone: values.zone ?? null,
          priority: values.priority,
          deadline: values.deadline || null,
        } as any);
        toast({ title: "RFI atualizado" });
      } else {
        await rfiService.create({
          project_id: activeProject.id,
          created_by: user.id,
          subject: values.subject,
          description: values.description,
          zone: values.zone,
          priority: values.priority,
          deadline: values.deadline || undefined,
        });
        toast({ title: "RFI criado com sucesso" });
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
          <DialogTitle>{isEdit ? "Editar RFI" : "Novo RFI"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="rfi-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl><Input placeholder="Assunto do RFI" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                    <FormControl><Textarea placeholder="Detalhes do pedido" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p === "low" ? "Baixa" : p === "normal" ? "Normal" : p === "high" ? "Alta" : "Urgente"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="zone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                    <FormControl><Input placeholder="Ex: Zona A, PK 12+500" {...field} /></FormControl>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="rfi-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "A guardar…" : isEdit ? "Guardar" : "Criar RFI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

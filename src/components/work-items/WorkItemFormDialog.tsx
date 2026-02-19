import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { workItemService, WORK_ITEM_STATUS_OPTIONS, type WorkItem } from "@/lib/services/workItemService";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    sector:     z.string().min(1, "Sector é obrigatório"),
    disciplina: z.string().min(1, "Disciplina é obrigatória"),
    obra:       z.string().optional(),
    lote:       z.string().optional(),
    elemento:   z.string().optional(),
    parte:      z.string().optional(),
    pk_inicio:  z.coerce.number().nullable().optional(),
    pk_fim:     z.coerce.number().nullable().optional(),
    status:     z.string().min(1),
  })
  .superRefine((val, ctx) => {
    if (
      val.pk_inicio != null &&
      val.pk_fim    != null &&
      val.pk_fim < val.pk_inicio
    ) {
      ctx.addIssue({
        path: ["pk_fim"],
        code: z.ZodIssueCode.custom,
        message: "PK Fim deve ser ≥ PK Início",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: WorkItem | null;
  onSuccess: () => void;
}

const DISCIPLINES = [
  "Geral", "Terraplenagem", "Pavimentação", "Drenagem",
  "Estruturas", "Sinalização", "Instalações", "Geotecnia", "Outro",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkItemFormDialog({ open, onOpenChange, item, onSuccess }: Props) {
  const { user }          = useAuth();
  const { activeProject } = useProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sector:    "",
      disciplina:"Geral",
      obra:      "",
      lote:      "",
      elemento:  "",
      parte:     "",
      pk_inicio: undefined,
      pk_fim:    undefined,
      status:    "planned",
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              sector:    item.sector    ?? "",
              disciplina:item.disciplina ?? "Geral",
              obra:      item.obra      ?? "",
              lote:      item.lote      ?? "",
              elemento:  item.elemento  ?? "",
              parte:     item.parte     ?? "",
              pk_inicio: item.pk_inicio ?? undefined,
              pk_fim:    item.pk_fim    ?? undefined,
              status:    item.status    ?? "planned",
            }
          : {
              sector:"", disciplina:"Geral", obra:"", lote:"",
              elemento:"", parte:"", pk_inicio: undefined,
              pk_fim: undefined, status: "planned",
            }
      );
    }
  }, [open, item, form]);

  const isEdit = !!item;

  async function onSubmit(values: FormValues) {
    if (!activeProject || !user) return;
    try {
      const payload = {
        sector:    values.sector,
        disciplina:values.disciplina,
        obra:      values.obra      || undefined,
        lote:      values.lote      || undefined,
        elemento:  values.elemento  || undefined,
        parte:     values.parte     || undefined,
        pk_inicio: values.pk_inicio ?? null,
        pk_fim:    values.pk_fim    ?? null,
        status:    values.status as import("@/lib/services/workItemService").WorkItemStatus,
      };

      if (isEdit && item) {
        await workItemService.update(item.id, activeProject.id, payload);
        toast({ title: "Work Item atualizado" });
      } else {
        await workItemService.create({
          project_id: activeProject.id,
          ...payload,
          created_by: user.id,
        });
        toast({ title: "Work Item criado" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Work Item" : "Novo Work Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Row 1: Sector + Disciplina */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sector" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sector <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="ex. Lote 1, Troço A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="disciplina" render={({ field }) => (
                <FormItem>
                  <FormLabel>Disciplina <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DISCIPLINES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 2: Obra + Lote */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="obra" render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra</FormLabel>
                  <FormControl><Input placeholder="Identificação da obra" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lote" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lote</FormLabel>
                  <FormControl><Input placeholder="ex. L1, L2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Elemento + Parte */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="elemento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Elemento</FormLabel>
                  <FormControl><Input placeholder="ex. Viaduto V1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="parte" render={({ field }) => (
                <FormItem>
                  <FormLabel>Parte</FormLabel>
                  <FormControl><Input placeholder="ex. Fundações" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 4: PK Início + PK Fim */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pk_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>PK Início (m)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="ex. 15250"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pk_fim" render={({ field }) => (
                <FormItem>
                  <FormLabel>PK Fim (m)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="ex. 17500"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 5: Status */}
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ITEM_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "A guardar…" : isEdit ? "Guardar alterações" : "Criar Work Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

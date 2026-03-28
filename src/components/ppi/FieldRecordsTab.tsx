import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  fieldRecordService,
  type FieldRecord,
  type FieldRecordInput,
  POINT_TYPES,
  WEATHER_OPTIONS,
  GR_RESULTS,
} from "@/lib/services/fieldRecordService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Plus, FileDown, Eye, FileText, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NCFormDialog } from "@/components/nc/NCFormDialog";

const RESULT_COLORS: Record<string, string> = {
  conforme: "bg-primary/15 text-primary",
  conforme_obs: "bg-amber-500/10 text-amber-600",
  nao_conforme: "bg-destructive/10 text-destructive",
  pendente: "bg-muted text-muted-foreground",
};

interface Props {
  instanceId: string;
  ppiCode: string;
  disciplina?: string;
}

export function FieldRecordsTab({ instanceId, ppiCode, disciplina }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const [records, setRecords] = useState<FieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [ncRecord, setNcRecord] = useState<FieldRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    point_type: "rp" as "rp" | "wp",
    activity: "",
    location_pk: "",
    inspection_date: new Date().toISOString().split("T")[0],
    weather: "bom",
    specialist_name: "",
    observations: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fieldRecordService.listByInstance(instanceId);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!activeProject || !user) return;
    setSubmitting(true);
    try {
      const input: FieldRecordInput = {
        project_id: activeProject.id,
        ppi_instance_id: instanceId,
        point_type: formData.point_type,
        activity: formData.activity,
        location_pk: formData.location_pk || null,
        inspection_date: formData.inspection_date,
        weather: formData.weather as any,
        specialist_name: formData.specialist_name || null,
        observations: formData.observations || null,
        created_by: user.id,
        inspector_id: user.id,
        result: "pendente",
      };
      await fieldRecordService.create(input);
      toast({ title: t("fieldRecords.toast.created", { defaultValue: "GR criada com sucesso." }) });
      setDialogOpen(false);
      setFormData({
        point_type: "rp", activity: "", location_pk: "",
        inspection_date: new Date().toISOString().split("T")[0],
        weather: "bom", specialist_name: "", observations: "",
      });
      load();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport(record: FieldRecord) {
    try {
      const full = await fieldRecordService.getById(record.id);
      fieldRecordService.exportPdf(full, activeProject?.name ?? "Atlas QMS");
    } catch (err) {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("fieldRecords.title", { defaultValue: "Grelhas de Registo" })} ({records.length})
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("fieldRecords.new", { defaultValue: "Nova GR" })}
        </Button>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={FileText} subtitleKey="fieldRecords.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">{t("common.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs">{t("common.date", { defaultValue: "Data" })}</TableHead>
                <TableHead className="text-xs">{t("fieldRecords.pointType", { defaultValue: "Tipo" })}</TableHead>
                <TableHead className="text-xs">{t("fieldRecords.activity", { defaultValue: "Actividade" })}</TableHead>
                <TableHead className="text-xs">{t("common.result", { defaultValue: "Resultado" })}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.inspection_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{r.point_type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.activity}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", RESULT_COLORS[r.result] ?? "")}>
                      {t(`fieldRecords.results.${r.result}`, { defaultValue: r.result })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport(r)} title="Export PDF">
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t("fieldRecords.form.title", { defaultValue: "Nova Grelha de Registo" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              PPI: <span className="font-mono font-semibold">{ppiCode}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">{t("fieldRecords.pointType", { defaultValue: "Tipo Ponto" })}</label>
                <Select value={formData.point_type} onValueChange={(v) => setFormData((p) => ({ ...p, point_type: v as any }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POINT_TYPES.map((pt) => <SelectItem key={pt} value={pt}>{pt.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">{t("common.date", { defaultValue: "Data" })}</label>
                <Input type="date" className="h-8 text-sm" value={formData.inspection_date} onChange={(e) => setFormData((p) => ({ ...p, inspection_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{t("fieldRecords.activity", { defaultValue: "Actividade" })} *</label>
              <Input className="h-8 text-sm" value={formData.activity} onChange={(e) => setFormData((p) => ({ ...p, activity: e.target.value }))} placeholder="ex: Betonagem Pilar P12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">PK / Localização</label>
                <Input className="h-8 text-sm font-mono" value={formData.location_pk} onChange={(e) => setFormData((p) => ({ ...p, location_pk: e.target.value }))} placeholder="45+200" />
              </div>
              <div>
                <label className="text-xs font-medium">{t("fieldRecords.weather", { defaultValue: "Meteorologia" })}</label>
                <Select value={formData.weather} onValueChange={(v) => setFormData((p) => ({ ...p, weather: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((w) => <SelectItem key={w} value={w}>{t(`fieldRecords.weatherOptions.${w}`, { defaultValue: w })}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{t("fieldRecords.specialist", { defaultValue: "Especialista / Encarregado" })}</label>
              <Input className="h-8 text-sm" value={formData.specialist_name} onChange={(e) => setFormData((p) => ({ ...p, specialist_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">{t("common.observations", { defaultValue: "Observações" })}</label>
              <Textarea className="text-sm" rows={2} value={formData.observations} onChange={(e) => setFormData((p) => ({ ...p, observations: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={submitting || !formData.activity.trim()}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              {t("common.create", { defaultValue: "Criar" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Clock, MapPin,
  Cloud, User, FlaskConical, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fieldRecordService,
  type FieldRecord, type FieldRecordCheck, type FieldRecordMaterial,
} from "@/lib/services/fieldRecordService";
import { toast } from "@/lib/utils/toast";

const RESULT_CFG: Record<string, { cls: string; label: string }> = {
  conforme:     { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", label: "Conforme" },
  conforme_obs: { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "Conf. c/ Obs." },
  nao_conforme: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Não Conforme" },
  pendente:     { cls: "bg-muted text-muted-foreground border-border", label: "Pendente" },
};

const WEATHER_ICONS: Record<string, string> = {
  bom: "☀️", nublado: "☁️", chuva: "🌧️", chuva_forte: "⛈️", vento: "💨",
};

const CHECK_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  ok: { icon: CheckCircle2, cls: "text-emerald-600" },
  nc: { icon: XCircle, cls: "text-destructive" },
  na: { icon: Clock, cls: "text-muted-foreground" },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recordId: string | null;
}

export function FieldRecordDetailDialog({ open, onOpenChange, recordId }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<(FieldRecord & { materials: FieldRecordMaterial[]; checks: FieldRecordCheck[] }) | null>(null);

  useEffect(() => {
    if (!open || !recordId) { setRecord(null); return; }
    setLoading(true);
    fieldRecordService.getById(recordId)
      .then(setRecord)
      .catch(e => toast({ title: e.message ?? "Erro", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, recordId]);

  const resultCfg = record ? RESULT_CFG[record.result] ?? RESULT_CFG.pendente : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {record?.code ?? t("fieldRecords.detail.title", { defaultValue: "Grelha de Registo" })}
            {record && resultCfg && (
              <Badge variant="outline" className={cn("ml-2 text-[10px]", resultCfg.cls)}>
                {resultCfg.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !record ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {/* Cabeçalho — actividade */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                {t("fieldRecords.detail.activity", { defaultValue: "Actividade inspeccionada" })}
              </p>
              <p className="text-sm font-semibold text-foreground">{record.activity}</p>
              {record.ppi_code && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("fieldRecords.detail.linkedPPI", { defaultValue: "Ligada a PPI" })}:{" "}
                  <span className="font-mono">{record.ppi_code}</span>
                </p>
              )}
            </div>

            {/* Grid de metadados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetaCell
                icon={ClipboardCheck}
                label={t("fieldRecords.detail.type", { defaultValue: "Tipo" })}
                value={record.point_type.toUpperCase()}
              />
              <MetaCell
                icon={Clock}
                label={t("common.date")}
                value={new Date(record.inspection_date).toLocaleDateString(t("common.locale", { defaultValue: "pt-PT" }))}
              />
              <MetaCell
                icon={MapPin}
                label="PK"
                value={record.location_pk ?? "—"}
                mono
              />
              <MetaCell
                icon={Cloud}
                label={t("fieldRecords.detail.weather", { defaultValue: "Meteo" })}
                value={`${WEATHER_ICONS[record.weather ?? "bom"] ?? ""} ${record.weather ?? "—"}`}
              />
              <MetaCell
                icon={User}
                label={t("fieldRecords.detail.specialist", { defaultValue: "Resp. Especialidade" })}
                value={record.specialist_name ?? "—"}
              />
            </div>

            {/* Materiais */}
            {record.materials.length > 0 && (
              <Section icon={Package} title={t("fieldRecords.detail.materials", { defaultValue: "Materiais e Equipamentos" })}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.materialName", { defaultValue: "Material" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">FAV/PAME</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.lot", { defaultValue: "Lote" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.qty", { defaultValue: "Qtd." })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.materials.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-medium">{m.material_name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{m.fav_pame_ref ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{m.lot_ref ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.quantity ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Section>
            )}

            {/* Verificações */}
            {record.checks.length > 0 && (
              <Section icon={FlaskConical} title={t("fieldRecords.detail.checks", { defaultValue: "Verificações realizadas" })}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] uppercase tracking-wide w-8">#</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.checkItem", { defaultValue: "Item" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.criteria", { defaultValue: "Critério" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.method", { defaultValue: "Método" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide">{t("fieldRecords.form.measured", { defaultValue: "Valor" })}</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wide w-16 text-center">{t("common.result", { defaultValue: "Res." })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.checks.map(c => {
                      const cfg = CHECK_ICON[c.result] ?? CHECK_ICON.na;
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs text-muted-foreground">{c.item_no}</TableCell>
                          <TableCell className="text-sm">{c.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.criteria ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.method ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{c.measured_value ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <Icon className={cn("h-4 w-4 inline-block", cfg.cls)} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Section>
            )}

            {/* Observações */}
            {record.observations && (
              <Section icon={AlertTriangle} title={t("fieldRecords.detail.observations", { defaultValue: "Observações" })}>
                <p className="text-sm text-foreground whitespace-pre-wrap p-3 rounded-md border border-border/60 bg-muted/20">
                  {record.observations}
                </p>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaCell({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-sm font-medium text-foreground truncate", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      </div>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

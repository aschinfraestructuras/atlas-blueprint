import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { weldService, type WeldRecord } from "@/lib/services/weldService";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, CheckCircle2, XCircle, Wrench, Plus, ArrowRight } from "lucide-react";

interface Props { projectId: string }

export function WeldTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<WeldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(await weldService.listByProject(projectId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const pass = data.filter(w => w.overall_result === "pass").length;
  const fail = data.filter(w => w.overall_result === "fail").length;
  const repair = data.filter(w => w.overall_result === "repair_needed").length;

  if (loading) return <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>;

  const resultColor = (r: string) =>
    r === "pass" ? "bg-primary/15 text-primary"
    : r === "fail" ? "bg-destructive/10 text-destructive"
    : r === "repair_needed" ? "bg-orange-500/10 text-orange-600"
    : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3 flex-1 max-w-lg">
          <ModuleKPICard label={t("welding.kpi.total")} value={data.length} icon={Flame} />
          <ModuleKPICard label={t("welding.kpi.pass")} value={pass} icon={CheckCircle2} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("welding.kpi.fail")} value={fail} icon={XCircle} color={fail > 0 ? "hsl(var(--destructive))" : undefined} />
          <ModuleKPICard label={t("welding.kpi.repair")} value={repair} icon={Wrench} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/tests/welding")}><ArrowRight className="h-3.5 w-3.5 mr-1" />{t("common.view")} todos</Button>
          <Button size="sm" onClick={() => navigate("/tests/welding")}><Plus className="h-3.5 w-3.5 mr-1" />Nova Soldadura</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={Flame} subtitleKey="welding.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Código</TableHead>
              <TableHead className="text-xs font-semibold uppercase">PK</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("common.date")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("welding.fields.railProfile")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("welding.fields.operator")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.result")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 20).map(w => (
                <TableRow key={w.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate("/tests/welding")}>
                  <TableCell className="font-mono text-xs font-semibold">{w.code}</TableCell>
                  <TableCell className="text-xs">{w.pk_location}</TableCell>
                  <TableCell className="text-xs">{w.weld_date}</TableCell>
                  <TableCell className="text-xs font-mono">{w.rail_profile}</TableCell>
                  <TableCell className="text-xs">{w.operator_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className={resultColor(w.overall_result)}>{t(`welding.result.${w.overall_result}`, { defaultValue: w.overall_result })}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { compactionService, type CompactionZone } from "@/lib/services/compactionService";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, CheckCircle2, XCircle, Plus, ArrowRight } from "lucide-react";

interface Props { projectId: string }

export function CompactionTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<CompactionZone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(await compactionService.listByProject(projectId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const pass = data.filter(z => z.overall_result === "pass").length;
  const fail = data.filter(z => z.overall_result === "fail").length;

  if (loading) return <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
          <ModuleKPICard label={t("compaction.kpi.total")} value={data.length} icon={Gauge} />
          <ModuleKPICard label={t("compaction.kpi.pass")} value={pass} icon={CheckCircle2} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("compaction.kpi.fail")} value={fail} icon={XCircle} color={fail > 0 ? "hsl(var(--destructive))" : undefined} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/tests/compaction")}><ArrowRight className="h-3.5 w-3.5 mr-1" />{t("common.view")} todos</Button>
          <Button size="sm" onClick={() => navigate("/tests/compaction")}><Plus className="h-3.5 w-3.5 mr-1" />{t("compaction.newZone")}</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={Gauge} subtitleKey="compaction.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Código</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("common.date")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("compaction.fields.description")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("compaction.fields.material")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.result")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 20).map(z => {
                const resultLabel = z.overall_result === "pass" ? t("common.conform") : z.overall_result === "fail" ? t("common.nonConform") : t("common.pending");
                const resultClass = z.overall_result === "pass" ? "bg-primary/15 text-primary" : z.overall_result === "fail" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
                return (
                <TableRow key={z.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate("/tests/compaction")}>
                  <TableCell className="font-mono text-xs font-semibold">{z.code}</TableCell>
                  <TableCell className="text-xs">{z.test_date}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{z.zone_description}</TableCell>
                  <TableCell className="text-xs">{z.material_type ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={resultClass}>
                      {resultLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

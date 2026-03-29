import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { concreteService, type ConcreteBatch } from "@/lib/services/concreteService";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, CheckCircle2, XCircle, Clock, Plus, ArrowRight } from "lucide-react";

interface Props { projectId: string }

export function ConcreteTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<ConcreteBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(await concreteService.listByProject(projectId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const pass = data.filter(b => b.status === "approved").length;
  const fail = data.filter(b => b.status === "rejected").length;

  if (loading) return <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
          <ModuleKPICard label={t("concrete.kpi.total")} value={data.length} icon={Layers} />
          <ModuleKPICard label={t("concrete.kpi.pass")} value={pass} icon={CheckCircle2} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("concrete.kpi.fail")} value={fail} icon={XCircle} color={fail > 0 ? "hsl(var(--destructive))" : undefined} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/tests/concrete")}><ArrowRight className="h-3.5 w-3.5 mr-1" />{t("common.view")} todos</Button>
          <Button size="sm" onClick={() => navigate("/tests/concrete")}><Plus className="h-3.5 w-3.5 mr-1" />{t("concrete.newBatch")}</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={Layers} subtitleKey="concrete.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.code")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("common.date")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.element")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.class")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.result")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 20).map(b => {
                const result = (b as any).overall_result ?? b.status;
                const resultLabel = result === "pass" ? t("common.conform") : result === "fail" ? t("common.nonConform") : result === "approved" ? t("common.conform") : result === "rejected" ? t("common.nonConform") : t("common.pending");
                const resultClass = result === "pass" || result === "approved" ? "bg-primary/15 text-primary" : result === "fail" || result === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
                return (
                <TableRow key={b.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate("/tests/concrete")}>
                  <TableCell className="font-mono text-xs font-semibold">{b.code}</TableCell>
                  <TableCell className="text-xs">{b.batch_date}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{b.element_betonado}</TableCell>
                  <TableCell className="text-xs font-mono">{b.concrete_class}</TableCell>
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

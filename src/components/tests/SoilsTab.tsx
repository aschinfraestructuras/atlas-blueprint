import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { soilService, type SoilSample } from "@/lib/services/soilService";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Mountain, CheckCircle2, XCircle, Plus, ArrowRight } from "lucide-react";

interface Props { projectId: string }

export function SoilsTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<SoilSample[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(await soilService.listByProject(projectId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const apto = data.filter(s => s.overall_result === "apto").length;
  const inapto = data.filter(s => s.overall_result === "inapto").length;

  if (loading) return <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
          <ModuleKPICard label={t("soils.kpi.total")} value={data.length} icon={Mountain} />
          <ModuleKPICard label={t("soils.kpi.apto")} value={apto} icon={CheckCircle2} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("soils.kpi.inapto")} value={inapto} icon={XCircle} color={inapto > 0 ? "hsl(var(--destructive))" : undefined} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/tests/soils")}><ArrowRight className="h-3.5 w-3.5 mr-1" />{t("common.view")} todos</Button>
          <Button size="sm" onClick={() => navigate("/tests/soils")}><Plus className="h-3.5 w-3.5 mr-1" />{t("soils.newSample")}</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={Mountain} subtitleKey="soils.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Código</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Ref. Amostra</TableHead>
              <TableHead className="text-xs font-semibold uppercase">PK</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Profundidade</TableHead>
              <TableHead className="text-xs font-semibold uppercase">{t("concrete.fields.result")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 20).map(s => (
                <TableRow key={s.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate("/tests/soils")}>
                  <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                  <TableCell className="text-xs">{s.sample_ref}</TableCell>
                  <TableCell className="text-xs">{s.pk_location ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.depth_from != null ? `${s.depth_from}–${s.depth_to ?? "?"}m` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={s.overall_result === "apto" ? "bg-primary/15 text-primary" : s.overall_result === "inapto" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>
                      {s.overall_result ?? "pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

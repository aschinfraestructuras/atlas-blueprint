import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Gauge, Mountain, FlaskConical, Zap } from "lucide-react";
import { concreteService, type ConcreteBatchWithCounts } from "@/lib/services/concreteService";
import { compactionService, type CompactionZoneWithCounts } from "@/lib/services/compactionService";
import { soilService, type SoilSample } from "@/lib/services/soilService";
import { weldService, type WeldRecord } from "@/lib/services/weldService";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PPITestsTabProps {
  instanceId: string;
  ppiCode: string;
  workItemId?: string | null;
}

function ResultBadge({ result }: { result: string }) {
  if (result === "pass" || result === "apto")
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">OK</Badge>;
  if (result === "fail" || result === "inapto")
    return <Badge variant="destructive" className="text-[10px]">NOK</Badge>;
  return <Badge variant="outline" className="text-amber-600 text-[10px]">Pend.</Badge>;
}

export function PPITestsTab({ instanceId, ppiCode, workItemId }: PPITestsTabProps) {
  const { t } = useTranslation();
  const [concrete, setConcrete] = useState<ConcreteBatchWithCounts[]>([]);
  const [compaction, setCompaction] = useState<CompactionZoneWithCounts[]>([]);
  const [soils, setSoils] = useState<SoilSample[]>([]);
  const [welds, setWelds] = useState<WeldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const [c, comp, s, w] = await Promise.all([
          workItemId
            ? concreteService.listByWorkItem(workItemId)
            : concreteService.listByPpi(instanceId),
          workItemId
            ? compactionService.listByWorkItem(workItemId)
            : compactionService.listByPpi(instanceId),
          workItemId
            ? soilService.listByWorkItem(workItemId)
            : Promise.resolve([]),
          workItemId
            ? weldService.listByWorkItem(workItemId)
            : weldService.listByPpi(instanceId),
        ]);
        setConcrete(c);
        setCompaction(comp);
        setSoils(s);
        setWelds(w as WeldRecord[]);
      } catch {
        /* swallow */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [instanceId, workItemId]);

  const totalTests = concrete.length + compaction.length + soils.length + welds.length;
  const passCount = [
    ...concrete.filter((c) => c.overall_result === "pass"),
    ...compaction.filter((c) => c.overall_result === "pass"),
    ...soils.filter((s) => s.overall_result === "apto"),
    ...welds.filter((w) => w.overall_result === "pass"),
  ].length;
  const pendingCount = [
    ...concrete.filter((c) => c.overall_result === "pending"),
    ...compaction.filter((c) => c.overall_result === "pending"),
    ...soils.filter((s) => s.overall_result === "pending"),
    ...welds.filter((w) => w.overall_result === "pending"),
  ].length;
  const failCount = totalTests - passCount - pendingCount;

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (totalTests === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <FlaskConical className="h-6 w-6 opacity-40" />
        <p className="text-sm">{t("tests.ppiTab.empty")}</p>
        <p className="text-xs text-muted-foreground/60 max-w-sm text-center">
          {t("tests.ppiTab.emptyHint", { defaultValue: "Os ensaios são associados ao criar a ficha de betonagem, compactação, solo ou soldadura." })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="outline" className="gap-1">
          <FlaskConical className="h-3 w-3" /> {totalTests} {t("tests.ppiTab.tests", { defaultValue: "ensaios" })}
        </Badge>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
          {passCount} {t("tests.ppiTab.conform", { defaultValue: "conformes" })}
        </Badge>
        {failCount > 0 && (
          <Badge variant="destructive" className="gap-1">{failCount} {t("tests.ppiTab.nonConform", { defaultValue: "não conformes" })}</Badge>
        )}
      </div>

      {/* Concrete */}
      {concrete.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Layers className="h-3.5 w-3.5" /> {t("tests.ppiTab.concrete")} ({concrete.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">{t("concrete.fields.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs">{t("common.date")}</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">{t("concrete.fields.result", { defaultValue: "Result." })}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {concrete.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-xs">{new Date(c.batch_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{c.pk_location ?? "—"}</TableCell>
                    <TableCell><ResultBadge result={c.overall_result} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Compaction */}
      {compaction.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Gauge className="h-3.5 w-3.5" /> {t("tests.ppiTab.compaction")} ({compaction.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">{t("concrete.fields.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs">{t("common.date")}</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">{t("concrete.fields.result", { defaultValue: "Result." })}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {compaction.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-xs">{new Date(c.test_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{c.pk_start ?? "—"}</TableCell>
                    <TableCell><ResultBadge result={c.overall_result} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Welds */}
      {welds.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Zap className="h-3.5 w-3.5" /> {t("tests.ppiTab.welds", { defaultValue: "Soldaduras" })} ({welds.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">{t("concrete.fields.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs">{t("common.date")}</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">{t("concrete.fields.result", { defaultValue: "Result." })}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {welds.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.code}</TableCell>
                    <TableCell className="text-xs">{new Date(w.weld_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{w.pk_location ?? "—"}</TableCell>
                    <TableCell><ResultBadge result={w.overall_result} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Soils */}
      {soils.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Mountain className="h-3.5 w-3.5" /> {t("tests.ppiTab.soils", { defaultValue: "Solos" })} ({soils.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">{t("concrete.fields.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs">{t("common.date")}</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">{t("concrete.fields.result", { defaultValue: "Result." })}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {soils.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-xs">{new Date(s.sample_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{s.pk_location ?? "—"}</TableCell>
                    <TableCell><ResultBadge result={s.overall_result} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

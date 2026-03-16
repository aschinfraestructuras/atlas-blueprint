import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Gauge, Mountain, FlaskConical, ExternalLink } from "lucide-react";
import { concreteService, type ConcreteBatchWithCounts } from "@/lib/services/concreteService";
import { compactionService, type CompactionZoneWithCounts } from "@/lib/services/compactionService";
import { soilService, type SoilSample } from "@/lib/services/soilService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PPITestsTabProps {
  instanceId: string;
  ppiCode: string;
}

function ResultBadge({ result }: { result: string }) {
  if (result === "pass" || result === "apto")
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">OK</Badge>;
  if (result === "fail" || result === "inapto")
    return <Badge variant="destructive" className="text-[10px]">NOK</Badge>;
  return <Badge variant="outline" className="text-amber-600 text-[10px]">Pend.</Badge>;
}

export function PPITestsTab({ instanceId, ppiCode }: PPITestsTabProps) {
  const { t } = useTranslation();
  const [concrete, setConcrete] = useState<ConcreteBatchWithCounts[]>([]);
  const [compaction, setCompaction] = useState<CompactionZoneWithCounts[]>([]);
  const [soils, setSoils] = useState<SoilSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      concreteService.listByPpi(instanceId),
      compactionService.listByPpi(instanceId),
      // soils don't have ppi_instance_id
    ]).then(([c, comp]) => {
      setConcrete(c);
      setCompaction(comp);
      setSoils([]);
    }).finally(() => setLoading(false));
  }, [instanceId]);

  const totalTests = concrete.length + compaction.length + soils.length;
  const passCount = [
    ...concrete.filter((c) => c.overall_result === "pass"),
    ...compaction.filter((c) => c.overall_result === "pass"),
    ...soils.filter((s) => s.overall_result === "apto"),
  ].length;
  const failCount = totalTests - passCount - [
    ...concrete.filter((c) => c.overall_result === "pending"),
    ...compaction.filter((c) => c.overall_result === "pending"),
    ...soils.filter((s) => s.overall_result === "pending"),
  ].length;

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (totalTests === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <FlaskConical className="h-6 w-6 opacity-40" />
        <p className="text-sm">{t("tests.ppiTab.empty")}</p>
        <p className="text-xs text-muted-foreground/60 max-w-sm text-center">
          Os ensaios são associados ao criar a ficha de betonagem, compactação ou solo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="outline" className="gap-1">
          <FlaskConical className="h-3 w-3" /> {totalTests} ensaios
        </Badge>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
          {passCount} conformes
        </Badge>
        {failCount > 0 && (
          <Badge variant="destructive" className="gap-1">{failCount} não conformes</Badge>
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
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">Result.</TableHead>
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
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">PK</TableHead>
                <TableHead className="text-xs">Result.</TableHead>
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
    </div>
  );
}

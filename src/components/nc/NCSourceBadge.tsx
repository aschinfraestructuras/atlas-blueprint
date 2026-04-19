import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FlaskConical, ClipboardCheck, Layers, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  testResultId?: string | null;
  ppiInstanceId?: string | null;
  workItemId?: string | null;
}

interface SourceInfo {
  type: "test" | "ppi" | "workItem";
  label: string;
  href: string;
}

/**
 * Badge clicável que mostra a origem dura de uma NC:
 * - Ensaio que falhou (test_result_id)
 * - PPI que reprovou (ppi_instance_id)
 * - Frente de obra (work_item_id)
 *
 * Aparece quando há ligação por FK; clica para navegar à origem.
 */
export function NCSourceBadge({ testResultId, ppiInstanceId, workItemId }: Props) {
  const { t } = useTranslation();
  const [sources, setSources] = useState<SourceInfo[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const out: SourceInfo[] = [];

      if (testResultId) {
        const { data } = await supabase
          .from("test_results")
          .select("id, code, tests_catalog(name, code)")
          .eq("id", testResultId)
          .maybeSingle();
        if (data) {
          const tcName = (data as any).tests_catalog?.name ?? "Ensaio";
          out.push({
            type: "test",
            label: `${data.code ?? tcName}`,
            href: `/tests?focus=${data.id}`,
          });
        }
      }

      if (ppiInstanceId) {
        const { data } = await supabase
          .from("ppi_instances")
          .select("id, code")
          .eq("id", ppiInstanceId)
          .maybeSingle();
        if (data) {
          out.push({
            type: "ppi",
            label: data.code ?? data.id.slice(0, 8),
            href: `/ppi/${data.id}`,
          });
        }
      }

      if (workItemId) {
        const { data } = await supabase
          .from("work_items")
          .select("id, sector, elemento, parte")
          .eq("id", workItemId)
          .maybeSingle();
        if (data) {
          const parts = [data.sector, data.elemento, data.parte].filter(Boolean).join(" — ");
          out.push({
            type: "workItem",
            label: parts || data.id.slice(0, 8),
            href: `/work-items/${data.id}`,
          });
        }
      }

      if (!cancel) setSources(out);
    })();
    return () => { cancel = true; };
  }, [testResultId, ppiInstanceId, workItemId]);

  if (sources.length === 0) return null;

  const iconFor = (t: SourceInfo["type"]) => {
    if (t === "test") return FlaskConical;
    if (t === "ppi") return ClipboardCheck;
    return Layers;
  };

  const labelFor = (type: SourceInfo["type"]) => {
    if (type === "test") return t("nc.source.fromTest", { defaultValue: "Origem: Ensaio" });
    if (type === "ppi") return t("nc.source.fromPpi", { defaultValue: "Origem: PPI" });
    return t("nc.source.fromWorkItem", { defaultValue: "Origem: Frente" });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => {
          const Icon = iconFor(s.type);
          return (
            <Tooltip key={s.type + s.label}>
              <TooltipTrigger asChild>
                <Link to={s.href}>
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-[11px] cursor-pointer"
                  >
                    <Icon className="h-3 w-3" />
                    <span className="font-mono">{s.label}</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </Badge>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{labelFor(s.type)}</p>
                <p className="text-[10px] opacity-70 mt-0.5">Clicar para abrir</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

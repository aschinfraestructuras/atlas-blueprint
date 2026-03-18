import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText, FlaskConical, Package, Building2,
  ArrowRight, Link2,
} from "lucide-react";

interface TraceNode {
  type: "document" | "test" | "lot" | "supplier";
  id: string;
  label: string;
  sublabel?: string;
  route?: string;
}

interface Props {
  testResultId: string;
  projectId: string;
}

/**
 * Visual traceability chain: Document → Ensaio → Lote → Fornecedor
 * Shows all linked entities for a given test result.
 */
export function TraceabilityChain({ testResultId, projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get test result with catalog + supplier
        const { data: tr } = await supabase
          .from("test_results")
          .select("id, code, supplier_id, work_item_id, material, tests_catalog(code, name), suppliers(id, name, code)")
          .eq("id", testResultId)
          .single();

        if (!tr) { setNodes([]); return; }

        const chain: TraceNode[] = [];

        // 1. Linked documents (via document_links)
        const { data: docLinks } = await supabase
          .from("document_links")
          .select("document_id, documents(id, code, title)")
          .eq("linked_entity_type", "test_result")
          .eq("linked_entity_id", testResultId);

        if (docLinks && docLinks.length > 0) {
          for (const dl of docLinks) {
            const doc = (dl as any).documents;
            if (doc) {
              chain.push({
                type: "document",
                id: doc.id,
                label: doc.code ?? doc.title,
                sublabel: doc.title,
                route: `/documents/${doc.id}`,
              });
            }
          }
        }

        // 2. Test result itself
        const tc = (tr as any).tests_catalog;
        chain.push({
          type: "test",
          id: tr.id,
          label: (tr as any).code ?? "Ensaio",
          sublabel: tc?.name ?? tc?.code,
        });

        // 3. Material lots linked to same work_item + supplier
        if ((tr as any).work_item_id || (tr as any).supplier_id) {
          let lotQuery = supabase
            .from("material_lots")
            .select("id, lot_code, material_id, materials(code, name)")
            .eq("project_id", projectId)
            .eq("is_deleted", false)
            .limit(3);

          if ((tr as any).supplier_id) {
            lotQuery = lotQuery.eq("supplier_id", (tr as any).supplier_id);
          }

          const { data: lots } = await lotQuery;
          if (lots && lots.length > 0) {
            for (const lot of lots) {
              const mat = (lot as any).materials;
              chain.push({
                type: "lot",
                id: lot.id,
                label: lot.lot_code,
                sublabel: mat?.name ?? mat?.code,
                route: mat ? `/materials/${(lot as any).material_id}` : undefined,
              });
            }
          }
        }

        // 4. Supplier
        const sup = (tr as any).suppliers;
        if (sup) {
          chain.push({
            type: "supplier",
            id: sup.id,
            label: sup.name,
            sublabel: sup.code,
            route: `/suppliers/${sup.id}`,
          });
        }

        setNodes(chain);
      } catch (err) {
        console.error("[TraceabilityChain]", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [testResultId, projectId]);

  const ICONS: Record<string, React.ElementType> = {
    document: FileText,
    test: FlaskConical,
    lot: Package,
    supplier: Building2,
  };

  const COLORS: Record<string, string> = {
    document: "text-blue-600 bg-blue-500/10",
    test: "text-amber-600 bg-amber-500/10",
    lot: "text-primary bg-primary/10",
    supplier: "text-purple-600 bg-purple-500/10",
  };

  const LABELS: Record<string, string> = {
    document: t("traceability.document", { defaultValue: "Documento" }),
    test: t("traceability.test", { defaultValue: "Ensaio" }),
    lot: t("traceability.lot", { defaultValue: "Lote" }),
    supplier: t("traceability.supplier", { defaultValue: "Fornecedor" }),
  };

  if (loading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  if (nodes.length === 0) return null;

  return (
    <Card className="shadow-card border-primary/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          {t("traceability.title", { defaultValue: "Cadeia de Rastreabilidade" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {nodes.map((node, idx) => {
            const Icon = ICONS[node.type] ?? FileText;
            const colorCls = COLORS[node.type] ?? "text-muted-foreground bg-muted";
            return (
              <div key={`${node.type}-${node.id}-${idx}`} className="flex items-center gap-1">
                {idx > 0 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 mx-0.5" />
                )}
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors",
                    node.route ? "cursor-pointer hover:opacity-80" : "",
                    colorCls.split(" ")[1],
                  )}
                  onClick={() => node.route && navigate(node.route)}
                >
                  <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", colorCls.split(" ")[0])} />
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-[9px] py-0 font-normal mb-0.5">
                      {LABELS[node.type]}
                    </Badge>
                    <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                      {node.label}
                    </p>
                    {node.sublabel && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {node.sublabel}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

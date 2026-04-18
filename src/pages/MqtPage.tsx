import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Search, Upload, FileSpreadsheet, MapPin, Loader2, ShieldCheck, ListTree } from "lucide-react";
import { useMqtItems } from "@/hooks/useMqt";
import { useProjectRole } from "@/hooks/useProjectRole";
import { MqtImportDialog } from "@/components/mqt/MqtImportDialog";
import { MqtKpiCards } from "@/components/mqt/MqtKpiCards";
import { MqtCoverageTab } from "@/components/mqt/MqtCoverageTab";

export default function MqtPage() {
  const { t } = useTranslation();
  const { isAdmin } = useProjectRole();
  const { data: items = [], isLoading } = useMqtItems();

  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [pkFilter, setPkFilter] = useState<"all" | "with" | "without">("all");
  const [qtyMin, setQtyMin] = useState<string>("");
  const [qtyMax, setQtyMax] = useState<string>("");
  const [leafOnly, setLeafOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"items" | "coverage">("items");

  const families = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.familia && s.add(i.familia));
    return Array.from(s).sort();
  }, [items]);

  const units = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.unidade && s.add(i.unidade));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = qtyMin.trim() === "" ? null : Number(qtyMin);
    const max = qtyMax.trim() === "" ? null : Number(qtyMax);
    return items.filter((it) => {
      if (familyFilter !== "all" && it.familia !== familyFilter) return false;
      if (unitFilter !== "all" && it.unidade !== unitFilter) return false;
      if (pkFilter === "with" && !it.pk_inicio_mqt) return false;
      if (pkFilter === "without" && it.pk_inicio_mqt) return false;
      if (leafOnly && !it.is_leaf) return false;
      if (min != null && !Number.isNaN(min) && (it.quantidade ?? -Infinity) < min) return false;
      if (max != null && !Number.isNaN(max) && (it.quantidade ?? Infinity) > max) return false;
      if (q) {
        const hay = `${it.code_rubrica} ${it.designacao}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, familyFilter, unitFilter, pkFilter, qtyMin, qtyMax, leafOnly]);

  const hasActiveFilters = search || familyFilter !== "all" || unitFilter !== "all" || pkFilter !== "all" || qtyMin || qtyMax || leafOnly;
  const clearFilters = () => {
    setSearch(""); setFamilyFilter("all"); setUnitFilter("all");
    setPkFilter("all"); setQtyMin(""); setQtyMax(""); setLeafOnly(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("mqt.title")}
        subtitle={t("mqt.description")}
        icon={FileSpreadsheet}
        actions={
          isAdmin && (
            <Button onClick={() => setImportOpen(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              {t("mqt.import.button")}
            </Button>
          )
        }
      />

      <MqtKpiCards />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "items" | "coverage")}>
        <TabsList>
          <TabsTrigger value="items" className="gap-2">
            <ListTree className="h-4 w-4" />
            {t("mqt.tabs.items")}
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("mqt.tabs.coverage")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("mqt.searchPlaceholder")}
                    className="pl-9"
                  />
                </div>
                <Select value={familyFilter} onValueChange={setFamilyFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder={t("mqt.filterByFamily")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mqt.allFamilies")}</SelectItem>
                    {families.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={leafOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLeafOnly((v) => !v)}
                >
                  {t("mqt.leafOnly")}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                {t("mqt.showing", { shown: filtered.length, total: items.length })}
              </div>

              {/* Tabela */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={FileSpreadsheet}
                  title={t("mqt.empty.title")}
                  subtitle={isAdmin ? t("mqt.empty.descriptionAdmin") : t("mqt.empty.description")}
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title={t("mqt.noResults.title")}
                  subtitle={t("mqt.noResults.description")}
                />
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">{t("mqt.cols.code")}</TableHead>
                        <TableHead>{t("mqt.cols.designation")}</TableHead>
                        <TableHead className="w-[80px] text-center">{t("mqt.cols.unit")}</TableHead>
                        <TableHead className="w-[120px] text-right">{t("mqt.cols.quantity")}</TableHead>
                        <TableHead className="w-[120px]">{t("mqt.cols.pk")}</TableHead>
                        <TableHead className="w-[100px]">{t("mqt.cols.family")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.slice(0, 1000).map((it) => (
                        <TableRow key={it.id} className={!it.is_leaf ? "bg-muted/30" : undefined}>
                          <TableCell
                            className="font-mono text-xs"
                            style={{ paddingLeft: `${Math.min(it.nivel - 1, 6) * 12 + 16}px` }}
                          >
                            {it.code_rubrica}
                          </TableCell>
                          <TableCell className={!it.is_leaf ? "font-semibold" : undefined}>
                            {it.designacao}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {it.unidade ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {it.quantidade != null
                              ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(it.quantidade)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.pk_inicio_mqt ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                {it.pk_inicio_mqt}
                                {it.pk_fim_mqt && ` → ${it.pk_fim_mqt}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {it.familia && <Badge variant="outline" className="text-xs">{it.familia}</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filtered.length > 1000 && (
                    <div className="p-2 text-xs text-center text-muted-foreground bg-muted/30">
                      {t("mqt.truncated", { shown: 1000, total: filtered.length })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <MqtCoverageTab />
        </TabsContent>
      </Tabs>

      <MqtImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

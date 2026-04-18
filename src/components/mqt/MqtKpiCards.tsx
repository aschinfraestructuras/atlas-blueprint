import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useMqtSummary } from "@/hooks/useMqt";
import { Layers, MapPin, Box, Square, Ruler } from "lucide-react";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n);
}

export function MqtKpiCards() {
  const { t } = useTranslation();
  const { data: summary = [] } = useMqtSummary();

  const totals = summary.reduce(
    (acc, s) => ({
      familias: acc.familias + 1,
      itens: acc.itens + (s.total_itens_folha ?? 0),
      itens_com_pk: acc.itens_com_pk + (s.itens_com_pk ?? 0),
      volume: acc.volume + (s.volume_m3 ?? 0),
      area: acc.area + (s.area_m2 ?? 0),
      comprimento: acc.comprimento + (s.comprimento_m ?? 0),
    }),
    { familias: 0, itens: 0, itens_com_pk: 0, volume: 0, area: 0, comprimento: 0 }
  );

  const cards = [
    { icon: Layers, label: t("mqt.kpis.families"), value: fmt(totals.familias) },
    { icon: MapPin, label: t("mqt.kpis.itemsWithPk"), value: `${fmt(totals.itens_com_pk)} / ${fmt(totals.itens)}` },
    { icon: Box, label: t("mqt.kpis.volumeM3"), value: fmt(totals.volume) },
    { icon: Square, label: t("mqt.kpis.areaM2"), value: fmt(totals.area) },
    { icon: Ruler, label: t("mqt.kpis.lengthM"), value: fmt(totals.comprimento) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Icon className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wide font-medium">{c.label}</span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums">{c.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

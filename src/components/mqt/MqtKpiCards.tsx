import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useMqtItems } from "@/hooks/useMqt";
import { Layers, MapPin, Box, Square, Ruler } from "lucide-react";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n);
}

/** Normalises unit strings (case + accents) to compare reliably. */
function normUnit(u: string | null | undefined): string {
  return (u ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("³", "3")
    .replace("²", "2")
    .trim();
}

export function MqtKpiCards() {
  const { t } = useTranslation();
  const { data: items = [] } = useMqtItems();

  // Compute totals from leaf items so units (m, m², m³) are aggregated correctly.
  const totals = items.reduce(
    (acc, it) => {
      if (!it.is_leaf) {
        // Family count handled via distinct family set below
        return acc;
      }
      acc.itens += 1;
      if (it.pk_inicio_mqt) acc.itens_com_pk += 1;
      const u = normUnit(it.unidade);
      const q = it.quantidade ?? 0;
      if (u === "m3") acc.volume += q;
      else if (u === "m2") acc.area += q;
      else if (u === "m") acc.comprimento += q;
      return acc;
    },
    { itens: 0, itens_com_pk: 0, volume: 0, area: 0, comprimento: 0 }
  );

  const familiasCount = new Set(items.map((i) => i.familia).filter(Boolean)).size;

  const cards = [
    { icon: Layers, label: t("mqt.kpis.families"), value: fmt(familiasCount) },
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

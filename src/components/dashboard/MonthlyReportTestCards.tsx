import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  monthStart: string; // YYYY-MM-DD
  monthEnd: string;   // YYYY-MM-DD
}

interface TestSectionData {
  concrete: { batches: number; lots: number; conformRate: number | null };
  welds: { total: number; withUT: number };
  soils: { samples: number; compactionTests: number; conformRate: number | null };
  topography: { controls: number; expiringEquipment: number };
}

export function MonthlyReportTestCards({ projectId, monthStart, monthEnd }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<TestSectionData | null>(null);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const today = new Date().toISOString().split("T")[0];
      const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const [batchesRes, lotsRes, lotConformRes, weldsRes, weldsUtRes, soilsRes, compZonesRes, compPassRes, topoRes, equipRes] = await Promise.all([
        db.from("concrete_batches").select("id", { count: "exact", head: true }).eq("project_id", projectId).gte("batch_date", monthStart).lt("batch_date", monthEnd),
        db.from("concrete_lots").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_deleted", false).gte("created_at", monthStart).lt("created_at", monthEnd),
        db.from("view_concrete_lot_conformity").select("is_conform").eq("project_id", projectId),
        db.from("weld_records").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_deleted", false).gte("weld_date", monthStart).lt("weld_date", monthEnd),
        db.from("weld_records").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_deleted", false).eq("has_ut", true).gte("weld_date", monthStart).lt("weld_date", monthEnd),
        db.from("soil_samples").select("id", { count: "exact", head: true }).eq("project_id", projectId).gte("created_at", monthStart).lt("created_at", monthEnd),
        db.from("compaction_zones").select("id", { count: "exact", head: true }).eq("project_id", projectId).gte("test_date", monthStart).lt("test_date", monthEnd),
        db.from("compaction_zones").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("overall_result", "pass").gte("test_date", monthStart).lt("test_date", monthEnd),
        db.from("topography_controls").select("id", { count: "exact", head: true }).eq("project_id", projectId).gte("control_date", monthStart).lt("control_date", monthEnd),
        db.from("topography_equipment").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "active").lte("calibration_valid_until", in30d).gte("calibration_valid_until", today),
      ]);

      const lotConformData = lotConformRes.data ?? [];
      const totalLots = lotConformData.length;
      const conformLots = lotConformData.filter((l: any) => l.is_conform === true).length;

      const compTotal = compZonesRes.count ?? 0;
      const compPass = compPassRes.count ?? 0;

      setData({
        concrete: {
          batches: batchesRes.count ?? 0,
          lots: lotsRes.count ?? 0,
          conformRate: totalLots > 0 ? Math.round((conformLots / totalLots) * 100) : null,
        },
        welds: {
          total: weldsRes.count ?? 0,
          withUT: weldsUtRes.count ?? 0,
        },
        soils: {
          samples: soilsRes.count ?? 0,
          compactionTests: compTotal,
          conformRate: compTotal > 0 ? Math.round((compPass / compTotal) * 100) : null,
        },
        topography: {
          controls: topoRes.count ?? 0,
          expiringEquipment: equipRes.count ?? 0,
        },
      });
    })();
  }, [projectId, monthStart, monthEnd]);

  if (!data) return null;

  const cards = [
    {
      title: t("monthlyReport.concrete", { defaultValue: "Betão" }),
      items: [
        { label: t("monthlyReport.batches", { defaultValue: "Amassadas" }), value: data.concrete.batches },
        { label: t("monthlyReport.lots", { defaultValue: "Lotes" }), value: data.concrete.lots },
        { label: t("monthlyReport.conformRate", { defaultValue: "% Conformes" }), value: data.concrete.conformRate !== null ? `${data.concrete.conformRate}%` : "—" },
      ],
      alert: data.concrete.conformRate !== null && data.concrete.conformRate < 95,
    },
    {
      title: t("monthlyReport.welds", { defaultValue: "Soldaduras" }),
      items: [
        { label: "Total", value: data.welds.total },
        { label: t("monthlyReport.withUT", { defaultValue: "Com US" }), value: `${data.welds.withUT}/${data.welds.total}` },
        { label: t("monthlyReport.pendingUT", { defaultValue: "Sem US" }), value: data.welds.total - data.welds.withUT },
      ],
      alert: data.welds.total - data.welds.withUT > 0,
      alertColor: "amber" as const,
    },
    {
      title: t("monthlyReport.soils", { defaultValue: "Solos e Compactação" }),
      items: [
        { label: t("monthlyReport.soilSamples", { defaultValue: "Amostras solo" }), value: data.soils.samples },
        { label: t("monthlyReport.compactionTests", { defaultValue: "Ensaios compactação" }), value: data.soils.compactionTests },
        { label: t("monthlyReport.conformRate", { defaultValue: "% Conformes" }), value: data.soils.conformRate !== null ? `${data.soils.conformRate}%` : "—" },
      ],
      alert: data.soils.conformRate !== null && data.soils.conformRate < 95,
    },
    {
      title: t("monthlyReport.topography", { defaultValue: "Topografia" }),
      items: [
        { label: t("monthlyReport.controls", { defaultValue: "Levantamentos" }), value: data.topography.controls },
        { label: t("monthlyReport.expiringEquip", { defaultValue: "Equip. a expirar" }), value: data.topography.expiringEquipment },
      ],
      alert: data.topography.expiringEquipment > 0,
      alertColor: "amber" as const,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {t("monthlyReport.ensaiosSection", { defaultValue: "Ensaios e Controlo" })}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, ci) => (
          <Card key={ci} className="border-0 bg-card shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{card.title}</p>
                {card.alert && (
                  <Badge variant="secondary" className={cn("text-[9px]",
                    card.alertColor === "amber"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-destructive/10 text-destructive"
                  )}>!</Badge>
                )}
              </div>
              <div className="space-y-1.5">
                {card.items.map((item, ii) => (
                  <div key={ii} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold tabular-nums text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

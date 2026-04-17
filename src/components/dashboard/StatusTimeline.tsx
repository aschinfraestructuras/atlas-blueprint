import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export interface TimelineItem {
  id: string;
  label: string;
  /** ISO date string */
  startDate: string;
  /** ISO date string (opcional — se ausente, considera-se em curso) */
  endDate?: string | null;
  /** Categoria visual: define a cor da barra */
  variant?: "open" | "in_progress" | "closed" | "warning" | "critical";
  /** Texto auxiliar mostrado no tooltip */
  meta?: string;
  /** URL para navegar ao clicar */
  href?: string;
}

interface StatusTimelineProps {
  title: string;
  items: TimelineItem[];
  /** Número de meses para retroceder a partir de hoje (default: 6) */
  monthsBack?: number;
  emptyLabel?: string;
}

const VARIANT_CLASSES: Record<NonNullable<TimelineItem["variant"]>, string> = {
  open: "bg-amber-500/70 hover:bg-amber-500",
  in_progress: "bg-primary/70 hover:bg-primary",
  closed: "bg-emerald-500/70 hover:bg-emerald-500",
  warning: "bg-orange-500/70 hover:bg-orange-500",
  critical: "bg-destructive/70 hover:bg-destructive",
};

/**
 * Timeline visual estilo "Gantt" para eventos com data de início e fim.
 * Útil para mostrar evolução de NCs, PPIs, materiais ou qualquer entidade temporal.
 */
export function StatusTimeline({
  title,
  items,
  monthsBack = 6,
  emptyLabel,
}: StatusTimelineProps) {
  const { t, i18n } = useTranslation();

  const { rangeStart, rangeEnd, totalMs, monthMarks } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getFullYear(), end.getMonth() - monthsBack + 1, 1);
    start.setHours(0, 0, 0, 0);
    const total = end.getTime() - start.getTime();
    const marks: { label: string; offsetPct: number }[] = [];
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const offset = ((d.getTime() - start.getTime()) / total) * 100;
      marks.push({
        label: d.toLocaleDateString(i18n.language, { month: "short" }).replace(".", ""),
        offsetPct: offset,
      });
    }
    return { rangeStart: start, rangeEnd: end, totalMs: total, monthMarks: marks };
  }, [monthsBack, i18n.language]);

  const visibleItems = useMemo(() => {
    return items
      .map(item => {
        const start = new Date(item.startDate).getTime();
        const end = item.endDate ? new Date(item.endDate).getTime() : Date.now();
        if (isNaN(start)) return null;
        const clampedStart = Math.max(start, rangeStart.getTime());
        const clampedEnd = Math.min(end, rangeEnd.getTime());
        if (clampedEnd < rangeStart.getTime() || clampedStart > rangeEnd.getTime()) return null;
        const leftPct = ((clampedStart - rangeStart.getTime()) / totalMs) * 100;
        const widthPct = Math.max(((clampedEnd - clampedStart) / totalMs) * 100, 0.5);
        return { ...item, leftPct, widthPct, isOngoing: !item.endDate };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [items, rangeStart, rangeEnd, totalMs]);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {title}
          <Badge variant="secondary" className="ml-auto text-[10px] font-normal">
            {monthsBack} {t("timeline.months", { defaultValue: "meses" })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {visibleItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {emptyLabel ?? t("timeline.empty", { defaultValue: "Sem eventos no período" })}
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="space-y-1">
              {/* Cabeçalho com marcas de meses */}
              <div className="relative h-5 mb-2 border-b border-border">
                {monthMarks.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 text-[9px] text-muted-foreground uppercase tracking-wider"
                    style={{ left: `${m.offsetPct}%` }}
                  >
                    <div className="absolute top-3 left-0 w-px h-2 bg-border" />
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Barras */}
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {visibleItems.map((item) => {
                  const cls = VARIANT_CLASSES[item.variant ?? "in_progress"];
                  const bar = (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute h-full rounded transition-all cursor-pointer",
                        cls,
                        item.isOngoing && "border-r-2 border-dashed border-current",
                      )}
                      style={{ left: `${item.leftPct}%`, width: `${item.widthPct}%` }}
                    />
                  );
                  return (
                    <div key={item.id} className="grid grid-cols-[140px_1fr] gap-2 items-center group">
                      <div className="text-xs truncate text-foreground/80" title={item.label}>
                        {item.label}
                      </div>
                      <div className="relative h-5 bg-muted/40 rounded overflow-hidden">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {item.href ? (
                              <a href={item.href} className="block w-full h-full">{bar}</a>
                            ) : (
                              bar
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-semibold">{item.label}</div>
                            <div className="text-muted-foreground">
                              {new Date(item.startDate).toLocaleDateString(i18n.language)}
                              {" → "}
                              {item.endDate ? new Date(item.endDate).toLocaleDateString(i18n.language) : t("timeline.ongoing", { defaultValue: "em curso" })}
                            </div>
                            {item.meta && <div className="text-muted-foreground">{item.meta}</div>}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

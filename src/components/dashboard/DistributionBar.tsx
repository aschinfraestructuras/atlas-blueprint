import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))", "hsl(var(--chart-1))",
];

interface DistributionBarProps {
  title: string;
  icon?: LucideIcon;
  entries: { key: string; label: string; value: number }[];
  maxItems?: number;
}

/**
 * Horizontal bar distribution chart — reusable across all modules.
 * Follows the Suppliers page visual pattern.
 */
export function DistributionBar({ title, icon: Icon, entries, maxItems = 8 }: DistributionBarProps) {
  const top = entries.sort((a, b) => b.value - a.value).slice(0, maxItems);
  const maxVal = Math.max(...top.map(e => e.value), 1);

  if (top.length === 0) return null;

  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4 pb-4 px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
          {Icon && <Icon className="h-3.5 w-3.5" />}{title}
        </p>
        <div className="space-y-2">
          {top.map(({ key, label, value }, i) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 truncate text-right">{label}</span>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground w-8 text-right">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface StackedBarProps {
  title: string;
  icon?: LucideIcon;
  segments: { key: string; label: string; value: number; color: string }[];
}

/**
 * Stacked horizontal bar with legend — shows proportions (e.g. status distribution).
 */
export function StackedBar({ title, icon: Icon, segments }: StackedBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4 pb-4 px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5 mb-3">
          {Icon && <Icon className="h-3.5 w-3.5" />}{title}
        </p>
        <div className="h-6 rounded-full overflow-hidden flex bg-muted/30">
          {segments.filter(s => s.value > 0).map(seg => (
            <div
              key={seg.key}
              className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {segments.filter(s => s.value > 0).map(seg => (
            <div key={seg.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              {seg.label} <span className="font-bold text-foreground">{seg.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

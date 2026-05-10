import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";

/**
 * ATLAS GLASS KPI
 * Floating dark-glass KPI card designed for use on <CommandSurface>.
 * Reusable across dashboard hero, executive overviews, module summaries.
 *
 * Layout: icon · label/value · optional sparkline · optional ratio.
 */
type Tone = "cyan" | "amber" | "red" | "green";

interface GlassKPIProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /** e.g. "/ 12" — denominator shown in muted style next to value */
  ratio?: string;
  /** Sub-line under the value, for context (e.g. "0% aprovados") */
  hint?: string;
  tone?: Tone;
  /** Sparkline values 0..N for tiny inline trend chart (max 12 pts ideal). */
  sparkline?: number[];
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

const TONE_HSL: Record<Tone, string> = {
  cyan:  "188 92% 58%",
  amber: "38 90% 60%",
  red:   "0 75% 62%",
  green: "150 60% 55%",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 56, h = 16;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible flex-shrink-0">
      <polyline
        fill="none"
        stroke={`hsl(${color} / 0.85)`}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function GlassKPI({
  icon: Icon, label, value, ratio, hint, tone = "cyan",
  sparkline, onClick, loading, className,
}: GlassKPIProps) {
  const color = TONE_HSL[tone];
  return (
    <GlassPanel
      interactive={!!onClick}
      tone={tone}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn("group p-3 sm:p-3.5 min-w-0", className)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: `hsl(${color} / 0.14)`, border: `1px solid hsl(${color} / 0.25)` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: `hsl(${color})` }} />
        </div>
        {onClick && (
          <ChevronRight className="h-3 w-3 text-white/25 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
      <p className="atlas-label truncate mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-white leading-none">
            {loading ? "—" : value}
          </span>
          {ratio && <span className="text-[10px] text-white/40 tabular-nums">{ratio}</span>}
        </div>
        {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} color={color} />}
      </div>
      {hint && <p className="text-[10px] text-white/40 truncate mt-1">{hint}</p>}
    </GlassPanel>
  );
}

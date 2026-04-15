import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface SparklineKPIProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  sparkData?: { v: number }[];
  color?: string;     // HSL string like "0 65% 50%"
  onClick?: () => void;
  loading?: boolean;
}

export function SparklineKPI({ label, value, subtitle, icon: Icon, sparkData, color, onClick, loading }: SparklineKPIProps) {
  const fillColor = color ? `hsl(${color})` : "hsl(var(--primary))";
  const gradientId = `spark-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <Card
      className={cn(
        "border border-border/40 bg-card shadow-card transition-all overflow-hidden group relative",
        onClick && "cursor-pointer hover:shadow-card-hover hover:border-border/60 active:scale-[0.97]",
      )}
      onClick={onClick}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-50 group-hover:opacity-80 transition-opacity"
        style={{ backgroundColor: fillColor }}
      />
      <CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
        {/* Left: icon + text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md flex-shrink-0"
              style={{ backgroundColor: `${fillColor}12` }}
            >
              <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color: fillColor }} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground truncate leading-none">
              {label}
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <div className="pl-0.5">
              <p className="text-xl sm:text-2xl font-black tabular-nums text-foreground leading-none">
                {value}
              </p>
              {subtitle && (
                <p className="text-[8px] sm:text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        {/* Right: sparkline */}
        {sparkData && sparkData.length > 1 && (
          <div className="w-[56px] sm:w-[72px] h-8 sm:h-9 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={fillColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Hover arrow */}
        {onClick && (
          <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all absolute bottom-2.5 right-2.5" />
        )}
      </CardContent>
    </Card>
  );
}

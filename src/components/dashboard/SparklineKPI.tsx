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
  // Stable gradient ID using a sanitized label
  const gradientId = `spark-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <Card
      className={cn(
        "border border-transparent bg-card shadow-card transition-all overflow-hidden group relative",
        onClick && "cursor-pointer hover:shadow-card-hover hover:border-border/50",
      )}
      onClick={onClick}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ backgroundColor: fillColor }}
      />
      <CardContent className="p-4 flex items-center gap-3">
        {/* Left: icon + text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-md"
              style={{ backgroundColor: `${fillColor}15` }}
            >
              <Icon className="h-3 w-3" style={{ color: fillColor }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground truncate">
              {label}
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-14" />
          ) : (
            <div>
              <p className="text-2xl font-black tabular-nums text-foreground leading-none">
                {value}
              </p>
              {subtitle && (
                <p className="text-[9px] text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        {/* Right: sparkline */}
        {sparkData && sparkData.length > 1 && (
          <div className="w-[72px] h-9 flex-shrink-0 opacity-50 group-hover:opacity-80 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
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
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all absolute bottom-3 right-3" />
        )}
      </CardContent>
    </Card>
  );
}

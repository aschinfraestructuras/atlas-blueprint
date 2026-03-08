import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SparklineKPIProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sparkData?: { v: number }[];
  color?: string;     // HSL string like "0 65% 50%"
  onClick?: () => void;
  loading?: boolean;
}

export function SparklineKPI({ label, value, icon: Icon, sparkData, color, onClick, loading }: SparklineKPIProps) {
  const fillColor = color ? `hsl(${color})` : "hsl(var(--primary))";
  const fillColorFaded = color ? `hsl(${color} / 0.15)` : "hsl(var(--primary) / 0.15)";

  return (
    <Card
      className={cn(
        "border-0 bg-card shadow-card transition-all overflow-hidden group",
        onClick && "cursor-pointer hover:shadow-card-hover",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        {/* Left: icon + text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground truncate">
              {label}
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <p className="text-2xl font-black tabular-nums text-foreground leading-none">
              {value}
            </p>
          )}
        </div>
        {/* Right: sparkline */}
        {sparkData && sparkData.length > 1 && (
          <div className="w-16 h-8 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={fillColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label})`}
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

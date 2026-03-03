import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModuleKPICardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

export function ModuleKPICard({ label, value, icon: Icon, color, active, onClick }: ModuleKPICardProps) {
  return (
    <Card
      className={cn(
        "border shadow-none transition-all",
        active && "border-primary/50 bg-primary/5",
        onClick && "cursor-pointer hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-2.5 px-3 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Icon className="h-3 w-3" style={color ? { color } : undefined} />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        </div>
        <p className="text-lg font-bold tabular-nums text-foreground" style={color ? { color } : undefined}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

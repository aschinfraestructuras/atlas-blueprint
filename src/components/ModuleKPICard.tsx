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
        "border transition-all relative overflow-hidden",
        active && "border-primary/40 bg-primary/5",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        !active && "shadow-none hover:shadow-sm",
      )}
      onClick={onClick}
    >
      {/* Borda superior colorida — toque visual do Replit */}
      {color && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: color }}
        />
      )}
      <CardContent className="pt-4 pb-3 px-3 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <Icon className="h-3.5 w-3.5" style={color ? { color } : { color: "hsl(var(--muted-foreground))" }} />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        </div>
        <p
          className="text-2xl font-black tabular-nums leading-none"
          style={color ? { color } : undefined}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

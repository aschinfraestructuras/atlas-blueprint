import { Ban, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  isBlocked: boolean;
  reasons?: string[] | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Visual badge that flags a Material as blocked from use on site.
 * Reasons are stored as machine-readable strings: `docs_expired:N`, `nc_open:N`, `tests_failed_90d:N`.
 */
export function MaterialBlockedBadge({ isBlocked, reasons, size = "sm", className }: Props) {
  if (!isBlocked) return null;

  const parsed = (reasons ?? []).map((r) => {
    const [code, count] = r.split(":");
    return { code, count: count ?? "" };
  });

  const labelMap: Record<string, string> = {
    docs_expired: "Docs expirados",
    nc_open: "NCs abertas",
    tests_failed_90d: "Ensaios reprovados (90d)",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            className={cn(
              "gap-1 font-bold uppercase tracking-wider",
              size === "sm" ? "text-[10px] px-1.5 py-0 h-5" : "text-xs",
              className,
            )}
          >
            <Ban className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            Bloqueado
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            Material bloqueado
          </div>
          <ul className="text-xs space-y-0.5">
            {parsed.length === 0 ? (
              <li>Sem detalhes disponíveis</li>
            ) : (
              parsed.map((p, i) => (
                <li key={i}>
                  • {labelMap[p.code] ?? p.code}
                  {p.count ? ` (${p.count})` : ""}
                </li>
              ))
            )}
          </ul>
          <p className="text-[10px] mt-1.5 opacity-70">
            Não pode ser usado em frentes de obra até resolução.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

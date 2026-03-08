import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyableCodeProps {
  /** The value to display and copy */
  value: string;
  className?: string;
  /** Optional label shown instead of value */
  label?: string;
}

export function CopyableCode({ value, label, className }: CopyableCodeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: t("share.refCopied", { value }) });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silently fail */
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono",
            "bg-muted/60 text-foreground hover:bg-muted transition-colors cursor-pointer",
            "border border-border/40",
            className,
          )}
        >
          {label ?? value}
          {copied ? (
            <Check className="h-3 w-3 text-chart-2 flex-shrink-0" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{t("share.clickToCopy")}</TooltipContent>
    </Tooltip>
  );
}

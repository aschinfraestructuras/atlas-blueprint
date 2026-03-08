import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Override URL — defaults to current page */
  url?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function ShareButton({
  url,
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = url ?? window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: t("share.linkCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("share.copyError"), variant: "destructive" });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("gap-1.5", className)}
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-chart-2" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {size !== "icon" && t("share.button")}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("share.tooltip")}</TooltipContent>
    </Tooltip>
  );
}

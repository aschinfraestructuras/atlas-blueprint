import { useTranslation } from "react-i18next";
import { MoreHorizontal, Eye, Pencil, Share2, Download, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

export interface RowAction {
  key: string;
  labelKey?: string;
  label?: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive";
  hidden?: boolean;
  disabled?: boolean;
}

interface RowActionMenuProps {
  actions: RowAction[];
  /** If true, automatically adds a "Share" action that copies current row URL */
  shareUrl?: string;
}

export function RowActionMenu({ actions, shareUrl }: RowActionMenuProps) {
  const { t } = useTranslation();

  const allActions = [...actions.filter(a => !a.hidden)];

  if (shareUrl) {
    allActions.push({
      key: "__share",
      label: t("share.button"),
      icon: Share2,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: t("share.linkCopied") });
        } catch { /* ignore */ }
      },
    });
  }

  if (allActions.length === 0) return null;

  const destructiveIdx = allActions.findIndex(a => a.variant === "destructive");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {allActions.map((action, idx) => (
          <span key={action.key}>
            {idx === destructiveIdx && destructiveIdx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled}
              className={action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
            >
              {action.icon && <action.icon className="h-3.5 w-3.5 mr-2" />}
              {action.label ?? (action.labelKey ? t(action.labelKey) : "")}
            </DropdownMenuItem>
          </span>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

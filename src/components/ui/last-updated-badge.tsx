import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastUpdatedBadgeProps {
  updatedAt: string | null | undefined;
  updatedBy?: string | null;
  className?: string;
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("lastUpdated.justNow");
  if (diffMin < 60) return t("lastUpdated.minutesAgo", { count: diffMin });
  if (diffHrs < 24) return t("lastUpdated.hoursAgo", { count: diffHrs });
  if (diffDays < 30) return t("lastUpdated.daysAgo", { count: diffDays });
  return new Date(dateStr).toLocaleDateString();
}

export function LastUpdatedBadge({ updatedAt, updatedBy, className }: LastUpdatedBadgeProps) {
  const { t } = useTranslation();

  if (!updatedAt) return null;

  const relative = formatRelativeTime(updatedAt, t);

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="h-3 w-3" />
      <span>
        {t("lastUpdated.label")}: {relative}
        {updatedBy && (
          <span className="ml-1 text-foreground/70 font-medium">
            {t("lastUpdated.by")} {updatedBy}
          </span>
        )}
      </span>
    </div>
  );
}

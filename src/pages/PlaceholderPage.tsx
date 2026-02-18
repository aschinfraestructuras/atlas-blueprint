import { useTranslation } from "react-i18next";
import { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface PlaceholderPageProps {
  titleKey: string;
  subtitleKey: string;
  icon?: LucideIcon;
}

export default function PlaceholderPage({ titleKey, subtitleKey, icon }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t(titleKey)}
        </h1>
        <p className="text-sm text-muted-foreground">{t(subtitleKey)}</p>
      </div>

      {/* Empty state */}
      <EmptyState icon={icon} />
    </div>
  );
}

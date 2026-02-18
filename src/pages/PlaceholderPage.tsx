import { useTranslation } from "react-i18next";

interface PlaceholderPageProps {
  titleKey: string;
  subtitleKey: string;
}

export default function PlaceholderPage({ titleKey, subtitleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t(titleKey)}</h1>
        <p className="text-sm text-muted-foreground">{t(subtitleKey)}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
      </div>
    </div>
  );
}

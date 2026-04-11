import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crosshair, Package, Clock, ArrowRight } from "lucide-react";

interface CriticalAlertsBannerProps {
  ncOpen: number;
  ncOverdue: number;
  emesExpiring: number;
  pamePending: number;
}

interface AlertItem {
  label: string;
  value: number;
  route: string;
  urgent: boolean;
  Icon: React.ElementType;
}

export function CriticalAlertsBanner({ ncOpen, ncOverdue, emesExpiring, pamePending }: CriticalAlertsBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const alerts: AlertItem[] = [
    { label: t("dashboard.alerts.ncOpen"), value: ncOpen, route: "/non-conformities", urgent: ncOpen > 3, Icon: AlertTriangle },
    { label: t("dashboard.alerts.ncOverdue"), value: ncOverdue, route: "/non-conformities", urgent: true, Icon: Clock },
    { label: t("dashboard.alerts.emesExpiring"), value: emesExpiring, route: "/topography", urgent: emesExpiring > 2, Icon: Crosshair },
    { label: t("dashboard.alerts.pamePending"), value: pamePending, route: "/materials", urgent: false, Icon: Package },
  ];

  const active = alerts.filter(a => a.value > 0);
  if (active.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {active.map((alert) => (
        <div
          key={alert.label}
          onClick={() => navigate(alert.route)}
          className="flex items-center gap-2.5 px-3 py-3 sm:py-2 rounded-lg border border-border/40 bg-muted/30
                     cursor-pointer hover:bg-muted/60 transition-colors min-h-[48px]"
          style={{
            borderLeftWidth: 3,
            borderLeftColor: alert.urgent ? "hsl(var(--destructive))" : "hsl(38 85% 50%)",
          }}
        >
          <alert.Icon
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{ color: alert.urgent ? "hsl(var(--destructive))" : "hsl(38 85% 50%)" }}
          />
          <span className="text-xs text-muted-foreground">{alert.label}</span>
          <span className="text-sm font-black tabular-nums text-foreground ml-auto">{alert.value}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
        </div>
      ))}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, AlertTriangle, ClipboardCheck, FlaskConical,
  Package, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  route: string;
  matchPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, route: "/", matchPrefixes: [] },
  { labelKey: "nav.nonConformities", icon: AlertTriangle, route: "/non-conformities", matchPrefixes: ["/non-conformities"] },
  { labelKey: "nav.ppiInstances", icon: ClipboardCheck, route: "/ppi", matchPrefixes: ["/ppi"] },
  { labelKey: "nav.tests", icon: FlaskConical, route: "/tests", matchPrefixes: ["/tests"] },
  { labelKey: "nav.materials", icon: Package, route: "/materials", matchPrefixes: ["/materials"] },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.route === "/") return location.pathname === "/";
    return item.matchPrefixes?.some(p => location.pathname.startsWith(p)) ?? false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 min-w-0 transition-colors",
                "active:scale-95 active:bg-muted/50",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className={cn(
                "text-[9px] font-semibold truncate max-w-[64px]",
                active && "font-bold"
              )}>
                {t(item.labelKey)}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

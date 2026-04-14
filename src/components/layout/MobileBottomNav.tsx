import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, AlertTriangle, ClipboardCheck, FlaskConical,
  Package, MoreHorizontal, CalendarClock, Construction,
  ClipboardList, Clock, X, CalendarCheck, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectRole } from "@/hooks/useProjectRole";

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  route: string;
  matchPrefixes: string[];
  viewerVisible?: boolean;
}

const PRIMARY_ITEMS: NavItem[] = [
  { labelKey: "nav.directionPortal",  icon: Building2,       route: "/direction-portal",  matchPrefixes: ["/direction-portal"], viewerVisible: true },
  { labelKey: "nav.ppi",              icon: ClipboardCheck,  route: "/ppi",               matchPrefixes: ["/ppi"],              viewerVisible: true },
  { labelKey: "nav.nonConformities",  icon: AlertTriangle,   route: "/non-conformities",  matchPrefixes: ["/non-conformities"], viewerVisible: true },
  { labelKey: "nav.tests",            icon: FlaskConical,    route: "/tests",             matchPrefixes: ["/tests"] },
];

const MORE_ITEMS: NavItem[] = [
  { labelKey: "nav.myTasks",      icon: CalendarCheck, route: "/my-tasks",      matchPrefixes: ["/my-tasks"] },
  { labelKey: "nav.planning",     icon: CalendarClock, route: "/planning",      matchPrefixes: ["/planning"] },
  { labelKey: "nav.workItems",    icon: Construction,  route: "/work-items",    matchPrefixes: ["/work-items"] },
  { labelKey: "nav.dailyReports", icon: ClipboardList, route: "/daily-reports", matchPrefixes: ["/daily-reports"] },
  { labelKey: "nav.materials",    icon: Package,       route: "/materials",     matchPrefixes: ["/materials"] },
  { labelKey: "nav.deadlines",    icon: Clock,         route: "/deadlines",     matchPrefixes: ["/deadlines"] },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useProjectRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isViewer = role === "viewer";

  // Filtrar itens conforme role
  const visiblePrimary = isViewer
    ? PRIMARY_ITEMS.filter(i => i.viewerVisible)
    : PRIMARY_ITEMS;
  const visibleMore = isViewer ? [] : MORE_ITEMS;

  // Fechar drawer ao navegar
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const isActive = (item: NavItem): boolean => {
    if (item.route === "/") return location.pathname === "/";
    return item.matchPrefixes.some(p => location.pathname.startsWith(p));
  };

  const isMoreActive = visibleMore.some(isActive);

  return (
    <>
      {/* Overlay quando drawer aberto */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Drawer "Mais" — só para não-viewers */}
      {!isViewer && (
        <div
          ref={drawerRef}
          className={cn(
            "fixed left-0 right-0 z-50 lg:hidden",
            "bg-card border-t border-border",
            "transition-transform duration-200 ease-out will-change-transform",
            moreOpen ? "translate-y-0" : "translate-y-full",
            "bottom-14"
          )}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("nav.more", { defaultValue: "Mais módulos" })}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3">
            {visibleMore.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  onClick={() => { setMoreOpen(false); navigate(item.route); }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all active:scale-95",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  <span className={cn(
                    "text-[10px] font-medium text-center leading-tight",
                    active && "font-semibold"
                  )}>
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra principal */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden safe-area-bottom">
        <div className="flex items-stretch justify-around h-14">
          {visiblePrimary.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                onClick={() => { setMoreOpen(false); navigate(item.route); }}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-w-0 transition-colors",
                  "active:scale-95 active:bg-muted/50",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className={cn("text-[9px] font-semibold truncate max-w-[64px]", active && "font-bold")}>
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}

          {/* Botão Mais — só para não-viewers */}
          {!isViewer && (
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-w-0 transition-colors",
              "active:scale-95 active:bg-muted/50",
              (moreOpen || isMoreActive) ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {(moreOpen || isMoreActive) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
            {moreOpen
              ? <X className="h-5 w-5 stroke-[2.5]" />
              : <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
            }
            <span className={cn("text-[9px] font-semibold", (moreOpen || isMoreActive) && "font-bold")}>
              {t("nav.more", { defaultValue: "Mais" })}
            </span>
          </button>
          )}
        </div>
      </nav>
    </>
  );
}

import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Truck,
  FlaskConical,
  AlertTriangle,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  key: keyof ReturnType<typeof useTranslation>["t"] | string;
  labelKey: string;
  url: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", labelKey: "nav.dashboard", url: "/", icon: LayoutDashboard },
  { key: "projects", labelKey: "nav.projects", url: "/projects", icon: FolderKanban },
  { key: "documents", labelKey: "nav.documents", url: "/documents", icon: FileText },
  { key: "suppliers", labelKey: "nav.suppliers", url: "/suppliers", icon: Truck },
  { key: "tests", labelKey: "nav.tests", url: "/tests", icon: FlaskConical },
  { key: "nonConformities", labelKey: "nav.nonConformities", url: "/non-conformities", icon: AlertTriangle },
  { key: "settings", labelKey: "nav.settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 z-20",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 px-3 border-b border-sidebar-border flex-shrink-0",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-widest text-sidebar-foreground uppercase">
            {t("common.appName")}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);

          return (
            <NavLink
              key={item.key}
              to={item.url}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-full h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center" : "justify-end px-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

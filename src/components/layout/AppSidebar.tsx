import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Truck,
  FlaskConical,
  AlertTriangle,
  ScrollText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarNavItem {
  labelKey: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
}

interface SidebarSection {
  sectionKey: string;
  items: SidebarNavItem[];
}

const NAV_SECTIONS: SidebarSection[] = [
  {
    sectionKey: "core",
    items: [
      { labelKey: "nav.dashboard", url: "/", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    sectionKey: "projectManagement",
    items: [
      { labelKey: "nav.projects", url: "/projects", icon: FolderKanban },
      { labelKey: "nav.documents", url: "/documents", icon: FileText },
      { labelKey: "nav.tests", url: "/tests", icon: FlaskConical },
      { labelKey: "nav.suppliers", url: "/suppliers", icon: Truck },
      { labelKey: "nav.nonConformities", url: "/non-conformities", icon: AlertTriangle },
    ],
  },
  {
    sectionKey: "system",
    items: [
      { labelKey: "nav.auditLog", url: "/audit", icon: ScrollText },
      { labelKey: "nav.settings", url: "/settings", icon: Settings },
    ],
  },
];

interface SidebarContentProps {
  collapsed: boolean;
  onClose?: () => void;
}

function SidebarContent({ collapsed, onClose }: SidebarContentProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-sidebar-border flex-shrink-0 px-4",
          collapsed ? "justify-center px-3" : "gap-3"
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-[0.15em] text-sidebar-foreground uppercase">
            {t("common.appName")}
          </span>
        )}
        {/* Mobile close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.sectionKey}>
            {sectionIdx > 0 && <Separator className="mb-4 bg-sidebar-border" />}
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {t(`nav.sections.${section.sectionKey}`)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-md text-sm font-medium transition-colors h-9",
                      collapsed ? "justify-center px-2" : "px-2.5",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50"
                      )}
                    />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only, no onClose means desktop) */}
      {!onClose && (
        <div className="flex-shrink-0 border-t border-sidebar-border p-2">
          <div className={cn("flex", collapsed ? "justify-center" : "justify-end")}>
            <span className="text-[10px] text-sidebar-foreground/30 uppercase tracking-widest mr-auto pl-1 hidden" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Desktop sidebar ─── */
interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 relative",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle button on the edge */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-3 top-[68px] z-10",
            "flex h-6 w-6 items-center justify-center rounded-full",
            "bg-background border border-border shadow-sm",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer panel */}
          <aside className="relative flex w-[220px] flex-col h-full bg-sidebar border-r border-sidebar-border shadow-xl">
            <SidebarContent collapsed={false} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

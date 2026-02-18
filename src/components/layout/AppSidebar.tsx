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
  Inbox,
  BookOpen,
  Map,
  HardHat,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      { labelKey: "nav.projects",         url: "/projects",          icon: FolderKanban  },
      { labelKey: "nav.documents",         url: "/documents",         icon: FileText       },
      { labelKey: "nav.tests",             url: "/tests",             icon: FlaskConical   },
      { labelKey: "nav.suppliers",         url: "/suppliers",         icon: Truck          },
      { labelKey: "nav.nonConformities",   url: "/non-conformities",  icon: AlertTriangle  },
    ],
  },
  {
    sectionKey: "technicalOfficeSection",
    items: [
      { labelKey: "nav.technicalOffice", url: "/technical-office", icon: Inbox    },
      { labelKey: "nav.plans",           url: "/plans",            icon: BookOpen },
    ],
  },
  {
    sectionKey: "fieldSection",
    items: [
      { labelKey: "nav.survey",          url: "/survey",          icon: Map     },
      { labelKey: "nav.subcontractors",  url: "/subcontractors",  icon: HardHat },
    ],
  },
  {
    sectionKey: "system",
    items: [
      { labelKey: "nav.auditLog",  url: "/audit",    icon: ScrollText },
      { labelKey: "nav.settings",  url: "/settings", icon: Settings   },
    ],
  },
];

/* ─── Section separator label ─── */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 h-px bg-sidebar-border/60 mx-2" />;
  }
  return (
    <div className="flex items-center gap-2 px-3 mb-1 mt-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/35 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-sidebar-border/40" />
    </div>
  );
}

/* ─── Navigation item ─── */
function NavItem({
  item,
  active,
  collapsed,
  onClose,
}: {
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
  onClose?: () => void;
}) {
  const Icon = item.icon;
  const { t } = useTranslation();

  return (
    <NavLink
      to={item.url}
      onClick={onClose}
      className={cn(
        "relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 h-9",
        collapsed ? "justify-center px-0 mx-1" : "px-3 mx-1",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary" />
      )}
      <Icon
        className={cn(
          "h-[15px] w-[15px] flex-shrink-0 transition-colors",
          collapsed ? "" : "ml-1",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/45"
        )}
      />
      {!collapsed && (
        <span className="truncate leading-none">{t(item.labelKey)}</span>
      )}
    </NavLink>
  );
}

/* ─── Sidebar content ─── */
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
      {/* ── Brand / Logo ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[60px] border-b border-sidebar-border/60 flex-shrink-0 px-4",
          collapsed ? "justify-center px-3" : "gap-3"
        )}
      >
        {/* Logo mark */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
        </div>

        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-black tracking-[0.22em] text-sidebar-accent-foreground uppercase leading-none">
              ATLAS
            </span>
            <span className="text-[9px] font-medium tracking-[0.12em] text-sidebar-foreground/45 uppercase leading-none mt-0.5">
              Quality Platform
            </span>
          </div>
        )}

        {/* Mobile close */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.sectionKey} className={sectionIdx > 0 ? "mt-1" : ""}>
            {sectionIdx > 0 && (
              <SectionLabel
                label={t(`nav.sections.${section.sectionKey}`)}
                collapsed={collapsed}
              />
            )}
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  active={isActive(item.url, item.exact)}
                  collapsed={collapsed}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer spacer (desktop only) ──────────────────────────────── */}
      {!onClose && (
        <div className="flex-shrink-0 border-t border-sidebar-border/60 py-2 px-3">
          {!collapsed && (
            <p className="text-[9px] text-sidebar-foreground/25 uppercase tracking-widest">
              © {new Date().getFullYear()} Atlas QMS
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Desktop + Mobile sidebar ──────────────────────────────────────────── */
interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border/60",
          "transition-all duration-300 flex-shrink-0 relative",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle on edge */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-3 top-[70px] z-10",
            "flex h-6 w-6 items-center justify-center rounded-full",
            "bg-sidebar border border-sidebar-border/80 shadow-sm",
            "text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft  className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative flex w-[220px] flex-col h-full bg-sidebar border-r border-sidebar-border/60 shadow-2xl">
            <SidebarContent collapsed={false} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

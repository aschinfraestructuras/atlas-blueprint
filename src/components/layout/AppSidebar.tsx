import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
  LayoutDashboard, FolderKanban, FileText, Truck, Package,
  FlaskConical, AlertTriangle, ScrollText, Settings,
  ShieldCheck, ChevronLeft, ChevronRight, X,
  Inbox, BookOpen, Map, HardHat, Construction, ClipboardCheck, Crosshair, CalendarClock,
  Clock, FileCheck, BarChart3, Building2, MessageSquareText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarNavItem {
  labelKey: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
  requiredAction?: string;
  adminOnly?: boolean;
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
      { labelKey: "nav.projects",       url: "/projects",         icon: FolderKanban },
      { labelKey: "nav.documents",      url: "/documents",        icon: FileText },
      { labelKey: "nav.tests",          url: "/tests",            icon: FlaskConical },
      { labelKey: "nav.laboratories",    url: "/laboratories",     icon: Building2 },
      { labelKey: "nav.suppliers",      url: "/suppliers",        icon: Truck },
      { labelKey: "nav.materials",      url: "/materials",        icon: Package },
      { labelKey: "nav.nonConformities", url: "/non-conformities", icon: AlertTriangle },
    ],
  },
  {
    sectionKey: "technicalOfficeSection",
    items: [
      { labelKey: "nav.technicalOffice", url: "/technical-office", icon: Inbox },
      
      { labelKey: "nav.plans",           url: "/plans",            icon: BookOpen },
      { labelKey: "nav.planning",        url: "/planning",         icon: CalendarClock },
    ],
  },
  {
    sectionKey: "fieldSection",
    items: [
      { labelKey: "nav.topography",    url: "/topography",      icon: Crosshair },
      { labelKey: "nav.subcontractors", url: "/subcontractors",  icon: HardHat },
      { labelKey: "nav.workItems",      url: "/work-items",      icon: Construction },
      { labelKey: "nav.ppi",            url: "/ppi",             icon: ClipboardCheck },
    ],
  },
  {
    sectionKey: "system",
    items: [
      { labelKey: "nav.deadlines",    url: "/deadlines",     icon: Clock },
      { labelKey: "nav.qcReport",     url: "/reports/qc",    icon: BarChart3 },
      { labelKey: "nav.auditLog",     url: "/audit",         icon: ScrollText,  requiredAction: "viewAudit" },
      { labelKey: "nav.health",       url: "/admin/health",  icon: ShieldCheck, adminOnly: true },
      { labelKey: "nav.settings",     url: "/settings",      icon: Settings,    adminOnly: true },
    ],
  },
];

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2.5 h-px mx-2.5 bg-sidebar-border/40" />;
  return (
    <div className="flex items-center gap-2 px-3 mb-1 mt-4">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap text-sidebar-foreground/35">
        {label}
      </span>
      <div className="flex-1 h-px bg-sidebar-border/30" />
    </div>
  );
}

function NavItem({ item, active, collapsed, onClose }: {
  item: SidebarNavItem; active: boolean; collapsed: boolean; onClose?: () => void;
}) {
  const Icon = item.icon;
  const { t } = useTranslation();

  return (
    <NavLink
      to={item.url}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg text-sm font-medium h-[36px]",
        "transition-all duration-150",
        collapsed ? "justify-center px-0 mx-1.5" : "px-3 mx-1.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/50"
      )}
    >
      {active && (
        <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-sidebar-primary" />
      )}
      <Icon className={cn(
        "flex-shrink-0 transition-all duration-150",
        collapsed ? "h-4 w-4" : "h-[15px] w-[15px]",
        active ? "text-sidebar-primary" : "opacity-50 group-hover:opacity-75"
      )} />
      {!collapsed && (
        <span className="truncate leading-none text-[12.5px] tracking-[0.01em]">{t(item.labelKey)}</span>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useProjectRole();

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <div className="flex flex-col h-full bg-sidebar">

      {/* ── Brand ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[56px] flex-shrink-0 px-4 cursor-pointer select-none border-b border-sidebar-border/50",
          collapsed ? "justify-center px-3" : "gap-3"
        )}
        onClick={() => navigate("/")}
        role="button"
        aria-label="Go to Dashboard"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 bg-sidebar-primary/15 border border-sidebar-primary/25">
          <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-black tracking-[0.24em] uppercase leading-none text-sidebar-foreground">
              ATLAS
            </span>
            <span className="text-[8px] font-medium tracking-[0.16em] uppercase leading-none mt-[3px] text-sidebar-foreground/35">
              Quality Platform
            </span>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="ml-auto h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.sectionKey}>
            {idx > 0 && <SectionLabel label={t(`nav.sections.${section.sectionKey}`)} collapsed={collapsed} />}
            <div className="space-y-[2px]">
              {section.items
                .filter(item => {
                  if (item.adminOnly && !isAdmin) return false;
                  if (item.requiredAction && !can(item.requiredAction)) return false;
                  return true;
                })
                .map(item => (
                  <NavItem key={item.url} item={item} active={isActive(item.url, item.exact)} collapsed={collapsed} onClose={onClose} />
                ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────── */}
      {!onClose && (
        <div className="flex-shrink-0 py-3 px-3 border-t border-sidebar-border/40">
          {!collapsed && (
            <p className="text-[8px] uppercase tracking-widest text-sidebar-foreground/25">
              © {new Date().getFullYear()} Atlas QMS
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen flex-shrink-0 relative border-r border-sidebar-border/40",
          "transition-all duration-300",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
        style={{ boxShadow: "2px 0 16px 0 hsl(218 40% 8% / 0.20)" }}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={onToggle}
          className="absolute -right-3 top-[68px] z-10 flex h-6 w-6 items-center justify-center rounded-full bg-sidebar border border-sidebar-border hover:scale-110 transition-all duration-150"
          style={{ color: "hsl(var(--sidebar-primary))" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 backdrop-blur-sm bg-foreground/20" onClick={onMobileClose} />
          <aside className="relative flex w-[220px] flex-col h-full shadow-2xl border-r border-sidebar-border/30">
            <SidebarContent collapsed={false} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

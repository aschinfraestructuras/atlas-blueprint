import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import {
  LayoutDashboard, FolderKanban, FileText, Truck, Package,
  FlaskConical, AlertTriangle, ScrollText, Settings,
  ShieldCheck, ChevronLeft, ChevronRight, X, ChevronDown,
  Inbox, BookOpen, Map, HardHat, Construction, ClipboardCheck, Crosshair, CalendarClock,
  Clock, FileCheck, BarChart3, Building2, ClipboardList, Leaf, GraduationCap, FileBarChart2,
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
  collapsible?: boolean;
}

const NAV_SECTIONS: SidebarSection[] = [
  {
    sectionKey: "core",
    collapsible: false,
    items: [
      { labelKey: "nav.dashboard", url: "/", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    sectionKey: "execution",
    collapsible: true,
    items: [
      { labelKey: "nav.workItems",      url: "/work-items",      icon: Construction },
      { labelKey: "nav.ppi",            url: "/ppi",             icon: ClipboardCheck },
      { labelKey: "nav.dailyReports",   url: "/daily-reports",   icon: ClipboardList },
      { labelKey: "nav.planning",        url: "/planning",        icon: CalendarClock },
      { labelKey: "nav.topography",    url: "/topography",      icon: Crosshair },
    ],
  },
  {
    sectionKey: "quality",
    collapsible: true,
    items: [
      { labelKey: "nav.nonConformities", url: "/non-conformities", icon: AlertTriangle },
      { labelKey: "nav.tests",          url: "/tests",            icon: FlaskConical },
      { labelKey: "nav.materials",      url: "/materials",        icon: Package },
      { labelKey: "nav.subcontractors", url: "/subcontractors",  icon: HardHat },
      { labelKey: "nav.suppliers",      url: "/suppliers",        icon: Truck },
      { labelKey: "nav.laboratories",    url: "/laboratories",     icon: Building2 },
      { labelKey: "nav.recycledMaterials", url: "/recycled-materials", icon: Leaf },
    ],
  },
  {
    sectionKey: "documentation",
    collapsible: true,
    items: [
      { labelKey: "nav.documents",      url: "/documents",        icon: FileText },
      { labelKey: "nav.plans",           url: "/plans",            icon: BookOpen },
      { labelKey: "nav.technicalOffice", url: "/technical-office", icon: Inbox },
      { labelKey: "nav.audits",          url: "/audits",           icon: FileCheck },
      { labelKey: "nav.training",   url: "/training",   icon: GraduationCap },
    ],
  },
  {
    sectionKey: "reports",
    collapsible: true,
    items: [
      { labelKey: "nav.qcReport",     url: "/reports/qc",    icon: BarChart3 },
      { labelKey: "nav.monthlyReport", url: "/reports/monthly", icon: FileBarChart2 },
      { labelKey: "nav.deadlines",    url: "/deadlines",     icon: Clock },
      { labelKey: "nav.expirations",  url: "/expirations",   icon: AlertTriangle },
      { labelKey: "nav.sgqMatrix",    url: "/sgq-matrix",    icon: ShieldCheck },
    ],
  },
  {
    sectionKey: "system",
    collapsible: true,
    items: [
      { labelKey: "nav.dfo",          url: "/dfo",           icon: FolderKanban },
      { labelKey: "nav.auditLog",     url: "/audit",         icon: ScrollText,  requiredAction: "viewAudit" },
      { labelKey: "nav.health",       url: "/admin/health",  icon: ShieldCheck, adminOnly: true },
      { labelKey: "nav.settings",     url: "/settings",      icon: Settings,    adminOnly: true },
    ],
  },
];

/* ── Section Label (collapsible) ─────────────────────────────── */

function SectionLabel({ label, collapsed, open, onToggle, collapsible }: {
  label: string; collapsed: boolean; open: boolean; onToggle: () => void; collapsible?: boolean;
}) {
  if (collapsed) return <div className="my-2.5 h-px mx-2.5 bg-sidebar-border/40" />;

  return (
    <button
      type="button"
      onClick={collapsible ? onToggle : undefined}
      className={cn(
        "flex items-center gap-2 px-3 mb-1 mt-4 w-full text-left group/section",
        collapsible && "cursor-pointer hover:opacity-80 transition-opacity"
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap text-sidebar-foreground/35 select-none">
        {label}
      </span>
      <div className="flex-1 h-px bg-sidebar-border/30" />
      {collapsible && (
        <ChevronDown className={cn(
          "h-2.5 w-2.5 text-sidebar-foreground/25 transition-transform duration-200 flex-shrink-0",
          !open && "-rotate-90"
        )} />
      )}
    </button>
  );
}

/* ── Nav Item ────────────────────────────────────────────────── */

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
        "group relative flex items-center gap-2.5 rounded-lg text-sm font-medium min-h-[44px]",
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

/* ── Sidebar Content ─────────────────────────────────────────── */

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin } = useProjectRole();
  const { logoUrl } = useProjectLogo();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(s => { initial[s.sectionKey] = true; });
    return initial;
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  const sectionContainsActive = (section: SidebarSection) =>
    section.items.some(item => isActive(item.url, item.exact));

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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 bg-sidebar-primary/15 border border-sidebar-primary/25 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
          )}
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
        {NAV_SECTIONS.map((section, idx) => {
          const filteredItems = section.items.filter(item => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.requiredAction && !can(item.requiredAction)) return false;
            return true;
          });

          if (filteredItems.length === 0) return null;

          const isOpen = openSections[section.sectionKey] || sectionContainsActive(section);

          return (
            <div key={section.sectionKey}>
              {idx > 0 && (
                <SectionLabel
                  label={t(`nav.sections.${section.sectionKey}`)}
                  collapsed={collapsed}
                  open={isOpen}
                  onToggle={() => toggleSection(section.sectionKey)}
                  collapsible={section.collapsible}
                />
              )}
              <div
                className={cn(
                  "space-y-[2px] overflow-hidden transition-all duration-200",
                  idx > 0 && !isOpen && !collapsed ? "max-h-0 opacity-0" : "max-h-[600px] opacity-100"
                )}
              >
                {filteredItems.map(item => (
                  <NavItem key={item.url} item={item} active={isActive(item.url, item.exact)} collapsed={collapsed} onClose={onClose} />
                ))}
              </div>
            </div>
          );
        })}
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

/* ── Main Sidebar ────────────────────────────────────────────── */

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

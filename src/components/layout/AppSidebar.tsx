import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
  Construction,
  ClipboardCheck,
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
      { labelKey: "nav.survey",          url: "/survey",          icon: Map         },
      { labelKey: "nav.subcontractors",  url: "/subcontractors",  icon: HardHat     },
      { labelKey: "nav.workItems",       url: "/work-items",      icon: Construction},
      { labelKey: "nav.ppi",             url: "/ppi",             icon: ClipboardCheck },
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
    return <div className="my-2.5 h-px mx-2.5" style={{ background: "hsl(var(--sidebar-border) / 0.55)" }} />;
  }
  return (
    <div className="flex items-center gap-2 px-3 mb-1 mt-3">
      <span className="text-[9px] font-semibold uppercase tracking-[0.20em] whitespace-nowrap"
        style={{ color: "hsl(var(--sidebar-foreground) / 0.42)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "hsl(var(--sidebar-border) / 0.45)" }} />
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
        "group relative flex items-center gap-2.5 rounded-lg text-sm font-medium h-[34px]",
        "transition-all duration-150",
        collapsed ? "justify-center px-0 mx-1.5" : "px-2.5 mx-1.5",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground/95"
      )}
      style={active ? {
        background: "hsl(var(--sidebar-primary) / 0.18)",
      } : undefined}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "hsl(var(--sidebar-primary) / 0.09)";
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      {/* Active indicator bar — 3px left accent, lighter blue */}
      {active && (
        <span className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-full"
          style={{ background: "hsl(var(--sidebar-primary))" }} />
      )}
      <Icon
        className={cn(
          "flex-shrink-0 transition-all duration-150",
          collapsed ? "h-4 w-4" : "h-[14px] w-[14px] ml-0.5",
          active ? "opacity-100" : "opacity-50 group-hover:opacity-80"
        )}
        style={active ? { color: "hsl(var(--sidebar-primary))" } : undefined}
      />
      {!collapsed && (
        <span className="truncate leading-none text-[12.5px] tracking-[0.01em]">{t(item.labelKey)}</span>
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
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <div className="flex flex-col h-full"
      style={{
        /* Subtle vertical gradient: top lighter, bottom slightly deeper */
        background: "linear-gradient(180deg, hsl(212 43% 34%) 0%, hsl(212 43% 29%) 100%)",
      }}>

      {/* ── Brand / Logo ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[60px] flex-shrink-0 px-4 cursor-pointer select-none",
          collapsed ? "justify-center px-3" : "gap-3"
        )}
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border) / 0.6)" }}
        onClick={() => navigate("/")}
        role="button"
        aria-label="Go to Dashboard"
      >
        {/* Logo mark */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
          style={{
            background: "hsl(var(--sidebar-primary) / 0.18)",
            border: "1px solid hsl(var(--sidebar-primary) / 0.35)",
          }}>
          <ShieldCheck className="h-4 w-4" style={{ color: "hsl(var(--sidebar-primary))" }} />
        </div>

        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-black tracking-[0.26em] uppercase leading-none"
              style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
              ATLAS
            </span>
            <span className="text-[8px] font-medium tracking-[0.18em] uppercase leading-none mt-[3px]"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.45)" }}>
              Quality Platform
            </span>
          </div>
        )}

        {/* Mobile close */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="ml-auto h-7 w-7"
            style={{ color: "hsl(var(--sidebar-foreground) / 0.5)" }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5"
        style={{ scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.sectionKey} className={sectionIdx > 0 ? "mt-1" : ""}>
            {sectionIdx > 0 && (
              <SectionLabel
                label={t(`nav.sections.${section.sectionKey}`)}
                collapsed={collapsed}
              />
            )}
            <div className="space-y-[2px]">
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      {!onClose && (
        <div className="flex-shrink-0 py-2.5 px-3"
          style={{ borderTop: "1px solid hsl(var(--sidebar-border) / 0.5)" }}>
          {!collapsed && (
            <p className="text-[8px] uppercase tracking-widest"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.28)" }}>
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
          "hidden lg:flex flex-col h-screen flex-shrink-0 relative",
          "transition-all duration-300",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
        style={{
          borderRight: "1px solid hsl(var(--sidebar-border) / 0.65)",
          /* Subtle right-edge shadow for depth */
          boxShadow: "2px 0 12px 0 hsl(214 62% 10% / 0.25)",
        }}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle on edge */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-3 top-[70px] z-10",
            "flex h-6 w-6 items-center justify-center rounded-full",
            "transition-all duration-150 hover:scale-110",
          )}
          style={{
            background: "hsl(212 43% 38%)",
            border: "1px solid hsl(var(--sidebar-primary) / 0.38)",
            color: "hsl(var(--sidebar-primary))",
            boxShadow: "0 2px 8px hsl(212 43% 18% / 0.25)",
          }}
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
            className="fixed inset-0 backdrop-blur-sm"
            style={{ background: "hsl(var(--foreground) / 0.28)" }}
            onClick={onMobileClose}
          />
          <aside className="relative flex w-[220px] flex-col h-full shadow-2xl"
            style={{ borderRight: "1px solid hsl(var(--sidebar-border) / 0.5)" }}>
            <SidebarContent collapsed={false} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

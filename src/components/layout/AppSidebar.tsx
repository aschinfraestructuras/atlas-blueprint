import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useProject } from "@/contexts/ProjectContext";
import { HealthScoreSheet } from "@/components/dashboard/HealthScoreSheet";
import {
  LayoutDashboard, FolderKanban, FileText, Truck, Package,
  FlaskConical, AlertTriangle, ScrollText, Settings,
  ShieldCheck, ChevronLeft, ChevronRight, X, ChevronDown,
  Inbox, BookOpen, HardHat, Construction, ClipboardCheck, Crosshair, CalendarClock,
  Clock, BarChart3, Building2, ClipboardList, Leaf, GraduationCap, FileBarChart2,
  Users, Link2, Hammer, CheckSquare, FileStack, PieChart, Cog, CalendarCheck, Activity,
  Download, Zap, TrendingUp, Map, FileSpreadsheet,
  Send, ScanSearch, Bell } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Types ───────────────────────────────────────────────────── */

interface SidebarNavItem {
  labelKey: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
  requiredAction?: string;
  adminOnly?: boolean;
  /** If true, this item is visible to the viewer role */
  viewerVisible?: boolean;
  /** If true, this item is a library/configuration item — shown with muted style */
  isLibrary?: boolean;
}

interface SidebarSection {
  sectionKey: string;
  sectionIcon: React.ElementType;
  items: SidebarNavItem[];
  collapsible?: boolean;
}

/* ── Navigation Structure ────────────────────────────────────── */

const NAV_SECTIONS: SidebarSection[] = [
  {
    sectionKey: "core",
    sectionIcon: LayoutDashboard,
    collapsible: false,
    items: [
      { labelKey: "nav.dashboard",        url: "/",                 icon: LayoutDashboard, exact: true, viewerVisible: false },
      { labelKey: "nav.directionPortal",  url: "/direction-portal", icon: Building2,       viewerVisible: true },
    ],
  },
  {
    sectionKey: "execution",
    sectionIcon: Hammer,
    collapsible: true,
    items: [
      { labelKey: "nav.planning",     url: "/planning",      icon: CalendarClock },
      { labelKey: "nav.workItems",    url: "/work-items",    icon: Construction },
      { labelKey: "nav.map",          url: "/map",           icon: Map },
      { labelKey: "nav.ppi",          url: "/ppi",           icon: ClipboardCheck, viewerVisible: true },
      // Campo (agrupamento visual)
      { labelKey: "nav.dailyReports", url: "/daily-reports", icon: ClipboardList },
      { labelKey: "nav.myTasks",      url: "/my-tasks",      icon: CalendarCheck },
      { labelKey: "nav.fieldRecords", url: "/field-records", icon: ClipboardList },
      { labelKey: "nav.topography",   url: "/topography",    icon: Crosshair },
      // PPI Templates removido — agora tab dentro de /ppi (rota /ppi/templates mantida)
    ],
  },
  {
    sectionKey: "quality",
    sectionIcon: CheckSquare,
    collapsible: true,
    items: [
      { labelKey: "nav.materials",         url: "/materials",         icon: Package },
      { labelKey: "nav.tests",             url: "/tests",             icon: FlaskConical },
      { labelKey: "nav.nonConformities",   url: "/non-conformities",  icon: AlertTriangle, viewerVisible: true },
      // Plano de Ações removido — já é tab dentro de /non-conformities (rota /action-plan mantida)
      { labelKey: "nav.recycledMaterials", url: "/recycled-materials",icon: Leaf },
      { labelKey: "nav.suppliers",         url: "/suppliers",         icon: Truck, isLibrary: true },
      { labelKey: "nav.subcontractors",    url: "/subcontractors",    icon: HardHat, isLibrary: true },
      { labelKey: "nav.laboratories",      url: "/laboratories",      icon: Building2, isLibrary: true },
    ],
  },
  {
    sectionKey: "documentation",
    sectionIcon: FileStack,
    collapsible: true,
    items: [
      { labelKey: "nav.technicalOffice", url: "/technical-office", icon: Inbox },
      { labelKey: "nav.plans",           url: "/plans",            icon: BookOpen },
      { labelKey: "nav.dfo",             url: "/dfo",              icon: FolderKanban },
      { labelKey: "nav.documents",       url: "/documents",        icon: FileText, viewerVisible: true },
      { labelKey: "nav.controlledDistribution", url: "/controlled-distribution", icon: Send },
      { labelKey: "nav.audits",          url: "/audits",           icon: ScanSearch },
      { labelKey: "nav.training",        url: "/training",         icon: GraduationCap },
    ],
  },
  {
    sectionKey: "reports",
    sectionIcon: PieChart,
    collapsible: true,
    items: [
      { labelKey: "nav.notifications",  url: "/notifications",  icon: Bell },
      // Prazos e Vencimentos removidos — acessíveis via /notifications (rotas /deadlines e /expirations mantidas)
      { labelKey: "nav.traceability",   url: "/traceability",   icon: Link2 },
      { labelKey: "nav.qcReport",      url: "/reports/qc",     icon: BarChart3 },
      { labelKey: "nav.monthlyReport",  url: "/reports/monthly", icon: FileBarChart2 },
      { labelKey: "nav.sgqMatrix",      url: "/sgq-matrix",     icon: ShieldCheck },
      { labelKey: "nav.contractKpis",   url: "/contract-kpis",  icon: TrendingUp },
      { labelKey: "nav.qualityAnalytics", url: "/quality-analytics", icon: Activity, requiredAction: "viewAudit" },
      { labelKey: "nav.mqt",            url: "/mqt",            icon: FileSpreadsheet },
    ],
  },
  {
    sectionKey: "system",
    sectionIcon: Cog,
    collapsible: true,
    items: [
      { labelKey: "nav.orgChart",  url: "/org-chart",    icon: Users },
      { labelKey: "nav.projects",  url: "/projects",     icon: FolderKanban, adminOnly: true },
      { labelKey: "nav.settings",  url: "/settings",      icon: Settings,    adminOnly: true },
      { labelKey: "nav.auditLog",  url: "/audit-log",    icon: ScrollText,  requiredAction: "viewAudit" },
    ],
  },
];

/* ── localStorage persistence for open sections ──────────────── */

const SIDEBAR_SECTIONS_KEY = "atlas_sidebar_sections";

function loadOpenSections(): Set<string> {
  try {
    const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch { /* ignore */ }
  // Default: all sections open
  return new Set(NAV_SECTIONS.filter(s => s.collapsible).map(s => s.sectionKey));
}

function saveOpenSections(sections: Set<string>) {
  try {
    localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify([...sections]));
  } catch { /* ignore */ }
}

/* ── Section Header ──────────────────────────────────────────── */

function SectionHeader({
  label, sectionIcon: Icon, collapsed, open, onToggle, hasActive, collapsible,
}: {
  label: string;
  sectionIcon: React.ElementType;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  hasActive: boolean;
  collapsible?: boolean;
}) {
  const inner = (
    <button
      type="button"
      onClick={collapsible ? onToggle : undefined}
      className={cn(
        "flex items-center w-full rounded-lg transition-all duration-150 group/header",
        collapsed ? "justify-center mx-1.5 min-h-[40px]" : "gap-2.5 px-3 mx-1.5 min-h-[36px]",
        collapsible && "cursor-pointer",
        hasActive
          ? "text-sidebar-primary"
          : "text-sidebar-foreground/45 hover:text-sidebar-foreground/75",
      )}
    >
      <Icon className={cn(
        "flex-shrink-0 transition-all duration-150",
        collapsed ? "h-4 w-4" : "h-3.5 w-3.5",
        hasActive ? "text-sidebar-primary opacity-100" : "opacity-40 group-hover/header:opacity-70",
      )} />
      {!collapsed && (
        <>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap select-none leading-none",
            hasActive ? "text-sidebar-primary" : "text-sidebar-foreground/40 group-hover/header:text-sidebar-foreground/60"
          )}>
            {label}
          </span>
          <div className="flex-1" />
          {collapsible && (
            <ChevronDown className={cn(
              "h-2.5 w-2.5 text-sidebar-foreground/25 transition-transform duration-200 flex-shrink-0",
              !open && "-rotate-90"
            )} />
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ── Nav Item ────────────────────────────────────────────────── */

function NavItem({ item, active, collapsed, onClose }: {
  item: SidebarNavItem; active: boolean; collapsed: boolean; onClose?: () => void;
}) {
  const Icon = item.icon;
  const { t } = useTranslation();

  const inner = (
    <NavLink
      to={item.url}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg text-sm",
        "transition-all duration-150",
        collapsed ? "justify-center px-0 mx-1.5 min-h-[38px]" : "px-3 mx-1.5 min-h-[34px] pl-9",
        active
          ? [
              "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
              "shadow-[0_1px_3px_hsl(0_0%_0%/0.15),inset_0_1px_0_hsl(0_0%_100%/0.06)]",
            ].join(" ")
          : "font-medium text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/40"
      )}
    >
      {active && (
        <span className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-full bg-sidebar-primary" />
      )}
      <Icon className={cn(
        "flex-shrink-0 transition-all duration-150",
        collapsed ? "h-4 w-4" : "h-[14px] w-[14px]",
        active ? "text-sidebar-primary" : "opacity-50 group-hover:opacity-75"
      )} />
      {!collapsed && (
        <span className={cn(
          "truncate leading-none text-[12px] tracking-[0.015em]",
          active ? "text-sidebar-primary font-bold" : "font-medium"
        )}>{t(item.labelKey)}</span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {t(item.labelKey)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ── Sidebar Content ─────────────────────────────────────────── */

function SidebarContent({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isAdmin, role } = useProjectRole();
  const { logoUrl } = useProjectLogo();
  const { activeProject } = useProject();
  const { health, loading: healthLoading } = useProjectHealth(activeProject?.id);
  const isViewer = role === "viewer";
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);
  const { canInstall, install } = usePWAInstall();

  const isActive = useCallback(
    (url: string, exact?: boolean) =>
      exact ? location.pathname === url : location.pathname.startsWith(url),
    [location.pathname]
  );

  // Determine which section contains the active route
  const activeSectionKey = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      if (section.items.some(item => isActive(item.url, item.exact))) {
        return section.sectionKey;
      }
    }
    return "core";
  }, [isActive]);

  // Multi-open sections state (persisted in localStorage)
  const [openSections, setOpenSections] = useState<Set<string>>(loadOpenSections);

  // Ensure active section is always open
  useEffect(() => {
    setOpenSections(prev => {
      if (prev.has(activeSectionKey)) return prev;
      const next = new Set(prev);
      next.add(activeSectionKey);
      saveOpenSections(next);
      return next;
    });
  }, [activeSectionKey]);

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveOpenSections(next);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* ── Brand ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[56px] flex-shrink-0 px-4 cursor-pointer select-none border-b border-sidebar-border/40 bg-sidebar-background/20",
          collapsed ? "justify-center px-3" : "gap-3"
        )}
        onClick={() => navigate("/")}
        role="button"
        aria-label="Go to Dashboard"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0 bg-sidebar-primary/18 border border-sidebar-primary/25 overflow-hidden shadow-[0_1px_3px_hsl(0_0%_0%/0.15)]">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
          )}
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-black tracking-[0.28em] uppercase leading-none text-sidebar-foreground">
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
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map((section) => {
          const filteredItems = section.items.filter(item => {
            if (item.adminOnly && !isAdmin && !!activeProject) return false;
            if (item.requiredAction && !can(item.requiredAction)) return false;
            // Viewer role: only show items explicitly marked as viewerVisible
            if (isViewer && !item.viewerVisible) return false;
            return true;
          });

          if (filteredItems.length === 0) return null;

          const hasActive = filteredItems.some(item => isActive(item.url, item.exact));
          const isOpen = openSections.has(section.sectionKey) || !section.collapsible;

          // Core section: render items directly (Dashboard)
          if (!section.collapsible) {
            return (
              <div key={section.sectionKey} className="mb-1">
                {filteredItems.map(item => (
                  <NavItem key={item.url} item={item} active={isActive(item.url, item.exact)} collapsed={collapsed} onClose={onClose} />
                ))}
                {!collapsed && <div className="h-px mx-3 mt-2 bg-sidebar-border/30" />}
                {collapsed && <div className="h-px mx-2.5 my-1 bg-sidebar-border/30" />}
              </div>
            );
          }

          return (
            <div key={section.sectionKey}>
              {/* Section Header */}
              <SectionHeader
                label={t(`nav.sections.${section.sectionKey}`)}
                sectionIcon={section.sectionIcon}
                collapsed={collapsed}
                open={isOpen}
                onToggle={() => toggleSection(section.sectionKey)}
                hasActive={hasActive}
                collapsible={section.collapsible}
              />

              {/* Section Items — animated accordion */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-250 ease-in-out",
                  isOpen && !collapsed
                    ? "max-h-[500px] opacity-100 mt-0.5 mb-1"
                    : "max-h-0 opacity-0"
                )}
              >
                <div className="space-y-[1px]">
                  {filteredItems.map((item, idx) => {
                    const prevItem = filteredItems[idx - 1];
                    const isFirstLibrary = item.isLibrary && (!prevItem || !prevItem.isLibrary);
                    return (
                      <div key={item.url}>
                        {isFirstLibrary && !collapsed && (
                          <div className="flex items-center gap-1.5 px-3 mt-2 mb-1">
                            <div className="h-px flex-1 bg-sidebar-border/25" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">
                              {t("nav.sections.configuration")}
                            </span>
                            <div className="h-px flex-1 bg-sidebar-border/25" />
                          </div>
                        )}
                        <NavItem item={item} active={isActive(item.url, item.exact)} collapsed={collapsed} onClose={onClose} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── PWA Install ─────────────────────────────────── */}
      {canInstall && (
        <div className="flex-shrink-0 px-3 py-1">
          <button
            type="button"
            onClick={install}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">{t("pwa.install")}</span>}
          </button>
        </div>
      )}

      {/* ── Health Score Indicator ────────────────────────── */}
      {activeProject && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-sidebar-border/40">
          <button
            type="button"
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors"
            onClick={() => setHealthSheetOpen(true)}
          >
            <span className={cn(
              "h-2.5 w-2.5 rounded-full flex-shrink-0",
              health.health_status === "healthy" && "bg-emerald-500",
              health.health_status === "attention" && "bg-amber-500",
              health.health_status === "critical" && "bg-destructive",
            )} />
            {!collapsed && (
              <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/50">
                {t("health.sidebarScore", { defaultValue: "Score" })}: {healthLoading ? "…" : health.health_score}
              </span>
            )}
          </button>
        </div>
      )}

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

      <HealthScoreSheet open={healthSheetOpen} onOpenChange={setHealthSheetOpen} health={health} loading={healthLoading} />
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

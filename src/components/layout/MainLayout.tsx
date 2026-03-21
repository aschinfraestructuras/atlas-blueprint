import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useArchivedProject } from "@/hooks/useArchivedProject";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/session/SessionTimeoutWarning";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isArchived = useArchivedProject();
  const { activeProject } = useProject();
  const { t } = useTranslation();
  const { showWarning, extendSession } = useSessionTimeout();
  const { role } = useProjectRole();
  const isViewer = role === "viewer";
  const location = useLocation();

  // Dynamic browser tab title
  useEffect(() => {
    function getPageTitle(pathname: string): string {
      const exactRoutes: Record<string, string> = {
        "/": t("nav.dashboard"),
        "/projects": t("nav.projects"),
        "/documents": t("nav.documents"),
        "/tests": t("nav.tests"),
        "/suppliers": t("nav.suppliers"),
        "/materials": t("nav.materials"),
        
        "/non-conformities": t("nav.nonConformities"),
        "/technical-office": t("nav.technicalOffice"),
        "/plans": t("nav.plans"),
        "/planning": t("nav.planning"),
        "/topography": t("nav.topography"),
        "/subcontractors": t("nav.subcontractors"),
        "/work-items": t("nav.workItems"),
        "/ppi": t("nav.ppi"),
        "/expirations": t("nav.expirations"),
        "/deadlines": t("nav.deadlines"),
        "/reports/qc": t("nav.qcReport"),
        "/audit-log": t("nav.auditLog"),
        "/settings": t("nav.settings"),
        "/laboratories": t("nav.laboratories"),
      };
      if (exactRoutes[pathname]) return exactRoutes[pathname];

      // Detail pages — map to their parent module title
      const prefixRoutes: [string, string][] = [
        ["/documents/", t("nav.documents")],
        ["/non-conformities/", t("nav.nonConformities")],
        ["/work-items/", t("nav.workItems")],
        ["/ppi/", t("nav.ppi")],
        ["/suppliers/", t("nav.suppliers")],
        ["/materials/", t("nav.materials")],
        ["/subcontractors/", t("nav.subcontractors")],
        ["/plans/", t("nav.plans")],
        ["/planning/", t("nav.planning")],
        ["/technical-office/", t("nav.technicalOffice")],
      ];
      for (const [prefix, title] of prefixRoutes) {
        if (pathname.startsWith(prefix)) return title;
      }
      return "";
    }

    const page = getPageTitle(location.pathname);
    const proj = activeProject?.name ?? "";
    document.title = ["Atlas QMS", proj, page].filter(Boolean).join(" · ");
  }, [location.pathname, activeProject, t]);

  // Auto-collapse sidebar below lg breakpoint on mount
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    if (mql.matches) setCollapsed(true);
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {isArchived && <ArchivedBanner />}
            {children}
          </div>
          {/* Discrete footer */}
          <footer className="border-t border-border/30 bg-muted/10 py-3 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-muted-foreground/50">
              <span>Atlas QMS · {t("auth.qmsLabel")}</span>
              <a
                href="https://www.linkedin.com/in/antunesmartins/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground/70 transition-colors"
              >
                linkedin.com/in/antunesmartins
              </a>
            </div>
          </footer>
        </main>
      </div>
      <SessionTimeoutWarning open={showWarning} onExtend={extendSession} />
      <OnboardingTour />
    </div>
  );
}

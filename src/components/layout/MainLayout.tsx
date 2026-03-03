import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useArchivedProject } from "@/hooks/useArchivedProject";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { useProject } from "@/contexts/ProjectContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/session/SessionTimeoutWarning";

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
  const location = useLocation();

  // Dynamic browser tab title
  useEffect(() => {
    const routeMap: Record<string, string> = {
      "/": t("nav.dashboard"),
      "/projects": t("nav.projects"),
      "/documents": t("nav.documents"),
      "/tests": t("nav.tests"),
      "/suppliers": t("nav.suppliers"),
      "/materials": t("nav.materials"),
      "/materials/map-mas": t("nav.mapMas"),
      "/non-conformities": t("nav.nonConformities"),
      "/technical-office": t("nav.technicalOffice"),
      "/plans": t("nav.plans"),
      "/planning": t("nav.planning"),
      "/topography": t("nav.topography"),
      "/subcontractors": t("nav.subcontractors"),
      "/work-items": t("nav.workItems"),
      "/ppi": t("nav.ppi"),
      "/expirations": t("nav.expirations"),
      "/reports/qc": t("nav.qcReport"),
      "/audit": t("nav.auditLog"),
      "/settings": t("nav.settings"),
    };
    const page = routeMap[location.pathname] ?? "";
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
        </main>
      </div>
      <SessionTimeoutWarning open={showWarning} onExtend={extendSession} />
    </div>
  );
}

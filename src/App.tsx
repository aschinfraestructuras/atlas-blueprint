import { Suspense, useEffect, useState } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScreenSaver } from "@/components/ScreenSaver";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";
import { useProjectRole } from "@/hooks/useProjectRole";

const PROJECT_STORAGE_KEY = "atlas_active_project_id";
const SESSION_PROJECT_CHOSEN_KEY = "atlas_session_project_chosen";

// Static imports — needed before auth redirect
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Lazy-loaded pages
const FieldRecordsPage = lazy(() => import("./pages/FieldRecordsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DirectionPortalPage = lazy(() => import("./pages/DirectionPortalPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const DocumentDetailPage = lazy(() => import("./pages/DocumentDetailPage"));
const ControlledDistributionPage = lazy(() => import("./pages/ControlledDistributionPage"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const SupplierDetailPage = lazy(() => import("./pages/SupplierDetailPage"));
const NonConformitiesPage = lazy(() => import("./pages/NonConformitiesPage"));
const NCDetailPage = lazy(() => import("./pages/NCDetailPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TechnicalOfficePage = lazy(() => import("./pages/TechnicalOfficePage"));
const RfiDetailPage = lazy(() => import("./pages/RfiDetailPage"));
const TechOfficeDetailPage = lazy(() => import("./pages/TechOfficeDetailPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const PlanDetailPage = lazy(() => import("./pages/PlanDetailPage"));
const SubcontractorsPage = lazy(() => import("./pages/SubcontractorsPage"));
const SubcontractorDetailPage = lazy(() => import("./pages/SubcontractorDetailPage"));
const WorkItemsPage = lazy(() => import("./pages/WorkItemsPage"));
const WorkItemDetailPage = lazy(() => import("./pages/WorkItemDetailPage"));
const PPIPage = lazy(() => import("./pages/PPIPage"));
const PPITemplatesPage = lazy(() => import("./pages/PPITemplatesPage"));
const PPIDetailPage = lazy(() => import("./pages/PPIDetailPage"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const MaterialDetailPage = lazy(() => import("./pages/MaterialDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HealthCheckPage = lazy(() => import("./pages/HealthCheckPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const TopographyPage = lazy(() => import("./pages/TopographyPage"));
const TrackGeometryPage = lazy(() => import("./pages/TrackGeometryPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const AuditsPage = lazy(() => import("./pages/AuditsPage"));
const ActivityDetailPage = lazy(() => import("./pages/ActivityDetailPage"));
const ExpirationsPage = lazy(() => import("./pages/ExpirationsPage"));
const DeadlinesPage = lazy(() => import("./pages/DeadlinesPage"));
const QCReportPage = lazy(() => import("./pages/QCReportPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const IndicatorsPage = lazy(() => import("./pages/IndicatorsPage"));
const LaboratoriesPage = lazy(() => import("./pages/LaboratoriesPage"));
const DailyReportsPage = lazy(() => import("./pages/DailyReportsPage"));
const DailyReportDetailPage = lazy(() => import("./pages/DailyReportDetailPage"));
const RecycledMaterialsPage = lazy(() => import("./pages/RecycledMaterialsPage"));
const SGQMatrixPage = lazy(() => import("./pages/SGQMatrixPage"));
const ContractKPIsPage = lazy(() => import("./pages/ContractKPIsPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const MonthlyReportPage = lazy(() => import("./pages/MonthlyReportPage"));
const DFOPage = lazy(() => import("./pages/DFOPage"));
const ConcretePage = lazy(() => import("./pages/ConcretePage"));
const CompactionPage = lazy(() => import("./pages/CompactionPage"));
const SoilPage = lazy(() => import("./pages/SoilPage"));
const WeldPage = lazy(() => import("./pages/WeldPage"));
const OrgChartPage = lazy(() => import("./pages/OrgChartPage"));
const TestSchedulePage = lazy(() => import("./pages/TestSchedulePage"));
const TraceabilityMatrixPage = lazy(() => import("./pages/TraceabilityMatrixPage"));
const ActionPlanPage = lazy(() => import("./pages/ActionPlanPage"));
const SubmittalsPage = lazy(() => import("./pages/SubmittalsPage"));
const MyTasksPage = lazy(() => import("./pages/MyTasksPage"));
const ConfirmReceiptPage = lazy(() => import("./pages/ConfirmReceiptPage"));
const MqtPage = lazy(() => import("./pages/MqtPage"));
const ProjectSelectorPage = lazy(() => import("./pages/ProjectSelectorPage"));
const QualityAnalyticsPage = lazy(() => import("./pages/QualityAnalyticsPage"));

// Rotas permitidas para o role viewer — tudo o resto é redirecionado para /direction-portal
const VIEWER_ALLOWED_ROUTES = [
  "/direction-portal",
  "/ppi",
  "/non-conformities",
  "/documents",
  "/invite",
];

function ViewerGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useProjectRole();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || role !== "viewer") return;
    const allowed = VIEWER_ALLOWED_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + "/"));
    if (!allowed) {
      navigate("/direction-portal", { replace: true });
    }
  }, [role, loading, location.pathname, navigate]);

  return <>{children}</>;
}

/**
 * Inteligent redirect:
 * If the user lands on "/" without an active project AND has 2+ projects to
 * choose from, send them to /select-project. With exactly 1 project the
 * ProjectContext auto-selects it; with 0 projects we let the dashboard show
 * its own empty state.
 *
 * IMPORTANT: this guard runs BEFORE MainLayout so that the brief loading state
 * shows a clean fullscreen splash instead of a flashing sidebar+empty
 * Dashboard. That removes the "Dashboard piscar antes do redirect" issue.
 */
function ProjectSelectorRedirect({ children }: { children: React.ReactNode }) {
  const { projects, loading } = useProject();
  const location = useLocation();

  // Hold the render while projects are loading on the root path. This prevents
  // a brief flash of the Dashboard before redirecting to /select-project.
  if (loading && location.pathname === "/") {
    return <PageLoader />;
  }

  if (!loading && location.pathname === "/") {
    const sessionChosen = sessionStorage.getItem(SESSION_PROJECT_CHOSEN_KEY) === "1";
    const visible = projects.filter(
      (p) => p.status !== "archived" && p.status !== "inactive",
    );
    // Always show selector once per session when the user has 2+ visible projects.
    // Within the same session, after picking one, navigation to "/" goes straight to the dashboard.
    if (!sessionChosen && visible.length >= 2) {
      return <Navigate to="/select-project" replace />;
    }
  }

  return <>{children}</>;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/* Selector redirect runs BEFORE MainLayout so the splash is fullscreen
          and the Dashboard never flashes underneath the sidebar/topbar. */}
      <ProjectSelectorRedirect>
        <MainLayout>
          <ViewerGuard>
            <PageTransition>{children}</PageTransition>
          </ViewerGuard>
        </MainLayout>
        <ScreenSaver idleMinutes={3} />
      </ProjectSelectorRedirect>
    </ProtectedRoute>
  );
}

/**
 * Auth-only wrapper for the project selector page — protected by login but
 * deliberately renders WITHOUT MainLayout (no sidebar / no topbar).
 */
function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      {children}
      <ScreenSaver idleMinutes={3} />
    </>
  );
}

function PageLoader() {
  // Premium splash with 250ms delay — most chunk loads finish faster than this,
  // so the user typically sees a clean, instant transition with no flash.
  // When loading does take longer, we present a polished, breathing brand mark.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-background animate-in fade-in duration-300">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
        <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg shadow-primary/10" />
        <Loader2 className="relative animate-spin h-6 w-6 text-primary" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black tracking-[0.28em] uppercase text-foreground">ATLAS</span>
          <span className="text-sm font-light tracking-[0.18em] uppercase text-primary">QMS</span>
        </div>
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-[9px] font-medium tracking-[0.22em] uppercase text-muted-foreground/80">
          Quality Platform
        </span>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallBanner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ProjectProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/confirm-receipt" element={<ConfirmReceiptPage />} />
                <Route path="/select-project" element={<AuthOnlyRoute><ProjectSelectorPage /></AuthOnlyRoute>} />
                <Route path="/invite/accept" element={<ProtectedLayout><AcceptInvitePage /></ProtectedLayout>} />

                {/* Protected – all share MainLayout */}
                <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
                <Route path="/direction-portal" element={<ProtectedLayout><DirectionPortalPage /></ProtectedLayout>} />
                <Route path="/map" element={<ProtectedLayout><MapPage /></ProtectedLayout>} />
                <Route path="/my-tasks" element={<ProtectedLayout><MyTasksPage /></ProtectedLayout>} />
                <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
                <Route path="/documents" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
                <Route path="/documents/:id" element={<ProtectedLayout><DocumentDetailPage /></ProtectedLayout>} />
                <Route path="/controlled-distribution" element={<ProtectedLayout><ControlledDistributionPage /></ProtectedLayout>} />
                <Route path="/tests" element={<ProtectedLayout><TestsPage /></ProtectedLayout>} />
                <Route path="/laboratories" element={<ProtectedLayout><LaboratoriesPage /></ProtectedLayout>} />
                <Route path="/suppliers" element={<ProtectedLayout><SuppliersPage /></ProtectedLayout>} />
                <Route path="/suppliers/:id" element={<ProtectedLayout><SupplierDetailPage /></ProtectedLayout>} />
                <Route path="/non-conformities" element={<ProtectedLayout><NonConformitiesPage /></ProtectedLayout>} />
                <Route path="/non-conformities/:id" element={<ProtectedLayout><NCDetailPage /></ProtectedLayout>} />
                <Route path="/audit-log" element={<ProtectedLayout><AuditLogPage /></ProtectedLayout>} />
                <Route path="/audit" element={<ProtectedLayout><AuditLogPage /></ProtectedLayout>} />
                <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

                {/* New structural modules */}
                <Route path="/technical-office" element={<ProtectedLayout><TechnicalOfficePage /></ProtectedLayout>} />
                <Route path="/technical-office/rfis/:id" element={<ProtectedLayout><RfiDetailPage /></ProtectedLayout>} />
                <Route path="/technical-office/items/:id" element={<ProtectedLayout><TechOfficeDetailPage /></ProtectedLayout>} />
                <Route path="/plans" element={<ProtectedLayout><PlansPage /></ProtectedLayout>} />
                <Route path="/plans/:id" element={<ProtectedLayout><PlanDetailPage /></ProtectedLayout>} />
                <Route path="/subcontractors" element={<ProtectedLayout><SubcontractorsPage /></ProtectedLayout>} />
                <Route path="/subcontractors/:id" element={<ProtectedLayout><SubcontractorDetailPage /></ProtectedLayout>} />
                <Route path="/work-items" element={<ProtectedLayout><WorkItemsPage /></ProtectedLayout>} />
                <Route path="/work-items/:id" element={<ProtectedLayout><WorkItemDetailPage /></ProtectedLayout>} />
                <Route path="/ppi" element={<ProtectedLayout><PPIPage /></ProtectedLayout>} />
                <Route path="/field-records" element={<ProtectedLayout><FieldRecordsPage /></ProtectedLayout>} />
                <Route path="/notifications" element={<ProtectedLayout><NotificationsPage /></ProtectedLayout>} />
                <Route path="/ppi/templates" element={<ProtectedLayout><PPITemplatesPage /></ProtectedLayout>} />
                <Route path="/ppi/:id" element={<ProtectedLayout><PPIDetailPage /></ProtectedLayout>} />
                <Route path="/materials" element={<ProtectedLayout><MaterialsPage /></ProtectedLayout>} />
                <Route path="/materials/:id" element={<ProtectedLayout><MaterialDetailPage /></ProtectedLayout>} />

                <Route path="/expirations" element={<ProtectedLayout><ExpirationsPage /></ProtectedLayout>} />
                <Route path="/deadlines" element={<ProtectedLayout><DeadlinesPage /></ProtectedLayout>} />
                <Route path="/reports/qc" element={<Navigate to="/reports?tab=qc" replace />} />
                <Route path="/reports/monthly" element={<Navigate to="/reports?tab=monthly" replace />} />
                <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
                <Route path="/sgq-matrix" element={<Navigate to="/indicators?tab=sgq" replace />} />
                <Route path="/contract-kpis" element={<Navigate to="/indicators?tab=kpis" replace />} />
                <Route path="/indicators" element={<ProtectedLayout><IndicatorsPage /></ProtectedLayout>} />
                <Route path="/topography" element={<ProtectedLayout><TopographyPage /></ProtectedLayout>} />
                <Route path="/track-geometry" element={<ProtectedLayout><TrackGeometryPage /></ProtectedLayout>} />
                <Route path="/planning" element={<ProtectedLayout><PlanningPage /></ProtectedLayout>} />
                <Route path="/planning/activities" element={<Navigate to="/planning?tab=activities" replace />} />
                <Route path="/planning/activities/:id" element={<ProtectedLayout><ActivityDetailPage /></ProtectedLayout>} />
                <Route path="/audits" element={<ProtectedLayout><AuditsPage /></ProtectedLayout>} />
                <Route path="/daily-reports" element={<ProtectedLayout><DailyReportsPage /></ProtectedLayout>} />
                <Route path="/daily-reports/:id" element={<ProtectedLayout><DailyReportDetailPage /></ProtectedLayout>} />
                <Route path="/recycled-materials" element={<ProtectedLayout><RecycledMaterialsPage /></ProtectedLayout>} />
                <Route path="/admin/health" element={<ProtectedLayout><HealthCheckPage /></ProtectedLayout>} />
                <Route path="/training" element={<ProtectedLayout><TrainingPage /></ProtectedLayout>} />
                <Route path="/team" element={<ProtectedLayout><TeamPage /></ProtectedLayout>} />
                <Route path="/dfo" element={<ProtectedLayout><DFOPage /></ProtectedLayout>} />
                <Route path="/tests/concrete" element={<ProtectedLayout><ConcretePage /></ProtectedLayout>} />
                <Route path="/tests/compaction" element={<ProtectedLayout><CompactionPage /></ProtectedLayout>} />
                <Route path="/tests/soils" element={<ProtectedLayout><SoilPage /></ProtectedLayout>} />
                <Route path="/tests/welding" element={<ProtectedLayout><WeldPage /></ProtectedLayout>} />
                <Route path="/org-chart" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />
                <Route path="/tests/schedule" element={<ProtectedLayout><TestSchedulePage /></ProtectedLayout>} />
                <Route path="/traceability" element={<ProtectedLayout><TraceabilityMatrixPage /></ProtectedLayout>} />
                <Route path="/action-plan" element={<ProtectedLayout><ActionPlanPage /></ProtectedLayout>} />
                <Route path="/submittals" element={<ProtectedLayout><SubmittalsPage /></ProtectedLayout>} />
                <Route path="/mqt" element={<ProtectedLayout><MqtPage /></ProtectedLayout>} />
                <Route path="/quality-analytics" element={<ProtectedLayout><QualityAnalyticsPage /></ProtectedLayout>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Static imports — needed before auth redirect
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Lazy-loaded pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const DocumentDetailPage = lazy(() => import("./pages/DocumentDetailPage"));
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
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const AuditsPage = lazy(() => import("./pages/AuditsPage"));
const ActivityDetailPage = lazy(() => import("./pages/ActivityDetailPage"));
const ExpirationsPage = lazy(() => import("./pages/ExpirationsPage"));
const DeadlinesPage = lazy(() => import("./pages/DeadlinesPage"));
const QCReportPage = lazy(() => import("./pages/QCReportPage"));
const LaboratoriesPage = lazy(() => import("./pages/LaboratoriesPage"));
const DailyReportsPage = lazy(() => import("./pages/DailyReportsPage"));
const DailyReportDetailPage = lazy(() => import("./pages/DailyReportDetailPage"));
const RecycledMaterialsPage = lazy(() => import("./pages/RecycledMaterialsPage"));
const SGQMatrixPage = lazy(() => import("./pages/SGQMatrixPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
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

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
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
      <BrowserRouter>
        <AuthProvider>
          <ProjectProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/invite/accept" element={<ProtectedLayout><AcceptInvitePage /></ProtectedLayout>} />

                {/* Protected – all share MainLayout */}
                <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
                <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
                <Route path="/documents" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
                <Route path="/documents/:id" element={<ProtectedLayout><DocumentDetailPage /></ProtectedLayout>} />
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
                <Route path="/ppi/templates" element={<ProtectedLayout><PPITemplatesPage /></ProtectedLayout>} />
                <Route path="/ppi/:id" element={<ProtectedLayout><PPIDetailPage /></ProtectedLayout>} />
                <Route path="/materials" element={<ProtectedLayout><MaterialsPage /></ProtectedLayout>} />
                <Route path="/materials/:id" element={<ProtectedLayout><MaterialDetailPage /></ProtectedLayout>} />

                <Route path="/expirations" element={<ProtectedLayout><ExpirationsPage /></ProtectedLayout>} />
                <Route path="/deadlines" element={<ProtectedLayout><DeadlinesPage /></ProtectedLayout>} />
                <Route path="/reports/qc" element={<ProtectedLayout><QCReportPage /></ProtectedLayout>} />
                <Route path="/topography" element={<ProtectedLayout><TopographyPage /></ProtectedLayout>} />
                <Route path="/planning" element={<ProtectedLayout><PlanningPage /></ProtectedLayout>} />
                <Route path="/planning/activities/:id" element={<ProtectedLayout><ActivityDetailPage /></ProtectedLayout>} />
                <Route path="/audits" element={<ProtectedLayout><AuditsPage /></ProtectedLayout>} />
                <Route path="/daily-reports" element={<ProtectedLayout><DailyReportsPage /></ProtectedLayout>} />
                <Route path="/daily-reports/:id" element={<ProtectedLayout><DailyReportDetailPage /></ProtectedLayout>} />
                <Route path="/recycled-materials" element={<ProtectedLayout><RecycledMaterialsPage /></ProtectedLayout>} />
                <Route path="/admin/health" element={<ProtectedLayout><HealthCheckPage /></ProtectedLayout>} />
                <Route path="/sgq-matrix" element={<ProtectedLayout><SGQMatrixPage /></ProtectedLayout>} />
                <Route path="/training" element={<ProtectedLayout><TrainingPage /></ProtectedLayout>} />
                <Route path="/reports/monthly" element={<ProtectedLayout><MonthlyReportPage /></ProtectedLayout>} />
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

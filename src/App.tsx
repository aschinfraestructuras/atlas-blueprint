import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import TestsPage from "./pages/TestsPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierDetailPage from "./pages/SupplierDetailPage";
import NonConformitiesPage from "./pages/NonConformitiesPage";
import NCDetailPage from "./pages/NCDetailPage";
import AuditLogPage from "./pages/AuditLogPage";
import SettingsPage from "./pages/SettingsPage";
import TechnicalOfficePage from "./pages/TechnicalOfficePage";
import PlansPage from "./pages/PlansPage";
import SurveyPage from "./pages/SurveyPage";
import SubcontractorsPage from "./pages/SubcontractorsPage";
import WorkItemsPage from "./pages/WorkItemsPage";
import WorkItemDetailPage from "./pages/WorkItemDetailPage";
import PPIPage from "./pages/PPIPage";
import PPITemplatesPage from "./pages/PPITemplatesPage";
import PPIDetailPage from "./pages/PPIDetailPage";
import MaterialsPage from "./pages/MaterialsPage";
import MaterialDetailPage from "./pages/MaterialDetailPage";
import NotFound from "./pages/NotFound";
import HealthCheckPage from "./pages/HealthCheckPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import TopographyPage from "./pages/TopographyPage";

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProjectProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/invite/accept" element={<ProtectedLayout><AcceptInvitePage /></ProtectedLayout>} />

              {/* Protected – all share MainLayout */}
              <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
              <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
              <Route path="/documents" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
              <Route path="/documents/:id" element={<ProtectedLayout><DocumentDetailPage /></ProtectedLayout>} />
              <Route path="/tests" element={<ProtectedLayout><TestsPage /></ProtectedLayout>} />
              <Route path="/suppliers" element={<ProtectedLayout><SuppliersPage /></ProtectedLayout>} />
              <Route path="/suppliers/:id" element={<ProtectedLayout><SupplierDetailPage /></ProtectedLayout>} />
              <Route path="/non-conformities" element={<ProtectedLayout><NonConformitiesPage /></ProtectedLayout>} />
              <Route path="/non-conformities/:id" element={<ProtectedLayout><NCDetailPage /></ProtectedLayout>} />
              <Route path="/audit" element={<ProtectedLayout><AuditLogPage /></ProtectedLayout>} />
              <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

              {/* New structural modules */}
              <Route path="/technical-office" element={<ProtectedLayout><TechnicalOfficePage /></ProtectedLayout>} />
              <Route path="/plans" element={<ProtectedLayout><PlansPage /></ProtectedLayout>} />
              <Route path="/survey" element={<ProtectedLayout><SurveyPage /></ProtectedLayout>} />
              <Route path="/subcontractors" element={<ProtectedLayout><SubcontractorsPage /></ProtectedLayout>} />
              <Route path="/work-items" element={<ProtectedLayout><WorkItemsPage /></ProtectedLayout>} />
              <Route path="/work-items/:id" element={<ProtectedLayout><WorkItemDetailPage /></ProtectedLayout>} />
              <Route path="/ppi" element={<ProtectedLayout><PPIPage /></ProtectedLayout>} />
              <Route path="/ppi/templates" element={<ProtectedLayout><PPITemplatesPage /></ProtectedLayout>} />
              <Route path="/ppi/:id" element={<ProtectedLayout><PPIDetailPage /></ProtectedLayout>} />
              <Route path="/materials" element={<ProtectedLayout><MaterialsPage /></ProtectedLayout>} />
              <Route path="/materials/:id" element={<ProtectedLayout><MaterialDetailPage /></ProtectedLayout>} />
              <Route path="/topography" element={<ProtectedLayout><TopographyPage /></ProtectedLayout>} />
              <Route path="/admin/health" element={<ProtectedLayout><HealthCheckPage /></ProtectedLayout>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

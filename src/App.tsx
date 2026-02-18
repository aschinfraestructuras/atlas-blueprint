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
import TestsPage from "./pages/TestsPage";
import SuppliersPage from "./pages/SuppliersPage";
import NonConformitiesPage from "./pages/NonConformitiesPage";
import AuditLogPage from "./pages/AuditLogPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

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

              {/* Protected – all share MainLayout */}
              <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
              <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
              <Route path="/documents" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
              <Route path="/tests" element={<ProtectedLayout><TestsPage /></ProtectedLayout>} />
              <Route path="/suppliers" element={<ProtectedLayout><SuppliersPage /></ProtectedLayout>} />
              <Route path="/non-conformities" element={<ProtectedLayout><NonConformitiesPage /></ProtectedLayout>} />
              <Route path="/audit" element={<ProtectedLayout><AuditLogPage /></ProtectedLayout>} />
              <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

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

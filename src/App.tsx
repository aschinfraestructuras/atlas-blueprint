import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  FolderKanban,
  FileText,
  Truck,
  FlaskConical,
  AlertTriangle,
  ScrollText,
  Settings,
} from "lucide-react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
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
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected – all share MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.projects.title"
                    subtitleKey="pages.projects.subtitle"
                    icon={FolderKanban}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.documents.title"
                    subtitleKey="pages.documents.subtitle"
                    icon={FileText}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.tests.title"
                    subtitleKey="pages.tests.subtitle"
                    icon={FlaskConical}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.suppliers.title"
                    subtitleKey="pages.suppliers.subtitle"
                    icon={Truck}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/non-conformities"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.nonConformities.title"
                    subtitleKey="pages.nonConformities.subtitle"
                    icon={AlertTriangle}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.auditLog.title"
                    subtitleKey="pages.auditLog.subtitle"
                    icon={ScrollText}
                  />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedLayout>
                  <PlaceholderPage
                    titleKey="pages.settings.title"
                    subtitleKey="pages.settings.subtitle"
                    icon={Settings}
                  />
                </ProtectedLayout>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

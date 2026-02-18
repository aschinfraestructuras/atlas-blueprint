import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

            {/* Protected – wrapped in MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DashboardPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.projects.title" subtitleKey="pages.projects.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.documents.title" subtitleKey="pages.documents.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.suppliers.title" subtitleKey="pages.suppliers.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.tests.title" subtitleKey="pages.tests.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/non-conformities"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.nonConformities.title" subtitleKey="pages.nonConformities.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlaceholderPage titleKey="pages.settings.title" subtitleKey="pages.settings.subtitle" />
                  </MainLayout>
                </ProtectedRoute>
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

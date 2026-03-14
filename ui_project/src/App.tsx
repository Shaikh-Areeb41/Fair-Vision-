import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PageTransition } from "./components/motion/PageTransition";
import { TopNav } from "./components/TopNav";
import { Dashboard } from "./components/Dashboard";
import { UploadPage } from "./pages/UploadPage";
import { TrainingPage } from "./pages/TrainingPage";
import { MitigationPage } from "./pages/MitigationPage";
import { ReportsPage } from "./pages/ReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { HistoryPage } from "./pages/HistoryPage"; 
import { SettingsPage } from "./pages/SettingsPage"; // <--- 1. IMPORT SETTINGS
import { LoadingScreen } from "./components/LoadingScreen"; 
import { AuditIntelligencePage } from "./pages/AuditIntelligencePage";
import { AdminTestPage } from "./pages/AdminTestPage";
import { ThemeToggle } from "./components/ThemeToggle";

type AppState = {
  isLoading: boolean;
  loadingTitle: string;
  loadingSubtitle: string;
};

const ProtectedLayout = ({ children, userName }: { children: React.ReactNode, userName: string }) => {
  return (
    <div className="min-h-screen fv-shell flex flex-col">
      <TopNav userName={userName} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      {/* Temporary testing placement requested by user */}
      <div className="fixed left-4 bottom-4 z-[80]">
        <ThemeToggle />
      </div>
    </div>
  );
};

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [appState, setAppState] = useState<AppState>({
    isLoading: false,
    loadingTitle: "",
    loadingSubtitle: "",
  });

  const handleUploadComplete = (data: {
    datasetFile?: File | null;
    datasetId?: string;
    id?: string;
  }) => {
    const finalId = data.datasetId || data.id;

    if (finalId) {
      localStorage.setItem("activeDatasetId", finalId);
      sessionStorage.setItem("activeDatasetId", finalId); 
    }

    navigate("/train");
  };

  const handleLoadingComplete = () => {
    setAppState((prev) => ({ ...prev, isLoading: false }));
    navigate("/train");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Initializing Secure Session...</div>
      </div>
    );
  }

  if (appState.isLoading) {
    return (
      <LoadingScreen
        title={appState.loadingTitle}
        subtitle={appState.loadingSubtitle}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/dashboard" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/upload" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <UploadPage onUploadComplete={handleUploadComplete} />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/train" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <TrainingPage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/mitigation" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <MitigationPage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/reports" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <ReportsPage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/history" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <HistoryPage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/audit-intelligence" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <AuditIntelligencePage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/admin-test" element={
          user ? (
            Boolean(user.is_admin) ? (
              <ProtectedLayout userName={user.full_name}>
                <PageTransition>
                  <AdminTestPage />
                </PageTransition>
              </ProtectedLayout>
            ) : <Navigate to="/dashboard" replace />
          ) : <Navigate to="/login" />
        } />

        {/* --- 2. REGISTER SETTINGS ROUTE --- */}
        <Route path="/settings" element={
          user ? (
            <ProtectedLayout userName={user.full_name}>
              <PageTransition>
                <SettingsPage />
              </PageTransition>
            </ProtectedLayout>
          ) : <Navigate to="/login" />
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
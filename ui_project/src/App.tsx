import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/motion/PageTransition";
import { TopNav } from "./components/TopNav";
import { Dashboard } from "./components/Dashboard";
import { UploadPage } from "./components/UploadPage";
import { LoadingScreen } from "./components/LoadingScreen";
import { TrainingPage } from "./components/TrainingPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { MitigationPage } from "./pages/MitigationPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { toast } from "sonner";


type User = {
  name: string;
  email: string;
} | null;

type BiasMetric = {
  name: string;
  value: number;
  threshold: number;
  status: "warning" | "good";
  description: string;
};

type AppState = {
  user: User;
  isLoading: boolean;
  loadingTitle: string;
  loadingSubtitle: string;
  hasModel: boolean;
  modelFile?: File;
  datasetFile?: File;
  datasetId?: string;
  trainedModel?: string;
  analysisData: {
    hasBiasAnalysis: boolean;
    hasMitigation: boolean;
    metrics: BiasMetric[];
  };
  selectedMitigation?: string;
};

const mockBiasMetrics = [
  {
    name: "Demographic Parity",
    value: 0.15,
    threshold: 0.1,
    status: "warning" as const,
    description: "Measures equal positive prediction rates across groups",
  },
  {
    name: "Equalized Odds",
    value: 0.08,
    threshold: 0.1,
    status: "good" as const,
    description: "Measures equal true positive rates across groups",
  },
  {
    name: "Calibration",
    value: 0.12,
    threshold: 0.1,
    status: "warning" as const,
    description: "Measures prediction accuracy consistency across groups",
  },
  {
    name: "Individual Fairness",
    value: 0.06,
    threshold: 0.1,
    status: "good" as const,
    description: "Measures similar treatment of similar individuals",
  },
];

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<AppState>({
    // 1. TRICK THE APP: Set a default user immediately
    user: { name: "Demo User", email: "demo@fairvision.ai" },
    isLoading: false,
    loadingTitle: "",
    loadingSubtitle: "",
    hasModel: false,
    analysisData: {
      hasBiasAnalysis: false,
      hasMitigation: false,
      metrics: [],
    },
  });

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleUploadComplete = (data: {
    hasModel: boolean;
    modelFile?: File;
    datasetFile?: File;
    datasetId?: string;
  }) => {
    updateState({
      hasModel: data.hasModel,
      modelFile: data.modelFile,
      datasetFile: data.datasetFile,
      datasetId: data.datasetId,
      isLoading: true,
      loadingTitle: data.hasModel
        ? "Checking Your Model"
        : "Preparing Training",
      loadingSubtitle: data.hasModel
        ? "Validating model compatibility and structure"
        : "Setting up training environment",
    });
  };

  const handleLoadingComplete = () => {
    // Proceed to training after successful configuration save
    updateState({ isLoading: false });
    navigate("/train");
  };

  const handleTrainingComplete = (modelType: string) => {
    updateState({ trainedModel: modelType });
    navigate("/analysis");
  };

  const handleBiasAnalysisComplete = () => {
    updateState({
      analysisData: {
        hasBiasAnalysis: true,
        hasMitigation: false,
        metrics: mockBiasMetrics,
      },
    });
    navigate("/dashboard");
    toast.success("Bias analysis completed! Check your dashboard for results.");
  };

  const handleMitigationSelect = (technique: string) => {
    updateState({ selectedMitigation: technique });
  };

  const handleApplyMitigation = () => {
    updateState({
      analysisData: {
        ...state.analysisData,
        hasMitigation: true,
      },
    });
    navigate("/dashboard");
    toast.success(
      "Mitigation applied successfully! View results on your dashboard."
    );
  };


  if (state.isLoading) {
    return (
      <LoadingScreen
        title={state.loadingTitle}
        subtitle={state.loadingSubtitle}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col ">
      {/* 4. TopNav will now show "Demo User" */}
      <TopNav userName={state.user?.name || "Demo User"} />
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/dashboard"
              element={
                <PageTransition>
                  <Dashboard 
                    analysisData={state.analysisData} 
                    datasetId={state.datasetId}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/upload"
              element={
                <PageTransition>
                  <UploadPage onUploadComplete={handleUploadComplete} />
                </PageTransition>
              }
            />
            <Route
              path="/train"
              element={
                <PageTransition>
                  <TrainingPage datasetId={state.datasetId} onTrainingComplete={handleTrainingComplete} />
                </PageTransition>
              }
            />
            <Route
              path="/analysis"
              element={
                <PageTransition>
                  <AnalysisPage
                    hasModel={state.hasModel}
                    trainedModel={state.trainedModel}
                    datasetFile={state.datasetFile}
                    datasetId={state.datasetId}
                    onComplete={handleBiasAnalysisComplete}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/mitigation"
              element={
                <PageTransition>
                  <MitigationPage
                    selectedMitigation={state.selectedMitigation}
                    onSelect={handleMitigationSelect}
                    onApply={handleApplyMitigation}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/reports"
              element={
                <PageTransition>
                  <ReportsPage
                    hasBiasAnalysis={state.analysisData.hasBiasAnalysis}
                    hasMitigation={state.analysisData.hasMitigation}
                    hasModel={state.hasModel}
                    trainedModel={state.trainedModel}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/settings"
              element={
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
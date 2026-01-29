import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Server, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  BookOpenCheck
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

interface TrainingPageProps {
  datasetId?: string; 
  onTrainingComplete?: (modelType: string) => void; 
}

export function TrainingPage({ datasetId: propId, onTrainingComplete }: TrainingPageProps) {
  const [selectedModel, setSelectedModel] = useState<"logistic" | "forest">("logistic");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const id = propId || localStorage.getItem("activeDatasetId") || sessionStorage.getItem("activeDatasetId");
    
    if (id) {
      setActiveId(id);
    } else {
      console.error("TrainingPage: No ID found.");
    }
  }, [propId]);

  const handleTrain = async () => {
    if (!activeId) {
      toast.error("No audit session found. Please upload a dataset first.");
      return;
    }

    setLoading(true);
    try {
      const modelType = selectedModel === "logistic" ? "logistic" : "random_forest";
      
      // 1. Call API and CAPTURE the response
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API_URL}/analysis/${activeId}/train`, {
        model_type: modelType
      });

      console.log("Audit Results Received:", response.data); // Debug log

      // 2. CRITICAL FIX: Save the results so Dashboard can see them
      localStorage.setItem("analysisResults", JSON.stringify(response.data));
      // Also save to 'dashboardData' just in case your Dashboard looks there
      localStorage.setItem("dashboardData", JSON.stringify(response.data));
      
      // Save status
      localStorage.setItem("modelStatus", "trained");

      toast.success("Audit Engine Initialized Successfully");
      
      // 3. Navigation with Delay
      setTimeout(() => {
        if (onTrainingComplete) {
            onTrainingComplete(modelType);
        } else {
            window.location.href = "/dashboard";
        }
      }, 800);

    } catch (error: any) {
      console.error("Training error:", error);
      const msg = error.response?.data?.detail || "Failed to initialize audit engine.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-2">
            <Server className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Configure Audit Engine
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the algorithmic standard for this compliance check. <br/>
            Regulators recommend <strong>Interpretable Standards</strong> for transparency.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="flex justify-center mt-8">
          
          {/* OPTION 1: LOGISTIC REGRESSION */}
              <div 
                onClick={() => setSelectedModel("logistic")}
                // ADD "w-full max-w-md" at the start of the class string:
                className={`w-full max-w-md cursor-pointer group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                  selectedModel === "logistic" 
                    ? "border-purple-600 bg-purple-50/50 dark:bg-purple-900/10 shadow-lg ring-1 ring-purple-600" 
                    : "border-border bg-card hover:border-purple-300 dark:hover:border-purple-700"
                }`}
              >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${selectedModel === "logistic" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  <BookOpenCheck className="w-6 h-6" />
                </div>
                {selectedModel === "logistic" && (
                  <CheckCircle2 className="w-6 h-6 text-purple-600" />
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-foreground">Standard Compliance Audit</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Uses <strong>Logistic Regression</strong>. Highly interpretable and transparent.
                </p>
              </div>

              <ul className="space-y-2 pt-2">
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Fully Explainable Decisions
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Industry Standard for Audits
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Fast Execution
                </li>
              </ul>
            </div>
            {selectedModel === "logistic" && (
                <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-xs font-bold text-center py-1">
                    RECOMMENDED FOR REGULATORY USE
                </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-6">
          <Button 
            size="lg" 
            onClick={handleTrain} 
            disabled={loading || !activeId}
            className="w-full md:w-auto min-w-[200px] h-12 text-base bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl transition-all hover:scale-105"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                Initializing Engine...
              </>
            ) : (
              <>
                Initialize Audit <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  Scale, ArrowRight, CheckCircle, Loader2, RefreshCw, Sliders, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { BiasBarChart } from "../components/Charts/BiasBarChart"; 
import { getToken } from "../lib/api";

const API_URL = (() => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const base = raw && raw.length > 0 ? raw.replace(/\/$/, "") : "http://127.0.0.1:8000/api";
  return /\/api$/i.test(base) ? base : `${base}/api`;
})();

interface MitigationPageProps {
  onApply?: () => void;
}

export function MitigationPage({ onApply }: MitigationPageProps) {
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [mitigatedData, setMitigatedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("activeDatasetId") || sessionStorage.getItem("activeDatasetId");
    if (id) {
      setDatasetId(id);
      fetchData(id);
    }
  }, []);

  const fetchData = async (id: string) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const res = await axios.get(`${API_URL}/datasets/${id}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data?.analysis) setOriginalData(res.data.analysis);
      if (res.data?.mitigation) setMitigatedData(res.data.mitigation);
      
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "Could not load analysis data.");
    }
  };

  const handleApplyMitigation = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const response = await axios.post(`${API_URL}/mitigation/${datasetId}/apply`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      setMitigatedData(response.data);
      
      // Update Dashboard Storage
      try {
          const currentDashboard = JSON.parse(localStorage.getItem("dashboardData") || "{}");
          currentDashboard.mitigation = response.data;
          localStorage.setItem("dashboardData", JSON.stringify(currentDashboard));
      } catch (e) { /* Ignore */ }

      toast.success("Mitigation applied successfully.");
      if (onApply) onApply();

    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Simulation failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: SAFE NUMBER FORMATTER ---
  // Prevents "Cannot read properties of undefined"
  const safeFormat = (val: any, decimals: number = 1) => {
    if (val === undefined || val === null) return "0.0";
    const parsed = Number(val);
    if (!Number.isFinite(parsed)) return "0.0";
    const normalized = parsed <= 1 ? parsed * 100 : parsed;
    return normalized.toFixed(decimals);
  };

  const safeFixed = (val: any, decimals: number = 3) => {
      if (val === undefined || val === null) return "-";
      return Number(val).toFixed(decimals);
  };

  if (!datasetId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Scale className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">No Audit Session Selected</h2>
        <p className="text-muted-foreground mb-4">Please initiate a compliance audit first.</p>
        <Link to="/upload"><Button>Start New Audit</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sliders className="w-8 h-8 text-primary" />
            Fairness Simulator
          </h1>
          <p className="text-muted-foreground mt-1">
            Simulate algorithmic adjustments using threshold optimization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="fv-panel border-primary/30">
            <CardHeader>
              <CardTitle>Recommended Strategy</CardTitle>
              <CardDescription>Based on your analysis results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-[rgb(var(--status-analytics))]/60 bg-[rgb(var(--status-analytics-soft))]/50 rounded-xl cursor-pointer relative overflow-hidden transition-all hover:scale-[1.01]">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">Best Fit</div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Threshold Optimizer
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Adjusts the acceptance threshold for unprivileged groups to equalize selection rates.
                </p>
              </div>

              <div className="mt-6">
                <Button 
                  className="w-full shadow-lg" 
                  size="lg"
                  onClick={handleApplyMitigation}
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Optimizing...</>
                  ) : mitigatedData ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Re-Run Simulation</>
                  ) : (
                    <><Scale className="w-4 h-4 mr-2" /> Apply Mitigation</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8">
          {!mitigatedData ? (
             <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/20 fv-panel">
               <div className="p-4 bg-card rounded-full shadow-sm mb-4">
                    <Scale className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Results will appear here</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
                  Click "Apply Mitigation" to run the optimizer.
                </p>
             </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* DPD Comparison */}
                 <Card className="fv-panel">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Demographic Parity Diff</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="opacity-50">
                            {/* SAFE FORMATTING */}
                            <div className="text-2xl font-bold text-foreground">
                                {safeFixed(originalData?.dpd)}
                            </div>
                            <div className="text-xs text-destructive font-medium">Before</div>
                        </div>
                          <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                        <div>
                            {/* SAFE FORMATTING */}
                            <div className="text-3xl font-bold text-success">
                                {safeFixed(mitigatedData.projected_dpd)}
                            </div>
                            <div className="text-xs text-success font-bold">After Mitigation</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>

                 {/* Accuracy Comparison */}
                 <Card className="fv-panel">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                          <div className="opacity-50">
                            {/* SAFE FORMATTING */}
                            <div className="text-2xl font-bold text-foreground">
                                {safeFormat(originalData?.accuracy)}%
                            </div>
                            <div className="text-xs font-medium">Before</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                        <div>
                            {/* SAFE FORMATTING */}
                            <div className="text-3xl font-bold text-primary">
                                {safeFormat(mitigatedData.projected_accuracy)}%
                            </div>
                            <div className="text-xs text-primary font-bold">New Accuracy</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>
              </div>

              {/* SUCCESS BANNER */}
                <div className="bg-success/10 border border-success/30 p-4 rounded-lg flex items-start gap-3 fv-panel">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                 <div>
                    <h4 className="font-semibold text-foreground">Mitigation Successful</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                       Bias (DPD) improved.
                    </p>
                 </div>
              </div>

              {/* CHART */}
              <div className="p-6 border rounded-xl fv-panel">
                  <h4 className="font-semibold mb-6 text-sm">Simulated Selection Rates (Post-Mitigation)</h4>
                  <div className="h-[250px] w-full">
                    <BiasBarChart
                        title=""
                        data={[
                          // SAFE FORMATTING FOR CHART
                          { name: "Privileged", rate: safeFormat(mitigatedData.privileged_rate) },
                          { name: "Unprivileged", rate: safeFormat(mitigatedData.unprivileged_rate) }
                        ]}
                        height={250}
                        colors={["rgb(var(--status-success))", "rgb(var(--status-success) / 0.78)"]}
                      />
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
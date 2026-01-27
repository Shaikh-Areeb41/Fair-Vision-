import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { 
  Scale, ArrowRight, CheckCircle, Loader2, RefreshCw, Sliders, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { BiasBarChart } from "../components/Charts/BiasBarChart"; 

interface MitigationPageProps {
  onApply?: () => void;
}

export function MitigationPage({ onApply }: MitigationPageProps) {
  const navigate = useNavigate();
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
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/datasets/${id}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data?.analysis) setOriginalData(res.data.analysis);
      if (res.data?.mitigation) setMitigatedData(res.data.mitigation);
      
    } catch (e) {
      console.error(e);
      toast.error("Could not load analysis data.");
    }
  };

  const handleApplyMitigation = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(`/mitigation/${datasetId}/apply`, {}, {
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

    } catch (error) {
      console.error(error);
      toast.error("Simulation failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: SAFE NUMBER FORMATTER ---
  // Prevents "Cannot read properties of undefined"
  const safeFormat = (val: any, decimals: number = 1, multiplier: number = 100) => {
    if (val === undefined || val === null) return "0.0";
    return (val * multiplier).toFixed(decimals);
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
    <div className="p-6 max-w-5xl mx-auto min-h-screen animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sliders className="w-8 h-8 text-purple-600" />
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
          <Card className="glass-card border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle>Recommended Strategy</CardTitle>
              <CardDescription>Based on your analysis results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-xl cursor-pointer relative overflow-hidden transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">Best Fit</div>
                <h3 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Threshold Optimizer
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mt-2 leading-relaxed">
                  Adjusts the acceptance threshold for unprivileged groups to equalize selection rates.
                </p>
              </div>

              <div className="mt-6">
                <Button 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg" 
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
             <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm mb-4">
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
                 <Card className="glass-card">
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
                            <div className="text-xs text-red-500 font-medium">Before</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                        <div>
                            {/* SAFE FORMATTING */}
                            <div className="text-3xl font-bold text-emerald-600">
                                {safeFixed(mitigatedData.projected_dpd)}
                            </div>
                            <div className="text-xs text-emerald-600 font-bold">After Mitigation</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>

                 {/* Accuracy Comparison */}
                 <Card className="glass-card">
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
                        <ArrowRight className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                        <div>
                            {/* SAFE FORMATTING */}
                            <div className="text-3xl font-bold text-blue-600">
                                {safeFormat(mitigatedData.projected_accuracy)}%
                            </div>
                            <div className="text-xs text-blue-600 font-bold">New Accuracy</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>
              </div>

              {/* SUCCESS BANNER */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-lg flex items-start gap-3">
                 <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                 <div>
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Mitigation Successful</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                       Bias (DPD) improved.
                    </p>
                 </div>
              </div>

              {/* CHART */}
              <div className="p-6 border rounded-xl bg-card shadow-sm">
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
                        colors={["#10b981", "#34d399"]}
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
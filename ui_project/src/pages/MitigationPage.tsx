import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { 
  Scale, ArrowRight, CheckCircle, Loader2, RefreshCw, ShieldCheck, Sliders
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DecisionPoint } from "../components/DecisionPoint";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BiasBarChart } from "../components/Charts/BiasBarChart";

interface MitigationPageProps {
  selectedMitigation?: string;
  onSelect: (technique: string) => void;
  onApply: () => void;
}

export function MitigationPage({ selectedMitigation, onSelect, onApply }: MitigationPageProps) {
  const navigate = useNavigate();
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [mitigatedData, setMitigatedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("activeDatasetId");
    if (id) {
      setDatasetId(id);
      fetchData(id);
    }
  }, []);

  const fetchData = async (id: string) => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/datasets/${id}`);
      if (res.data?.analysis) setOriginalData(res.data.analysis);
      if (res.data?.mitigation) setMitigatedData(res.data.mitigation);
    } catch (e) {
      toast.error("Could not load analysis data.");
    }
  };

  const handleApplyMitigation = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/mitigation/${datasetId}/apply`);
      setMitigatedData(response.data);
      toast.success("Simulation complete. Results saved.");
      if (onApply) onApply();
    } catch (error) {
      toast.error("Simulation failed. Check system logs.");
    } finally {
      setLoading(false);
    }
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard">
          <Button variant="outline">
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
            Simulate algorithmic adjustments to visualize potential regulatory compliance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Strategy Selection */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass-card border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle>Remediation Strategy</CardTitle>
              <CardDescription>Recommended technique based on audit metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-xl cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">
                  Compliance Standard
                </div>
                <h3 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Reweighing
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                  Adjusts sample weights to equalize importance of underrepresented groups.
                </p>
                <div className="mt-3 flex gap-2 text-xs text-purple-700/70 dark:text-purple-300/70">
                  <span className="bg-white/50 px-1.5 py-0.5 rounded">Pre-processing</span>
                  <span className="bg-white/50 px-1.5 py-0.5 rounded">Non-Destructive</span>
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800" 
                  size="lg"
                  onClick={handleApplyMitigation}
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating...</>
                  ) : mitigatedData ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Re-Run Simulation</>
                  ) : (
                    <><Scale className="w-4 h-4 mr-2" /> Run Simulation</>
                  )}
                </Button>
                {mitigatedData && (
                   <p className="text-xs text-center text-muted-foreground mt-2">
                     Simulation active. <br/> Results appended to audit log.
                   </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Results Comparison */}
        <div className="lg:col-span-8">
          {!mitigatedData ? (
             <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <Scale className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Ready to Simulate</h3>
                <p className="text-sm text-muted-foreground/70 text-center max-w-sm mt-2">
                  Execute the simulation to view projected compliance metrics vs. original audit.
                </p>
             </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              <div className="grid grid-cols-2 gap-4">
                 <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Demographic Parity Diff</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="opacity-50">
                            <div className="text-2xl font-bold text-foreground">{originalData?.dpd?.toFixed(3) ?? "-"}</div>
                            <div className="text-xs text-red-500">Audit Finding</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                        <div>
                            <div className="text-3xl font-bold text-emerald-600">{mitigatedData.mitigated_dpd}</div>
                            <div className="text-xs text-emerald-600 font-medium">Projected</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>

                 <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                         <div className="opacity-50">
                            <div className="text-2xl font-bold text-foreground">{originalData ? (originalData.accuracy * 100).toFixed(1) : "-"}%</div>
                            <div className="text-xs">Baseline</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                        <div>
                            <div className="text-3xl font-bold text-blue-600">{(mitigatedData.mitigated_accuracy * 100).toFixed(1)}%</div>
                            <div className="text-xs text-blue-600 font-medium">Projected</div>
                        </div>
                      </div>
                    </CardContent>
                 </Card>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-lg flex items-start gap-3">
                 <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                 <div>
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Simulation Successful</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                       The simulator has applied <strong>Reweighing</strong> to the dataset. 
                       <br/>
                       Fairness gap (DPD) improved by <span className="font-bold">{originalData ? ((originalData.dpd - mitigatedData.mitigated_dpd) * 100).toFixed(1) : 0}%</span>.
                    </p>
                 </div>
              </div>

              <div className="p-4 border rounded-xl bg-card">
                  <h4 className="font-semibold mb-4 text-sm">Projected Selection Rates</h4>
                  <BiasBarChart
                      title=""
                      data={[
                        { name: "Privileged", rate: (mitigatedData.privileged_rate * 100).toFixed(1) },
                        { name: "Unprivileged", rate: (mitigatedData.unprivileged_rate * 100).toFixed(1) }
                      ]}
                      height={180}
                      colors={["#10b981", "#34d399"]}
                   />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

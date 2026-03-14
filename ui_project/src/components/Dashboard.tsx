import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Upload,
  Database,
  Loader2,
  Scale,
  ArrowRight,
  LayoutDashboard,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "../lib/api";

// Charts - Assuming these exist in your project structure
import { BiasBarChart } from "../components/Charts/BiasBarChart"; 
import { BiasVerticalBar } from "../components/Charts/BiasVerticalBar";
const API_URL = import.meta.env.VITE_API_URL; 

// --- INLINE UI COMPONENTS (Preserved from your code) ---
const Button = ({ className, variant = "default", size = "default", ...props }: any) => {
  const variants: any = {
    default: "border border-border bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft-sm hover:shadow-soft-lg",
    secondary: "border border-border bg-card text-foreground hover:bg-muted shadow-soft-sm hover:shadow-soft-lg",
    ghost: "border border-border text-muted-foreground hover:bg-muted",
    outline: "border border-border bg-transparent hover:bg-muted text-foreground hover:shadow-soft-sm"
  };
  const sizes: any = { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", lg: "h-10 rounded-md px-8" };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] will-change-transform ${variants[variant]} ${sizes[size]} ${className || ""}`}
      {...props}
    />
  );
};

const Badge = ({ className, variant = "default", ...props }: any) => {
  const variants: any = {
    default: "border-transparent bg-foreground text-background hover:bg-foreground/90",
    secondary: "border-transparent bg-muted text-foreground",
    outline: "text-foreground border border-border",
  };
  return <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className || ""}`} {...props} />;
};

const Card = ({ className, ...props }: any) => (
  <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-soft ${className || ""}`} {...props} />
);
const CardHeader = ({ className, ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className || ""}`} {...props} />
);
const CardTitle = ({ className, ...props }: any) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className || ""}`} {...props} />
);
const CardDescription = ({ className, ...props }: any) => (
  <p className={`text-sm text-muted-foreground ${className || ""}`} {...props} />
);
const CardContent = ({ className, ...props }: any) => (
  <div className={`p-6 pt-0 ${className || ""}`} {...props} />
);

interface DashboardProps {
  datasetId?: string;
  analysisData?: { hasBiasAnalysis: boolean };
}

export function Dashboard({ datasetId: propDatasetId, analysisData }: DashboardProps) {
  const location = useLocation();
  
  // 1. ROBUST ID RESOLUTION (Checks Props -> Nav State -> LocalStorage)
  const effectiveDatasetId = 
    propDatasetId || 
    location.state?.datasetId || 
    localStorage.getItem("activeDatasetId") || 
    sessionStorage.getItem("activeDatasetId");
    
  const datasetId = effectiveDatasetId;

  // 2. Existing State
  const [data, setData] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [previewRows, setPreviewRows] = useState(5);
  
  // 3. Initial Load (Checks for Cached Analysis Results first)
  useEffect(() => {
    // Check LocalStorage (where TrainingPage saves data)
    const storedResults = localStorage.getItem("analysisResults");
    if (storedResults) {
        try {
            const parsed = JSON.parse(storedResults);
            setAnalysisResults(parsed);
        } catch(e) { console.error("Error parsing stored results", e); }
    }
  }, []);


  // 4. Fetch Dataset Info from Backend
  useEffect(() => {
    if (datasetId) {
      setPreviewRows(5);
      const fetchDataset = async () => {
        setLoadingDataset(true);
        try {
          const response = await axios.get(`${API_URL}/datasets/${datasetId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          setData(response.data);
          
          // If the backend has analysis data that is newer or missing from local, use it
          if (response.data?.analysis) {
             // Only override if we don't have results yet, or if we trust backend more
             if (!analysisResults) {
                 setAnalysisResults(response.data.analysis);
             }
          }
        } catch (err: any) {
          console.error("Failed to fetch dataset", err);
          const status = err?.response?.status;

          if (status === 401 || status === 403 || status === 404) {
            localStorage.removeItem("activeDatasetId");
            sessionStorage.removeItem("activeDatasetId");
            setData(null);
            setAnalysisResults(null);
          } else if (datasetId) {
            toast.error("Could not load dataset details.");
          }
        } finally {
          setLoadingDataset(false);
        }
      };
      fetchDataset();
    } else {
      // Only clear if we really have no ID and no local storage data
      if (!localStorage.getItem("analysisResults")) {
          setData(null);
          setAnalysisResults(null);
      }
    }
  }, [datasetId]); // Dependency on ID


  // Helper to determine row count
  const getRowCount = () => {
    if (!data) return null;
    if (data.total_rows !== undefined) return data.total_rows;
    if (data.row_count !== undefined) return data.row_count;
    if (data.num_rows !== undefined) return data.num_rows;
    if (Array.isArray(data.full_data)) return data.full_data.length;
    return null;
  };
  
  const rowCount = getRowCount();

  // --- CHART DATA PREPARATION ---
  
  // Core Selection Rate
  const chartDataSelection = analysisResults ? [
    { name: "Privileged", rate: (analysisResults.privileged_rate * 100).toFixed(1) },
    { name: "Unprivileged", rate: (analysisResults.unprivileged_rate * 100).toFixed(1) }
  ] : [];

  // Chart A: False Positive Rate (FPR)
  const chartDataFPR = analysisResults ? [
    { name: "Privileged", rate: ((analysisResults.privileged_fpr || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((analysisResults.unprivileged_fpr || 0) * 100).toFixed(1) }
  ] : [];

  // Chart B: True Positive Rate (TPR / Recall)
  const chartDataTPR = analysisResults ? [
    { name: "Privileged", rate: ((analysisResults.privileged_tpr || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((analysisResults.unprivileged_tpr || 0) * 100).toFixed(1) }
  ] : [];

  // Chart C: Accuracy
  const chartDataAcc = analysisResults ? [
    { name: "Privileged", rate: ((analysisResults.privileged_accuracy || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((analysisResults.unprivileged_accuracy || 0) * 100).toFixed(1) }
  ] : [];

  // Mitigated Data (Merge from dataset object if available, OR check local storage)
  const mitigation = data?.mitigation || (function(){
      try {
        const d = JSON.parse(localStorage.getItem("dashboardData") || "{}");
        return d.mitigation;
      } catch { return null; }
  })();

  const formatRate = (val: number) => (val * 100).toFixed(1);
  
  const mitChartSelection = mitigation ? [
    { name: "Privileged", rate: (mitigation.privileged_rate * 100).toFixed(1) },
    { name: "Unprivileged", rate: (mitigation.unprivileged_rate * 100).toFixed(1) }
  ] : [];

  const mitChartFPR = mitigation ? [
    { name: "Privileged", rate: ((mitigation.privileged_fpr || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((mitigation.unprivileged_fpr || 0) * 100).toFixed(1) }
  ] : [];

  const mitChartTPR = mitigation ? [
    { name: "Privileged", rate: ((mitigation.privileged_tpr || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((mitigation.unprivileged_tpr || 0) * 100).toFixed(1) }
  ] : [];

  const mitChartAcc = mitigation ? [
    { name: "Privileged", rate: ((mitigation.privileged_accuracy || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((mitigation.unprivileged_accuracy || 0) * 100).toFixed(1) }
  ] : [];


  // Metrics for Cards
  const metrics = analysisResults ? [
    {
      label: "Demographic Parity (DPD)",
      value: analysisResults.dpd.toFixed(3),
      delta: analysisResults.dpd > 0.1 ? "Non-Compliant" : "Compliant",
      Icon: AlertTriangle,
      tint: analysisResults.dpd > 0.1 ? "fv-status-bg-danger" : "fv-status-bg-success",
      deltaTone: analysisResults.dpd > 0.1 ? "fv-status-text-danger" : "fv-status-text-success",
    },
    {
      label: "Disparate Impact (DI)",
      value: analysisResults.di.toFixed(2),
      delta: analysisResults.di < 0.8 ? "Adverse Impact" : "Fair",
      Icon: Scale,
      tint: analysisResults.di < 0.8 ? "fv-status-bg-danger" : "fv-status-bg-info",
      deltaTone: analysisResults.di < 0.8 ? "fv-status-text-danger" : "fv-status-text-info",
    },
    {
      label: "Model Accuracy",
      value: `${(analysisResults.accuracy * 100).toFixed(1)}%`,
      delta: "Baseline Performance",
      Icon: CheckCircle,
      tint: "fv-status-bg-info",
      deltaTone: "fv-status-text-info",
    },
    {
      label: "Fairness Gap",
      value: `${((analysisResults.privileged_rate - analysisResults.unprivileged_rate) * 100).toFixed(1)}%`,
      delta: "Difference in Selection",
      Icon: BarChart3,
      tint: "fv-status-bg-analytics",
      deltaTone: "fv-status-text-danger",
    },
  ] : [];

  const hasDatasetSelected = !!datasetId;
  const datasetConfigured = !!(
    data && (
      String(data.status || "").toLowerCase() === "configured" ||
      (data.target_column && data.sensitive_attribute && data.privileged_group && data.unprivileged_group)
    )
  );
  const trainingCompleted = !!(analysisResults || data?.analysis);
  const mitigationCompleted = !!mitigation;
  const showConfigurationWarning = hasDatasetSelected && !loadingDataset && !!data && !datasetConfigured;
  const showTrainingWarning = hasDatasetSelected && !loadingDataset && !!data && datasetConfigured && !trainingCompleted;

  const canProceed = !!analysisResults;

  return (
<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight ">
          Compliance Oversight Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor regulatory compliance, detect algorithmic bias, and audit fairness metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="lg:col-span-8 space-y-6">

          {/* STATE 1: NO DATA AVAILABLE */}
          {(!datasetId || !analysisResults) && (
            <Card className="glass-card border-dashed border-2 border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 rounded-full bg-secondary mb-4">
                  <LayoutDashboard className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Data Available
                </h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  You haven't uploaded a dataset yet. Upload a CSV file to configure and start your bias analysis.
                </p>
                <Link to="/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" /> Upload New Dataset
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* STATE 2 & 3: DATASET IS LOADED */}
          {(datasetId && analysisResults) && (
            <>
              {/* Dataset Info Card */}
              <Card className="fv-panel fv-accent-left-info shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Current Dataset
                      </CardTitle>
                    </div>
                    {loadingDataset ? (
                      <Badge variant="outline" className="animate-pulse">Loading Details...</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-info/15 text-info hover:bg-info/20 border border-info/30">
                        {data?.filename || "Active Session"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {data || analysisResults ? (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Rows: <span className="font-medium text-foreground">
                        {rowCount !== null ? rowCount.toLocaleString() : "N/A"}
                      </span></span>
                      <span className="text-muted-foreground">Columns: <span className="font-medium text-foreground">{data?.columns?.length ?? "-"}</span></span>
                      <span className="fv-status-text-success font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Configured</span>
                    </div>
                  ) : <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
                </CardContent>
              </Card>

              {/* STATE 3: ANALYSIS RESULTS (Graphs) */}
              {analysisResults ? (
                // STATE 3: ANALYSIS COMPLETE
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {metrics.map(({ label, value, delta, Icon, tint, deltaTone }) => {
                      const borderContext = String(deltaTone).includes("success")
                        ? "fv-accent-left-success"
                        : String(deltaTone).includes("danger")
                        ? "fv-accent-left-danger"
                        : String(deltaTone).includes("analytics")
                        ? "fv-accent-left-analytics"
                        : "fv-accent-left-info";

                      return (
                      <Card key={label} className={`fv-kpi-card fv-panel fv-panel-hover ${borderContext}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="fv-kpi-label">{label}</CardTitle>
                            <div className={`fv-status-chip ${tint}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col">
                            <span className="fv-kpi-value">{value}</span>
                            <span className={`text-sm mt-1 font-semibold ${deltaTone}`}>
                              {delta}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>

                  {/* Main Disparity Chart */}
                  <div className="rounded-xl overflow-hidden">
                    <BiasBarChart
                      title="Selection Rate Disparity (Initial Audit)"
                      description="Visualizing group inequality before remediation."
                      data={chartDataSelection}
                      height={250}
                      colors={["rgb(var(--status-analytics))", "rgb(var(--status-danger))"]}
                      className="fv-accent-left-analytics"
                    />
                  </div>

                  {/* Detailed Analysis Grid */}
                  <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-muted-foreground" /> Detailed Compliance Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <BiasVerticalBar title="Accuracy" description="Metric Stability" data={chartDataAcc} colors={["rgb(var(--status-info))", "rgb(var(--status-info) / 0.75)"]} />
                      <BiasVerticalBar title="False Positive Risk" description="Error Disparity" data={chartDataFPR} colors={["rgb(var(--status-danger))", "rgb(var(--status-danger) / 0.75)"]} />
                      <BiasVerticalBar title="True Positive Rate" description="Opportunity Rate" data={chartDataTPR} colors={["rgb(var(--status-analytics))", "rgb(var(--status-analytics) / 0.75)"]} />
                    </div>
                  </div>

                  {/* Mitigation Results */}
                  {mitigation && (
                    <div className="pt-8 border-t border-dashed border-border">
                      <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-success/15 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-success" />
                          </div>
                          <div>
                             <h2 className="text-2xl font-bold text-foreground">Projected Remediation Results</h2>
                             <p className="text-sm text-muted-foreground">Results simulation using {mitigation.technique}.</p>
                          </div>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Card className="fv-panel fv-accent-left-success p-4 flex justify-between items-center">
                        <div>
                           <p className="text-xs text-muted-foreground font-bold uppercase">Projected Fairness (DPD)</p>
                          <p className="text-2xl font-bold text-success">{mitigation.projected_dpd}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-success/40" />
                      </Card>
                       <Card className="fv-panel fv-accent-left-info p-4 flex justify-between items-center">
                        <div>
                           <p className="text-xs text-muted-foreground font-bold uppercase">Projected Accuracy</p>
                          <p className="text-2xl font-bold text-primary">{formatRate(mitigation.projected_accuracy)}%</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-primary/40" />
                      </Card>
                    </div>

                      <div className="rounded-xl mb-6 overflow-hidden">
                        <BiasBarChart
                          title="Simulated Selection Rates (Post-Mitigation)"
                          description="Outcome distribution after applying remediation."
                          data={mitChartSelection}
                          height={250}
                          colors={["rgb(var(--status-success))", "rgb(var(--status-success) / 0.8)"]}
                          className="fv-accent-left-success"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BiasVerticalBar title="New Accuracy" description="Post-remediation" data={mitChartAcc} colors={["rgb(var(--chart-3))", "rgb(var(--chart-3) / 0.7)"]} />
                        <BiasVerticalBar title="New FPR" description="Post-remediation" data={mitChartFPR} colors={["rgb(var(--chart-4))", "rgb(var(--chart-4) / 0.7)"]} />
                        <BiasVerticalBar title="New TPR" description="Post-remediation" data={mitChartTPR} colors={["rgb(var(--chart-2))", "rgb(var(--chart-2) / 0.7)"]} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Link to="/mitigation">
                      <Button size="lg" className="shadow-lg">
                        Go to Fairness Simulator <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* STATE 4: READY TO AUDIT OR LOADING */
                <>
                  {/* DATA PREVIEW TABLE */}
                  {data?.preview && (
                    <Card className="glass-card mt-6">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-4 h-4 text-muted-foreground" />
                          <CardTitle>Data Preview</CardTitle>
                        </div>
                        <CardDescription>
                          Showing the first {Math.min(data.preview.length, previewRows)} rows of {data.filename}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="overflow-x-auto pb-4">
                          <div className="rounded-md border border-border">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                  <th className="px-4 py-3 font-medium border-b border-border">#</th>
                                  {Object.keys(data.preview[0] || {}).map((key) => (
                                    <th key={key} className="px-4 py-3 font-medium text-foreground border-b border-border">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.preview.slice(0, previewRows).map((row: any, i: number) => (
                                  <tr key={i} className="group border-b border-border hover:bg-muted transition-colors last:border-0">
                                    <td className="px-4 py-3 text-muted-foreground w-12 font-mono text-xs">{i + 1}</td>
                                    {Object.values(row).map((val: any, j: number) => (
                                      <td key={j} className="px-4 py-3 text-foreground whitespace-nowrap max-w-[200px] truncate">
                                        {String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* TOGGLE BUTTON */}
                        {data.preview.length > 5 && (
                          <div className="flex justify-center mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setPreviewRows(prev => prev === 5 ? 15 : 5)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {previewRows === 5 ? (
                                <>Load More <ChevronDown className="ml-2 w-4 h-4" /></>
                              ) : (
                                <>Show Less <ChevronUp className="ml-2 w-4 h-4" /></>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* VISUAL FEEDBACK LOGIC */}
                  {/* If we have an ID but no results yet, show Ready state */}
                    <Card className="glass-card border-dashed border-2 border-success/40 bg-success/10 mt-6">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle className="w-8 h-8 text-success mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Ready to Audit</h3>
                        <p className="text-muted-foreground mb-6">Data configured and verified. Initialize the audit engine.</p>
                        <Link to="/train">
                          <Button size="lg" className="bg-success hover:bg-success/90 text-success-foreground shadow-md">
                            Run Compliance Audit <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                </>
              )}
            </>
          )}
        </div>
      
        {/* RIGHT COLUMN: Sidebar Tools */}
        <div className="lg:col-span-4 space-y-6 hidden lg:block ">
          <Card className="glass-card sticky top-6">
            <CardHeader className="pb-4">
              <div className="rounded-xl border border-border/70 bg-gradient-to-r from-muted/45 via-muted/25 to-transparent px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card">
                    <LayoutDashboard className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-success/60" />
                  <div className="h-1.5 w-10 rounded-full bg-info/45" />
                  <div className="h-1.5 w-6 rounded-full bg-muted-foreground/30" />
                </div>
              </div>
              <CardTitle className="text-lg font-semibold text-foreground mt-2">Remediation Tools</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {showConfigurationWarning && (
                <Card className="fv-panel fv-accent-left-danger border border-danger/30 bg-danger/10">
                  <CardContent className="p-4 pt-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-danger mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dataset Configuration Missing</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This dataset has not been configured yet. Please configure the dataset before proceeding to training.
                        </p>
                      </div>
                    </div>
                    <Link to={datasetId ? `/upload?datasetId=${datasetId}` : "/upload"}>
                      <Button variant="secondary" className="w-full mt-2">Go to Configure Dataset</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {showTrainingWarning && (
                <Card className="fv-panel fv-accent-left-info border border-warning/30 bg-warning/10">
                  <CardContent className="p-4 pt-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Model Not Trained</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This dataset has been configured but training has not been executed. Please train the model before running fairness analysis.
                        </p>
                      </div>
                    </div>
                    <Link to={datasetId ? `/train?datasetId=${datasetId}` : "/train"}>
                      <Button variant="secondary" className="w-full mt-2">Go to Training</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {mitigationCompleted ? (
                <Link to="/reports">
                  <Button variant="secondary" className="w-full">View Governance Report</Button>
                </Link>
              ) : (
                <Link to="/mitigation">
                  <Button variant="secondary" className="w-full" disabled={!trainingCompleted}>Open Fairness Simulator</Button>
                </Link>
              )}
              <Link to="/upload">
                <Button variant="secondary" className="w-full">New Dataset Upload</Button>
              </Link>
              <Link to="/reports">
                  <Button variant="ghost" className="w-full" disabled={!trainingCompleted}>Compliance Reports</Button>
              </Link>
              {canProceed ? (
                <Link to="/reports">
                  <Button
                    variant="ghost"
                    className="w-full"
                  >
                    Compare Models
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled
                >
                  Compare Models
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
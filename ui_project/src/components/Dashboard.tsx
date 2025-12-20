import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileText,
  Target,
  Database,
  Loader2,
  Search,
  Scale,
  ArrowRight,
  LayoutDashboard,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertOctagon,
  ShieldCheck,
  XCircle,
  Filter
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";
import { toast } from "sonner";

// --- INLINE UI COMPONENTS ---
const Button = ({ className, variant = "default", size = "default", ...props }: any) => {
  const variants: any = {
    // Keep a strong primary button for CTAs
    default:
      "border border-black dark:border-white bg-zinc-900 text-white hover:bg-zinc-800 shadow-soft-sm hover:shadow-soft-lg",
    // Token-based secondary so it adapts to light/dark
    secondary:
      "border border-black dark:border-white bg-card text-foreground hover:bg-muted shadow-soft-sm hover:shadow-soft-lg",
    ghost: "border border-black dark:border-white text-muted-foreground hover:bg-muted",
    outline:
      "border border-black dark:border-white bg-transparent hover:bg-muted text-foreground hover:shadow-soft-sm"
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
  <p className={`text-sm text-muted-foreground text-zinc-500 dark:text-zinc-400 ${className || ""}`} {...props} />
);
const CardContent = ({ className, ...props }: any) => (
  <div className={`p-6 pt-0 ${className || ""}`} {...props} />
);

// --- REUSABLE CHART COMPONENT ---
const ComparisonChart = ({ data, title, description, color1 = "#8b5cf6", color2 = "#ec4899" }: any) => (
  <Card className="glass-card h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
          <XAxis type="number" domain={[0, 100]} unit="%" hide />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20}>
             {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? color1 : color2} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

interface DashboardProps {
  datasetId?: string;
  analysisData?: { hasBiasAnalysis: boolean };
}

export function Dashboard({ datasetId, analysisData }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewRows, setPreviewRows] = useState(5);

  // 1. Fetch Dataset Info
  useEffect(() => {
    if (datasetId) {
      setPreviewRows(5);
      const fetchDataset = async () => {
        setLoadingDataset(true);
        try {
          const response = await axios.get(`http://127.0.0.1:8000/api/datasets/${datasetId}`);
          setData(response.data);
          if (response.data?.analysis) {
            setAnalysisResults(response.data.analysis);
            try { sessionStorage.setItem("analysisResults", JSON.stringify(response.data.analysis)); } catch {}
            try { sessionStorage.setItem("hasBiasAnalysis", "true"); } catch {}
          }
        } catch (err) {
          console.error("Failed to fetch dataset", err);
          toast.error("Could not load dataset details.");
        } finally {
          setLoadingDataset(false);
        }
      };
      fetchDataset();
    } else {
      setData(null);
      setAnalysisResults(null);
    }
  }, [datasetId]);

  // 2a. Load any previously computed analysis results from sessionStorage
  useEffect(() => {
    if (!analysisResults) {
      try {
        const raw = sessionStorage.getItem("analysisResults");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") setAnalysisResults(parsed);
        }
      } catch {}
    }
  }, [analysisResults]);

  // 2. Run Scan
  const handleRunScan = async () => {
    if (!datasetId) return;
    setScanning(true);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/analysis/${datasetId}/train`);
      setAnalysisResults(response.data);
      toast.success("Bias Scan Complete!");
    } catch (error: any) {
      console.error("Scan Error:", error);
      toast.error(error.response?.data?.detail || "Scan failed.");
    } finally {
      setScanning(false);
    }
  };

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

  // 3. Prepare Chart Data
  // Core Selection Rate
  const chartDataSelection = analysisResults ? [
    { name: "Privileged", rate: (analysisResults.privileged_rate * 100).toFixed(1) },
    { name: "Unprivileged", rate: (analysisResults.unprivileged_rate * 100).toFixed(1) }
  ] : [];

  // --- EXISTING CHARTS ---
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

  // --- NEW CHARTS (DERIVED/ADDITIONAL) ---
  
  // Chart D: False Negative Rate (FNR) - "Missed Opportunities"
  // FNR = 1 - TPR
  const chartDataFNR = analysisResults ? [
    { name: "Privileged", rate: ((1 - (analysisResults.privileged_tpr || 0)) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((1 - (analysisResults.unprivileged_tpr || 0)) * 100).toFixed(1) }
  ] : [];

  // Chart E: Specificity (TNR) - "Correct Rejections"
  // TNR = 1 - FPR
  const chartDataTNR = analysisResults ? [
    { name: "Privileged", rate: ((1 - (analysisResults.privileged_fpr || 0)) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((1 - (analysisResults.unprivileged_fpr || 0)) * 100).toFixed(1) }
  ] : [];

  // Chart F: Precision - "Prediction Trustworthiness"
  const chartDataPrecision = analysisResults ? [
    { name: "Privileged", rate: ((analysisResults.privileged_precision || 0) * 100).toFixed(1) },
    { name: "Unprivileged", rate: ((analysisResults.unprivileged_precision || 0) * 100).toFixed(1) }
  ] : [];


  // 4. Metrics Cards Configuration
  const metrics = analysisResults ? [
    {
      label: "Demographic Parity (DPD)",
      value: analysisResults.dpd.toFixed(3),
      delta: analysisResults.dpd > 0.1 ? "Critical Bias" : "Acceptable",
      Icon: AlertTriangle,
      tint: analysisResults.dpd > 0.1 ? "from-rose-100 to-orange-100" : "from-emerald-100 to-green-100",
    },
    {
      label: "Disparate Impact (DI)",
      value: analysisResults.di.toFixed(2),
      delta: analysisResults.di < 0.8 ? "Adverse Impact" : "Fair",
      Icon: Scale,
      tint: analysisResults.di < 0.8 ? "from-rose-100 to-red-100" : "from-sky-100 to-blue-100",
    },
    {
      label: "Model Accuracy",
      value: `${(analysisResults.accuracy * 100).toFixed(1)}%`,
      delta: "Baseline Performance",
      Icon: CheckCircle,
      tint: "from-emerald-100 to-teal-100",
    },
    {
      label: "Fairness Gap",
      value: `${((analysisResults.privileged_rate - analysisResults.unprivileged_rate) * 100).toFixed(1)}%`,
      delta: "Difference in Selection",
      Icon: BarChart3,
      tint: "from-violet-100 to-indigo-100",
    },
  ] : [];

  // Sidebar actions gating: enable after analysis completes (from local state or session/app)
  const hasBiasAnalysisFlag = (() => {
    try { return sessionStorage.getItem("hasBiasAnalysis") === "true"; } catch { return false; }
  })();
  const canProceed = !!analysisResults || analysisData?.hasBiasAnalysis || hasBiasAnalysisFlag;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Bias Overview Dashboard
        </h1>
        <p className="text-muted-foreground">
          Visualize bias metrics and prepare for mitigation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="lg:col-span-8 space-y-6">

          {/* STATE 1: NO DATA AVAILABLE */}
          {!datasetId && (
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
                  <Button className="bg-zinc-900 text-white hover:bg-zinc-800">
                    <Upload className="w-4 h-4 mr-2" /> Upload New Dataset
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* STATE 2 & 3: DATASET IS LOADED */}
          {datasetId && (
            <>
              {/* Dataset Info Card */}
              <Card className="glass-card border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Current Dataset
                      </CardTitle>
                    </div>
                    {loadingDataset ? (
                      <Badge variant="outline" className="animate-pulse">Loading Details...</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                        {data?.filename || "Uploaded File"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Rows: <span className="font-medium text-foreground">
                        {rowCount !== null ? rowCount.toLocaleString() : "N/A"}
                      </span></span>
                      <span className="text-muted-foreground">Columns: <span className="font-medium text-foreground">{data.columns?.length ?? "-"}</span></span>
                      <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Configured</span>
                    </div>
                  ) : <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />}
                </CardContent>
              </Card>

              {/* LOGIC SPLIT: Analysis Results vs Ready State */}
              {analysisResults ? (
                // STATE 3: ANALYSIS COMPLETE
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  
                  {/* 1. Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {metrics.map(({ label, value, delta, Icon, tint }) => (
                      <Card key={label} className="glass-card hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{label}</CardTitle>
                            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${tint}`}>
                              <Icon className="h-4 w-4 text-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col">
                            <span className="text-2xl font-bold text-foreground">{value}</span>
                            <span className={`text-xs mt-1 ${String(delta).includes("Bias") || String(delta).includes("Adverse") ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                              {delta}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* 2. Main Disparity Chart (Selection Rate) */}
                  <Card className="glass-card border-l-4 border-l-violet-500">
                    <CardHeader>
                      <CardTitle>Selection Rate Disparity</CardTitle>
                      <CardDescription>
                        Comparing how often the model selects the Privileged vs. Unprivileged group.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataSelection} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                          <XAxis type="number" domain={[0, 100]} unit="%" />
                          <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={40}>
                            {chartDataSelection.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#8b5cf6" : "#ec4899"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* 3. Detailed Analysis Grid (NEW 3 CHARTS) */}
                  <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-muted-foreground" /> Detailed Performance Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Chart A: Accuracy */}
                      <ComparisonChart 
                        data={chartDataAcc} 
                        title="Accuracy Parity" 
                        description="Does the model work equally well for both groups?"
                        color1="#10b981" color2="#34d399" // Green/Emerald
                      />
                      {/* Chart B: FPR */}
                      <ComparisonChart 
                        data={chartDataFPR} 
                        title="False Positive Rate (FPR)" 
                        description="Who is 'falsely accused' or incorrectly benefited?"
                        color1="#f59e0b" color2="#fbbf24" // Amber/Yellow
                      />
                      {/* Chart C: TPR */}
                      <ComparisonChart 
                        data={chartDataTPR} 
                        title="True Positive Rate (Recall)" 
                        description="Who is correctly selected when they should be?"
                        color1="#3b82f6" color2="#60a5fa" // Blue
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Link to="/mitigation">
                      <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg">
                        Proceed to Mitigation <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                // STATE 2: READY TO ANALYZE
                <>
                  
                  
                  {/* DATA PREVIEW TABLE */}
                  {data?.preview && (
                    <Card className="glass-card mt-6">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-4 h-4 text-zinc-500" />
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
                  {/* READY TO ANALYZE CARD */}
                  <Card className="glass-card border-dashed border-2 border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 mt-6">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4 animate-in zoom-in duration-300">
                        <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        Ready to Analyze
                      </h3>
                      <p className="text-muted-foreground max-w-md mb-6">
                        Your data is loaded, configured, and ready to analyze. Run the scan to visualize disparities.
                      </p>
                      {datasetId ? (
                        <Link to="/train">
                          <Button 
                            size="lg" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-105"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Run Bias Scan
                          </Button>
                        </Link>
                      ) : (
                        <Button size="lg" className="bg-emerald-600 text-white" disabled>
                          Run Bias Scan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      
        {/* RIGHT COLUMN: Sidebar Tools */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass-card sticky top-6">
            <CardHeader className="pb-4">
              <div className="p-2 rounded-xl border border-border bg-gradient-to-br from-sky-100 to-violet-100 inline-flex">
                <Target className="w-4 h-4 text-foreground" />
              </div>
              <CardTitle className="text-lg font-semibold text-foreground mt-2">
                Mitigation Tools
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Run scans, apply techniques, upload data, and compare models.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!canProceed && (
                <>
                  {datasetId ? (
                    <Link to="/train">
                      <Button 
                        className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                      >
                        Run Bias Scan
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full bg-zinc-900 text-white" disabled>
                      Run Bias Scan
                    </Button>
                  )}
                </>
              )}
              
              {canProceed ? (
                <Link to="/mitigation">
                  <Button
                    variant="secondary"
                    className="w-full"
                  >
                    Apply Mitigation
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled
                >
                  Apply Mitigation
                </Button>
              )}
              <Link to="/upload">
                <Button
                  variant="secondary"
                  className="w-full"
                >
                  Upload Dataset
                </Button>
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
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  Loader2, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Scale, 
  BarChart3 
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { BiasBarChart } from "../components/Charts/BiasBarChart";
import { BiasVerticalBar } from "../components/Charts/BiasVerticalBar";
const API_URL = import.meta.env.VITE_API_URL; 

// --- HELPER: Prepare Data for Charts ---
// This logic mirrors what we did in the Dashboard to format data for Recharts
function prepareChartData(results: any) {
  if (!results) return { selection: [], acc: [], fpr: [], tpr: [] };

  return {
    selection: [
      { name: "Privileged", rate: (results.privileged_rate * 100).toFixed(1) },
      { name: "Unprivileged", rate: (results.unprivileged_rate * 100).toFixed(1) }
    ],
    acc: [
      { name: "Privileged", rate: ((results.privileged_accuracy || 0) * 100).toFixed(1) },
      { name: "Unprivileged", rate: ((results.unprivileged_accuracy || 0) * 100).toFixed(1) }
    ],
    fpr: [
      { name: "Privileged", rate: ((results.privileged_fpr || 0) * 100).toFixed(1) },
      { name: "Unprivileged", rate: ((results.unprivileged_fpr || 0) * 100).toFixed(1) }
    ],
    tpr: [
      { name: "Privileged", rate: ((results.privileged_tpr || 0) * 100).toFixed(1) },
      { name: "Unprivileged", rate: ((results.unprivileged_tpr || 0) * 100).toFixed(1) }
    ]
  };
}

// --- HELPER: Build Summary Metrics (Single values like DPD) ---
function buildMetricsFromResults(res: any) {
  if (!res) return [];
  const dpd = Number(res.dpd ?? 0);
  const di = Number(res.di ?? 0);
  const acc = Number(res.accuracy ?? 0);
  const gap = Math.abs(Number(res.privileged_rate ?? 0) - Number(res.unprivileged_rate ?? 0));

  return [
    {
      label: "Demographic Parity (DPD)",
      value: dpd.toFixed(3),
      status: dpd > 0.1 ? "Critical Bias" : "Acceptable",
      Icon: AlertTriangle,
      tone: dpd > 0.1 ? "destructive" : "success",
    },
    {
      label: "Disparate Impact (DI)",
      value: di.toFixed(2),
      status: di < 0.8 ? "Adverse Impact" : "Fair",
      Icon: Scale,
      tone: di < 0.8 ? "destructive" : "info",
    },
    {
      label: "Model Accuracy",
      value: `${(acc * 100).toFixed(1)}%`,
      status: "Baseline Performance",
      Icon: CheckCircle,
      tone: "success",
    },
    {
      label: "Fairness Gap",
      value: `${(gap * 100).toFixed(1)}%`,
      status: gap > 0.1 ? "High Gap" : "Low Gap",
      Icon: BarChart3,
      tone: "primary",
    },
  ];
}

interface AnalysisPageProps {
  trainedModel?: string;
  datasetFile?: File;
  datasetId?: string;
  onComplete: () => void;
}

export function AnalysisPage({
  trainedModel,
  datasetFile,
  datasetId,
  onComplete,
}: AnalysisPageProps) {
  // Reactive results: seed from session, then fetch from backend
  const [results, setResults] = useState<any>(() => {
    try {
      const raw = sessionStorage.getItem("analysisResults");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !sessionStorage.getItem("analysisResults"));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!datasetId || results) return;
      try {
        setLoading(true);
        const resp = await axios.get(`${API_URL}/datasets/${datasetId}`);
        const r = resp.data?.analysis || null;
        if (!cancelled && r) {
          setResults(r);
          try { sessionStorage.setItem("analysisResults", JSON.stringify(r)); } catch {}
        }
      } catch (_) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [datasetId, results]);

  const metrics = buildMetricsFromResults(results);
  const chartData = prepareChartData(results);
  
  // Determine global bias status based on DPD or DI
  const isBiased = results ? (results.dpd > 0.1 || results.di < 0.8) : false;

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Bias Analysis Report</h1>
          <p className="text-muted-foreground">
            Detailed breakdown of fairness metrics and group disparities.
          </p>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && !results ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Computing fairness metrics...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* 1. METRICS GRID (Summary Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(({ label, value, status, Icon, tone }) => (
              <Card key={label} className="glass-card hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
                    <div className={`p-2 rounded-full shadow-sm ${tone === "destructive" ? "bg-destructive/15 text-destructive" : ""}${tone === "success" ? "bg-success/15 text-success" : ""}${tone === "info" ? "bg-info/15 text-info" : ""}${tone === "primary" ? "bg-primary/15 text-primary" : ""}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-foreground">{value}</span>
                    <span className={`text-xs mt-1 font-medium ${String(status).includes("Bias") || String(status).includes("Adverse") ? "text-destructive" : "text-muted-foreground"}`}>
                      {status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 2. MAIN VISUALIZATION ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Big Selection Rate Chart */}
            <div className="lg:col-span-2">
              <BiasBarChart
                title="Selection Rate Disparity"
                description="The primary indicator of bias. Shows the percentage of each group selected by the model."
                data={chartData.selection}
                height={320}
                colors={["rgb(var(--chart-1))", "rgb(var(--chart-2))"]}
              />
            </div>

            {/* Right: Model Info & Status */}
            <div className="space-y-6">
              <Card className={`border-l-4 ${isBiased ? "border-l-destructive bg-destructive/10" : "border-l-success bg-success/10"}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isBiased ? <AlertTriangle className="text-destructive"/> : <CheckCircle className="text-success"/>}
                    {isBiased ? "Bias Detected" : "Model is Fair"}
                  </CardTitle>
                  <CardDescription>
                    {isBiased 
                      ? "Critical disparities found between groups. Mitigation is recommended." 
                      : "The model performance is balanced across protected groups."}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Analysis Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Model Type</span>
                    <span className="font-medium">{trainedModel || "Logistic Regression"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Dataset</span>
                    <span className="font-medium">{datasetFile?.name || "Uploaded File"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analysis Engine</span>
                    <span className="font-medium">FairLib v1.0</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

         {/* 3. DETAILED METRICS ROW - Simplified Vertical Bars */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 pl-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Detailed Performance Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               
               {/* 1. ACCURACY: Vertical Bar Chart */}
               <BiasVerticalBar
                  title="Accuracy Comparison"
                  description="Model consistency across groups (Higher is better)."
                  data={chartData.acc}
                  colors={["rgb(var(--chart-3))", "rgb(var(--chart-3) / 0.7)"]}
                />
                
                {/* 2. FPR: Vertical Bar Chart */}
                <BiasVerticalBar
                  title="False Positive Risk"
                  description="Incorrectly approved (Lower is better)."
                  data={chartData.fpr}
                  colors={["rgb(var(--chart-4))", "rgb(var(--chart-4) / 0.7)"]}
                />
                
                {/* 3. TPR: Vertical Bar Chart (Kept same) */}
                <BiasVerticalBar
                  title="True Positive Rate"
                  description="Opportunity comparison (Higher is better)."
                  data={chartData.tpr}
                  colors={["rgb(var(--chart-2))", "rgb(var(--chart-2) / 0.7)"]}
                />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex justify-center pt-8 pb-4">
            <Button onClick={onComplete} size="lg" className="px-10 shadow-lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete & Return to Dashboard
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
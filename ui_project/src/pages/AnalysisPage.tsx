import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { BiasVisualization } from "../components/BiasVisualization";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";

function buildMetricsFromResults(res: any) {
  if (!res) return [] as any[];
  const dpd = Number(res.dpd ?? 0);
  const di = Number(res.di ?? 0);
  const acc = Number(res.accuracy ?? 0);
  const gap = Math.abs(Number(res.privileged_rate ?? 0) - Number(res.unprivileged_rate ?? 0));

  const statusDPD = dpd > 0.2 ? "critical" : dpd > 0.1 ? "warning" : "good";
  const statusDI = di < 0.6 ? "critical" : di < 0.8 ? "warning" : "good";
  const statusAcc = acc < 0.7 ? "critical" : acc < 0.8 ? "warning" : "good";
  const statusGap = gap > 0.2 ? "critical" : gap > 0.1 ? "warning" : "good";

  return [
    {
      name: "Demographic Parity (DPD)",
      value: dpd,
      threshold: 0.1,
      status: statusDPD,
      description: "Difference in positive rates between groups",
    },
    {
      name: "Disparate Impact (DI)",
      value: di,
      threshold: 0.8,
      status: statusDI,
      description: "Ratio of unprivileged to privileged selection rates",
    },
    {
      name: "Accuracy",
      value: acc,
      threshold: 0.8,
      status: statusAcc,
      description: "Overall model accuracy",
    },
    {
      name: "Fairness Gap",
      value: gap,
      threshold: 0.1,
      status: statusGap,
      description: "Absolute selection rate difference",
    },
  ];
}

interface AnalysisPageProps {
  hasModel: boolean;
  trainedModel?: string;
  datasetFile?: File;
  datasetId?: string;
  onComplete: () => void;
}

export function AnalysisPage({
  hasModel,
  trainedModel,
  datasetFile,
  datasetId,
  onComplete,
}: AnalysisPageProps) {
  // Reactive results: seed from session, then fetch from backend when datasetId is present
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
      // If we already have results (from sessionStorage), don't fetch yet;
      // this avoids briefly showing an empty state until backend persists.
      if (!datasetId || results) return;
      try {
        setLoading(true);
        const resp = await axios.get(`http://127.0.0.1:8000/api/datasets/${datasetId}`);
        const r = resp.data?.analysis || null;
        if (!cancelled && r) {
          setResults(r);
          try { sessionStorage.setItem("analysisResults", JSON.stringify(r)); } catch {}
        }
      } catch (_) {
        // ignore; will rely on session copy if present
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [datasetId, results]);

  const metrics = buildMetricsFromResults(results);
  const biasDetected = metrics.some((m) => m.status === "warning" || m.status === "critical");
  const isLoading = loading && metrics.length === 0;
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bias Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive bias detection across multiple fairness metrics
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-0 card-shadow">
          <CardHeader>
            <CardTitle>Model Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Model Type
                </p>
                <p className="text-muted-foreground">
                  {hasModel ? "Uploaded Model" : trainedModel || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Dataset</p>
                <p className="text-muted-foreground">
                  {datasetFile?.name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Analysis Status
                </p>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/30"
                >
                  Ready
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Fairness Metrics
                </p>
                <p className="text-muted-foreground">4 metrics analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Bias Detection Results</CardTitle>
              <Badge
                variant="outline"
                className={biasDetected ? "text-warning border-warning bg-warning/10" : "bg-success/10 text-success border-success/30"}
              >
                {biasDetected ? (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1 text-warning" /> Bias Detected
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1 text-success" /> No Significant Bias
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading analysis results...
              </div>
            ) : (
              <BiasVisualization metrics={metrics} />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={onComplete} size="lg" className="px-8">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Analysis & Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

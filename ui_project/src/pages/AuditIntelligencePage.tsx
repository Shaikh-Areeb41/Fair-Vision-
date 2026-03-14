import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Activity, ArrowRight, Network, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { auditIntelligenceApi, getToken } from "../lib/api";

const API_URL = import.meta.env.VITE_API_URL;
const MAX_HEATMAP_AXIS_CELLS = 10;

type FairnessRow = {
  attribute: string;
  statistical_parity: number;
  disparate_impact: number;
  equalized_odds: number;
  fairness_score: number;
};

type HeatmapCell = {
  x: string;
  y: string;
  count: number;
  selection_rate: number;
  deviation: number;
  severity: number;
};

type ProxyNode = {
  id: string;
  type: "sensitive" | "feature";
};

type ProxyEdge = {
  source: string;
  target: string;
  weight: number;
  absolute_weight: number;
  relationship: "positive" | "negative";
};

type ExplanationItem = {
  text: string;
  type: string;
  title: string;
  severity: "info" | "warning" | "critical";
  affected_attribute?: string;
  affected_groups?: { group: string; selection_rate?: number; count?: number }[];
  key_metrics?: Record<string, number | string | null>;
  recommendations?: string[];
  sample_warning?: string;
};

type AuditIntelligenceResult = {
  fairness: {
    comparison_matrix: FairnessRow[];
    global_fairness_score: number;
  };
  intersectional: {
    combinations: { attributes: string[]; heatmap: HeatmapCell[] }[];
  };
  proxy_bias: {
    nodes: ProxyNode[];
    edges: ProxyEdge[];
  };
  risk_scoring: {
    compliance_score: number;
    risk_level: string;
  };
  explanations: Array<ExplanationItem | string>;
};

type DatasetResponse = {
  columns?: string[];
  target_column?: string;
  dataset_name?: string;
};

function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number | string }> }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-card-foreground mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <p key={`${entry.name}-${index}`} className="text-xs text-card-foreground">
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function AuditIntelligencePage() {
  const [datasetId, setDatasetId] = useState<string>(localStorage.getItem("activeDatasetId") || "");
  const [datasetName, setDatasetName] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [result, setResult] = useState<AuditIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingProgress((previous) => {
        if (previous >= 90) return 90;
        return previous + 8;
      });
    }, 220);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const loadDatasetContext = async () => {
      if (!datasetId) return;
      try {
        const token = getToken();
        const response = await axios.get<DatasetResponse>(`${API_URL}/datasets/${datasetId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const cols = response.data.columns || [];
        setColumns(cols);
        setTargetColumn(response.data.target_column || cols[0] || "");
        setDatasetName(response.data.dataset_name || datasetId);

        try {
          const latest = await auditIntelligenceApi.getLatest(datasetId);
          setResult(latest as AuditIntelligenceResult);
        } catch {
          setResult(null);
        }
      } catch {
        toast.error("Unable to load active dataset context.", { id: "audit-context-load-error" });
      }
    };

    void loadDatasetContext();
  }, [datasetId]);

  const availableSensitive = useMemo(
    () => columns.filter((column) => column !== targetColumn),
    [columns, targetColumn]
  );

  const firstHeatmap = result?.intersectional?.combinations?.[0];
  const allXValues = useMemo(
    () => Array.from(new Set((firstHeatmap?.heatmap || []).map((cell) => cell.x))),
    [firstHeatmap]
  );
  const allYValues = useMemo(
    () => Array.from(new Set((firstHeatmap?.heatmap || []).map((cell) => cell.y))),
    [firstHeatmap]
  );
  const xValues = useMemo(() => allXValues.slice(0, MAX_HEATMAP_AXIS_CELLS), [allXValues]);
  const yValues = useMemo(() => allYValues.slice(0, MAX_HEATMAP_AXIS_CELLS), [allYValues]);
  const isHeatmapTrimmed = allXValues.length > xValues.length || allYValues.length > yValues.length;

  const heatmapIndex = useMemo(() => {
    const cells = firstHeatmap?.heatmap || [];
    const map = new Map<string, HeatmapCell>();
    cells.forEach((cell) => map.set(`${cell.x}|||${cell.y}`, cell));
    return map;
  }, [firstHeatmap]);

  const getHeatmapCellStyle = (fairnessScore: number) => {
    // Map fairness 0..1 to hue 0..120 (red -> green).
    const hue = Math.round(Math.max(0, Math.min(1, fairnessScore)) * 120);
    return {
      backgroundColor: `hsl(${hue} 76% 42% / 0.9)`,
      borderColor: `hsl(${hue} 76% 32% / 1)`,
      color: "#ffffff",
    };
  };

  const getHeatmapValueColor = (fairnessScore: number) => {
    const hue = Math.round(Math.max(0, Math.min(1, fairnessScore)) * 120);
    return `hsl(${hue} 76% 42%)`;
  };

  const toggleAttribute = (attribute: string) => {
    setSelectedAttributes((previous) =>
      previous.includes(attribute)
        ? previous.filter((entry) => entry !== attribute)
        : [...previous, attribute]
    );
  };

  const runAnalysis = async () => {
    if (!datasetId) {
      toast.error("Select an active dataset first.");
      return;
    }
    if (!targetColumn) {
      toast.error("Select a target/outcome column.");
      return;
    }
    if (selectedAttributes.length === 0) {
      toast.error("Select at least one sensitive attribute.");
      return;
    }

    setLoading(true);
    setLoadingProgress(10);
    try {
      const payload = {
        sensitive_attributes: selectedAttributes,
        target_column: targetColumn,
        outcome_column: targetColumn,
        correlation_threshold: 0.25,
      };
      const response = await auditIntelligenceApi.runAnalysis(datasetId, payload);
      setResult(response as AuditIntelligenceResult);
      setLoadingProgress(100);
      toast.success("Audit intelligence analysis completed.", { duration: 3000 });
    } catch {
      toast.error("Audit intelligence analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const proxyNodes = result?.proxy_bias?.nodes || [];
  const proxyEdges = result?.proxy_bias?.edges || [];
  const proxyNodePosition = useMemo(() => {
    const radius = 140;
    const centerX = 170;
    const centerY = 170;
    const positions = new Map<string, { x: number; y: number }>();
    proxyNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(proxyNodes.length, 1);
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
    return positions;
  }, [proxyNodes]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Ethical AI Audit Intelligence</h1>
        <p className="text-muted-foreground">
          Exploratory intelligence layer for multi-attribute disparity analysis, intersectional risk signals, and structural bias visualization.
        </p>
      </div>

      <Card className="fv-panel fv-accent-left-info">
        <CardHeader>
          <CardTitle>Run Audit Intelligence</CardTitle>
          <CardDescription>Select dataset context and sensitive attributes for fairness intelligence analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Active Dataset</p>
              <Input
                value={datasetName || datasetId}
                readOnly
                className="cursor-default opacity-80"
                placeholder="No active dataset selected"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Target / Outcome Column</p>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <SelectValue placeholder="Select target column" />
                </SelectTrigger>
                <SelectContent className="!bg-[rgb(var(--popover))] !text-[rgb(var(--popover-foreground))] !opacity-100 !backdrop-blur-none border border-border shadow-md">
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Sensitive Attributes (multi-select)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableSensitive.map((attribute) => (
                <label
                  key={attribute}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAttributes.includes(attribute)}
                    onChange={() => toggleAttribute(attribute)}
                  />
                  <span className="truncate">{attribute}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={runAnalysis} disabled={loading}>
              {loading ? (
                <motion.span
                  className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              {loading ? "Running..." : "Run Intelligence Audit"}
            </Button>
          </div>

          <div className="rounded-md border border-border bg-card/55 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              This dashboard is for exploratory analysis only. For formal documentation and PDF export, use the Governance Report tab.
            </p>
            <div className="mt-3">
              <Link to="/reports">
                <Button variant="secondary" size="sm">
                  Open Governance Report
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">Running fairness intelligence modules and compiling dashboard outputs...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="fv-panel fv-accent-left-analytics">
              <CardHeader>
                <CardTitle>Global Fairness</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold fv-status-text-analytics">{result.fairness.global_fairness_score.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="fv-panel fv-accent-left-info">
              <CardHeader>
                <CardTitle>Compliance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold fv-status-text-info">{result.risk_scoring.compliance_score.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{result.risk_scoring.risk_level}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="fv-panel fv-accent-left-analytics">
            <CardHeader>
              <CardTitle>Fairness Comparison Matrix</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Attribute</th>
                      <th className="text-left p-2">Statistical Parity</th>
                      <th className="text-left p-2">Disparate Impact</th>
                      <th className="text-left p-2">Equalized Odds</th>
                      <th className="text-left p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fairness.comparison_matrix.map((row) => (
                      <tr key={row.attribute} className="border-t">
                        <td className="p-2">{row.attribute}</td>
                        <td className="p-2">{row.statistical_parity.toFixed(3)}</td>
                        <td className="p-2">{row.disparate_impact.toFixed(3)}</td>
                        <td className="p-2">{row.equalized_odds.toFixed(3)}</td>
                        <td className="p-2 font-semibold">{row.fairness_score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.fairness.comparison_matrix}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" opacity={0.35} />
                    <XAxis dataKey="attribute" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="fairness_score" name="Fairness Score" fill="rgb(var(--status-analytics))" fillOpacity={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="fv-panel fv-accent-left-analytics">
            <CardHeader>
              <CardTitle>Intersectional Bias Heatmap</CardTitle>
              <CardDescription>
                {firstHeatmap ? `${firstHeatmap.attributes.join(" + ")}` : "Select at least two sensitive attributes to view heatmap"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Fairness Scale Legend (0.0 - 1.0)</p>
                <div
                  className="h-2 rounded"
                  style={{
                    background:
                      "linear-gradient(to right, rgb(var(--status-danger)), rgb(var(--warning)), rgb(var(--status-success)))",
                  }}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>0.0 (High Risk / Red)</span>
                  <span>0.5 (Moderate / Amber)</span>
                  <span>1.0 (Low Risk / Green)</span>
                </div>
              </div>

              {firstHeatmap ? (
                <div className="overflow-auto">
                  {isHeatmapTrimmed && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Showing first {MAX_HEATMAP_AXIS_CELLS}x{MAX_HEATMAP_AXIS_CELLS} groups for readability.
                    </p>
                  )}
                  <table className="min-w-full text-sm border rounded-md">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="p-2 text-left">Group</th>
                        {xValues.map((xValue) => (
                          <th key={xValue} className="p-2 text-left">
                            {xValue}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {yValues.map((yValue) => (
                        <tr key={yValue} className="border-t">
                          <td className="p-2 font-medium">{yValue}</td>
                          {xValues.map((xValue) => {
                            const cell = heatmapIndex.get(`${xValue}|||${yValue}`);
                            const fairnessScore = cell ? Math.max(0, Math.min(1, 1 - cell.severity)) : 0;
                            return (
                              <td key={`${xValue}-${yValue}`} className="p-2">
                                {cell ? (
                                  <div
                                    className="group relative rounded border px-2 py-1"
                                    style={getHeatmapCellStyle(fairnessScore)}
                                  >
                                    <div className="font-semibold" style={{ color: "inherit" }}>
                                      {fairnessScore.toFixed(2)}
                                    </div>
                                    <div className="text-xs" style={{ color: "inherit", opacity: 0.92 }}>
                                      n={cell.count}
                                    </div>

                                    <div
                                      className="pointer-events-none absolute left-1/2 top-0 z-50 hidden w-56 -translate-x-1/2 -translate-y-[108%] rounded-md border border-border px-3 py-2 text-xs shadow-2xl group-hover:block"
                                      style={{
                                        backgroundColor: "rgb(var(--card))",
                                        color: "rgb(var(--card-foreground))",
                                        opacity: 1,
                                        backdropFilter: "none",
                                        WebkitBackdropFilter: "none",
                                      }}
                                    >
                                      <div className="mb-1 font-semibold" style={{ color: "rgb(var(--card-foreground))" }}>
                                        {cell.x} + {cell.y}
                                      </div>
                                      <div style={{ color: "rgb(var(--card-foreground))" }}>
                                        Selection Rate: <span className="font-semibold" style={{ color: getHeatmapValueColor(fairnessScore) }}>{cell.selection_rate.toFixed(3)}</span>
                                      </div>
                                      <div style={{ color: "rgb(var(--card-foreground))" }}>
                                        Bias Severity: <span className="font-semibold" style={{ color: getHeatmapValueColor(fairnessScore) }}>{cell.severity.toFixed(3)}</span>
                                      </div>
                                      <div style={{ color: "rgb(var(--card-foreground))" }}>
                                        Fairness Score: <span className="font-semibold" style={{ color: getHeatmapValueColor(fairnessScore) }}>{fairnessScore.toFixed(3)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No intersectional combinations available yet.</p>
              )}
            </CardContent>
          </Card>

          {/* <Card className="fv-panel fv-accent-left-danger">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-4 h-4" /> Proxy Bias Correlation Network
              </CardTitle>
              <CardDescription>
                Sensitive and feature nodes are connected by correlation edges. Green edges indicate positive correlation, red edges indicate negative correlation, and thicker lines represent stronger relationships that may act as proxy signals.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border rounded-md p-2 overflow-auto">
                <svg viewBox="0 0 340 340" className="w-full h-[340px]">
                  {proxyEdges.map((edge, index) => {
                    const source = proxyNodePosition.get(edge.source);
                    const target = proxyNodePosition.get(edge.target);
                    if (!source || !target) return null;
                    return (
                      <line
                        key={`${edge.source}-${edge.target}-${index}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="currentColor"
                        className={edge.relationship === "positive" ? "text-success" : "text-destructive"}
                        strokeOpacity={Math.min(1, Math.max(0.2, edge.absolute_weight))}
                        strokeWidth={1 + edge.absolute_weight * 3}
                      />
                    );
                  })}
                  {proxyNodes.map((node) => {
                    const position = proxyNodePosition.get(node.id);
                    if (!position) return null;
                    return (
                      <g key={node.id}>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={10}
                          className={node.type === "sensitive" ? "text-info" : "text-muted-foreground"}
                          fill="currentColor"
                        />
                        <text x={position.x + 12} y={position.y + 4} fontSize="10" fill="currentColor" className="text-foreground">
                          {node.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-left">Target</th>
                      <th className="p-2 text-left">Correlation</th>
                      <th className="p-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proxyEdges.map((edge, index) => (
                      <tr key={`${edge.source}-${edge.target}-${index}`} className="border-t">
                        <td className="p-2">{edge.source}</td>
                        <td className="p-2">{edge.target}</td>
                        <td className="p-2">{edge.weight.toFixed(3)}</td>
                        <td className="p-2">{edge.relationship}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card> */}

          <Card className="fv-panel fv-accent-left-success">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Explainable Fairness Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.explanations.map((item, idx) => {
                  const isStructured = typeof item === "object" && item !== null;
                  const text = isStructured ? (item as ExplanationItem).text : (item as string);
                  const sev = isStructured ? (item as ExplanationItem).severity : "info";
                  const title = isStructured ? (item as ExplanationItem).title : null;
                  const recs = isStructured ? (item as ExplanationItem).recommendations : null;
                  const warning = isStructured ? (item as ExplanationItem).sample_warning : null;
                  const sevColor = sev === "critical" ? "text-destructive" : sev === "warning" ? "text-warning" : "text-success";
                  return (
                    <li key={idx} className="text-sm flex gap-2 flex-col border-b border-border/40 pb-2 last:border-none last:pb-0">
                      <div className="flex gap-2 items-start">
                        <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                        <div>
                          {title && <p className="font-semibold">{title}</p>}
                          <p className="text-muted-foreground">{text}</p>
                          {warning && <p className="text-xs text-warning mt-1">⚠ {warning}</p>}
                        </div>
                      </div>
                      {recs && recs.length > 0 && (
                        <ul className="ml-6 list-disc space-y-0.5">
                          {recs.map((r, ri) => <li key={ri} className="text-xs text-muted-foreground">{r}</li>)}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

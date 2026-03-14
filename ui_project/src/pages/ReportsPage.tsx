import { useEffect, useMemo, useState } from "react";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { auditIntelligenceApi, reportsApi } from "../lib/api";

type BasicAnalysis = {
  di?: number;
  dpd?: number;
  accuracy?: number;
  privileged_rate?: number;
  unprivileged_rate?: number;
  mitigation?: Record<string, unknown>;
};

type DashboardPayload = {
  filename?: string;
  configuration?: {
    target_column?: string;
    sensitive_attribute?: string;
    privileged_group?: string;
    unprivileged_group?: string;
  };
  mitigation?: Record<string, unknown>;
};

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

type AuditIntelligenceResult = {
  fairness?: {
    comparison_matrix?: FairnessRow[];
    global_fairness_score?: number;
  };
  intersectional?: {
    combinations?: Array<{ attributes: string[]; heatmap: HeatmapCell[] }>;
  };
  risk_scoring?: {
    compliance_score?: number;
    risk_level?: string;
  };
};

type ReportHistoryItem = {
  report_id: string;
  dataset_id: string;
  dataset_name: string;
  generated_at: string;
  risk_level: string;
  fairness_score: number;
  compliance_score: number;
};

const DISPARITY_DI_THRESHOLD = 0.8;
const DISPARITY_DPD_THRESHOLD = 0.1;
const SIGNIFICANT_CORRECTION_THRESHOLD = 0.2;

const safeNum = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value: unknown, decimals = 3) => safeNum(value).toFixed(decimals);
const formatRate = (value: unknown) => `${(safeNum(value) * 100).toFixed(1)}%`;

const getRiskToneClasses = (riskLevel: string) => {
  const value = (riskLevel || "").toLowerCase();
  if (value.includes("high")) {
    return {
      row: "border-danger/35 bg-danger/10",
      text: "fv-status-text-danger",
      badge: "bg-danger/15 text-danger border border-danger/35",
    };
  }
  if (value.includes("medium")) {
    return {
      row: "border-[rgb(var(--warning)/0.35)] bg-[rgb(var(--warning)/0.10)]",
      text: "fv-status-text-warning",
      badge: "fv-status-bg-warning border border-[rgb(var(--warning)/0.35)]",
    };
  }
  return {
    row: "border-success/35 bg-success/10",
    text: "fv-status-text-success",
    badge: "bg-success/15 text-success border border-success/35",
  };
};

const getScoreToneClass = (score: number) => {
  if (score >= 70) return "fv-status-text-success";
  if (score >= 60) return "fv-status-text-warning";
  return "fv-status-text-danger";
};

const getRiskMappedToneClass = (riskLevel: string) => {
  const risk = (riskLevel || "").toLowerCase();
  if (risk.includes("high")) return "fv-status-text-danger";
  if (risk.includes("medium")) return "fv-status-text-warning";
  return "fv-status-text-success";
};

const getScoreBadgeClasses = (score: number) => {
  if (score >= 70) return "bg-success/15 text-success border border-success/35";
  if (score >= 60) return "fv-status-bg-warning border border-[rgb(var(--warning)/0.35)]";
  return "bg-danger/15 text-danger border border-danger/35";
};

const getRiskMappedBadgeClasses = (riskLevel: string) => {
  const risk = (riskLevel || "").toLowerCase();
  if (risk.includes("high")) return "bg-danger/15 text-danger border border-danger/35";
  if (risk.includes("medium")) return "fv-status-bg-warning border border-[rgb(var(--warning)/0.35)]";
  return "bg-success/15 text-success border border-success/35";
};

const getUnitScoreToneClass = (value: number) => {
  if (value >= 0.7) return "fv-status-text-success";
  if (value >= 0.6) return "fv-status-text-warning";
  return "fv-status-text-danger";
};

const getSeverityToneClass = (value: number) => {
  if (value > 0.5) return "fv-status-text-danger";
  if (value > 0.3) return "fv-status-text-warning";
  return "fv-status-text-success";
};

const isBiasedReport = (riskLevel: string, complianceScore: number) => {
  const risk = (riskLevel || "").toLowerCase();
  return risk.includes("high") || risk.includes("medium") || complianceScore < 60;
};

const mapCorrectionScenarioName = (rawName: string | undefined) => {
  const value = (rawName || "").toLowerCase();
  if (value.includes("reweigh")) return "Representation balancing scenario";
  if (value.includes("sampling")) return "Coverage expansion scenario";
  return "Structural correction scenario";
};

export function ReportsPage() {
  const [analysis, setAnalysis] = useState<BasicAnalysis | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [auditIntelligence, setAuditIntelligence] = useState<AuditIntelligenceResult | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const analysisStored = localStorage.getItem("analysisResults") || sessionStorage.getItem("analysisResults");
      const dashboardStored = localStorage.getItem("dashboardData") || sessionStorage.getItem("dashboardData");

      if (analysisStored) setAnalysis(JSON.parse(analysisStored) as BasicAnalysis);
      if (dashboardStored) setDashboard(JSON.parse(dashboardStored) as DashboardPayload);
    } catch {
      toast.error("Failed to read stored analysis context.");
    }
  }, []);

  useEffect(() => {
    const datasetId = localStorage.getItem("activeDatasetId") || sessionStorage.getItem("activeDatasetId");
    if (!datasetId) return;

    const fetchAuditIntelligence = async () => {
      setLoadingAudit(true);
      try {
        const payload = await auditIntelligenceApi.getLatest(datasetId);
        setAuditIntelligence(payload as AuditIntelligenceResult);
      } catch {
        setAuditIntelligence(null);
      } finally {
        setLoadingAudit(false);
      }
    };

    void fetchAuditIntelligence();
  }, []);

  useEffect(() => {
    const fetchReportHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await reportsApi.getReportHistory();
        setHistory(response.reports || []);
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    void fetchReportHistory();
  }, []);

  const datasetName = dashboard?.filename || "Audit Session";
  const target = dashboard?.configuration?.target_column || "Organizational Outcome";
  const sensitive = dashboard?.configuration?.sensitive_attribute || "Demographic Attribute";
  const privileged = dashboard?.configuration?.privileged_group || "Privileged Group";
  const unprivileged = dashboard?.configuration?.unprivileged_group || "Underrepresented Group";

  const di = safeNum(analysis?.di);
  const dpd = safeNum(analysis?.dpd);
  const accuracy = safeNum(analysis?.accuracy);
  const privilegedRate = safeNum(analysis?.privileged_rate);
  const unprivilegedRate = safeNum(analysis?.unprivileged_rate);

  const correction = (analysis?.mitigation || dashboard?.mitigation || {}) as Record<string, unknown>;
  const correctedDpd = correction.projected_dpd ?? correction.mitigated_dpd;
  const correctedAcc = correction.projected_accuracy ?? correction.mitigated_accuracy;
  const hasCorrectionSimulation = correctedDpd !== undefined && correctedDpd !== null;
  const correctionScenarioName = mapCorrectionScenarioName(String(correction.technique || ""));

  const disparityExceeded = di < DISPARITY_DI_THRESHOLD || Math.abs(dpd) > DISPARITY_DPD_THRESHOLD;
  const correctionImprovementRatio = useMemo(() => {
    if (!hasCorrectionSimulation) return 0;
    const baseline = Math.abs(dpd);
    const projected = Math.abs(safeNum(correctedDpd));
    if (baseline <= 0) return 0;
    return (baseline - projected) / baseline;
  }, [dpd, correctedDpd, hasCorrectionSimulation]);

  const correctionSignificant =
    disparityExceeded &&
    hasCorrectionSimulation &&
    correctionImprovementRatio >= SIGNIFICANT_CORRECTION_THRESHOLD &&
    Math.abs(safeNum(correctedDpd)) < Math.abs(dpd);

  const advisoryRequired = disparityExceeded && hasCorrectionSimulation && !correctionSignificant;

  const matrix = auditIntelligence?.fairness?.comparison_matrix || [];
  const combinations = auditIntelligence?.intersectional?.combinations || [];
  const hasCombinedAttributeRisk = combinations.length > 0;
  const selectionGap = (privilegedRate - unprivilegedRate) * 100;

  const executiveSummary = disparityExceeded
    ? `This governance snapshot for ${target} indicates measurable disparity across ${sensitive}. ${privileged} selection is ${formatRate(privilegedRate)} versus ${unprivileged} at ${formatRate(unprivilegedRate)}, creating a gap of ${selectionGap.toFixed(1)} percentage points. Equity ratio is ${formatNumber(di, 2)}, below or near threshold risk bands, so policy review is recommended before scaled automated deployment.`
    : `This governance snapshot for ${target} indicates disparity is currently within operating thresholds across ${sensitive}. ${privileged} selection is ${formatRate(privilegedRate)} versus ${unprivileged} at ${formatRate(unprivilegedRate)}, with a gap of ${selectionGap.toFixed(1)} percentage points. Equity ratio is ${formatNumber(di, 2)}, and current controls can continue with periodic monitoring.`;

  const strategicAdvice = [
    {
      title: "Policy control",
      content: "Maintain subgroup-level monitoring and document any sustained changes in disparity metrics.",
    },
    {
      title: "Operational review",
      content: "Add human review for borderline adverse outcomes when disparity trends worsen.",
    },
    {
      title: "Governance cadence",
      content: "Re-run compliance assessment on each material data/model/process change.",
    },
  ];

  const glossary = [
    { term: "Equity ratio (DI)", def: "Selection-rate ratio between groups. Values below 0.80 usually indicate elevated disparity risk." },
    { term: "Demographic disparity (DPD)", def: "Difference in group selection rates. Values closer to 0 indicate more balanced outcomes." },
    { term: "Compliance score", def: "Aggregate governance score derived from fairness and stability indicators." },
    { term: "Structural correction", def: "Mitigation simulation used to estimate disparity reduction under adjusted decision policy." },
  ];

  const riskLevelText = (auditIntelligence?.risk_scoring?.risk_level || "Medium Risk").toUpperCase();
  const riskBannerMessage = disparityExceeded
    ? "Dataset shows measurable demographic disparity. Organizational review recommended before automated deployment."
    : "Current disparity is within threshold. Continue periodic organizational oversight before scaled automation.";

  const parseFilenameFromHeader = (headerValue?: string) => {
    if (!headerValue) return null;
    const match = headerValue.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const encoded = match?.[1];
    const plain = match?.[2];
    if (encoded) return decodeURIComponent(encoded);
    return plain || null;
  };

  const handleDownloadCompliancePdf = async () => {
    const datasetId = localStorage.getItem("activeDatasetId") || sessionStorage.getItem("activeDatasetId");
    const analysisId = localStorage.getItem("activeAnalysisId") || sessionStorage.getItem("activeAnalysisId") || "latest";

    if (!datasetId) {
      toast.error("No active dataset selected for backend report generation.");
      return;
    }

    try {
      const response = await reportsApi.generateComplianceReport({
        dataset_id: datasetId,
        analysis_id: analysisId,
      });

      const url = window.URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = parseFilenameFromHeader(response.filenameHeader) || `fairvision_compliance_report_${datasetId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Backend compliance report generation failed.");
    }
  };

  const handleDownloadFromHistory = async (reportId: string) => {
    setDownloadingReportId(reportId);
    try {
      const response = await reportsApi.downloadReportById(reportId);
      const url = window.URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = parseFilenameFromHeader(response.filenameHeader) || `fairvision_compliance_report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download selected historical report.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  if (!analysis) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Governance Report
            </CardTitle>
            <CardDescription>No analysis context is available yet. Run an audit first to generate the governance report.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Governance Report</h1>
          <p className="text-muted-foreground">Formal organizational documentation for structural disparity evaluation and compliance submission.</p>
        </div>
        <Button onClick={handleDownloadCompliancePdf} className="bg-[linear-gradient(120deg,rgb(var(--status-info)),rgb(var(--status-analytics)))] text-white">
          <Download className="w-4 h-4 mr-2" />
          Download Compliance Report (PDF)
        </Button>
      </div>

      <Card className={disparityExceeded ? "fv-panel border-warning/40 bg-warning/10" : "fv-panel border-success/40 bg-success/10"}>
        <CardHeader>
          <CardTitle className="text-base">ETHICAL RISK LEVEL: {riskLevelText}</CardTitle>
          <CardDescription className="text-foreground/80">{riskBannerMessage}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Previously generated compliance reports for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading report history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previously generated reports found.</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => {
                const riskTone = getRiskToneClasses(item.risk_level);
                const fairnessTone = getRiskMappedToneClass(item.risk_level);
                const complianceTone = getRiskMappedToneClass(item.risk_level);
                const complianceValue = safeNum(item.compliance_score);
                const filenameTone = isBiasedReport(item.risk_level, complianceValue)
                  ? "fv-status-text-danger"
                  : "fv-status-text-success";

                return (
                <div key={item.report_id} className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-md border p-3 ${riskTone.row}`}>
                  <div className="text-sm space-y-1">
                    <p className={`font-semibold ${filenameTone}`}>{item.dataset_name}</p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Generated:</span>{' '}
                      <span className="font-semibold fv-status-text-info">{new Date(item.generated_at).toLocaleString()}</span>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Risk:</span>{' '}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold mr-1.5 ${riskTone.badge}`}>
                        {item.risk_level}
                      </span>
                      {' '}• <span className="font-semibold text-foreground">Fairness:</span>
                      <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskMappedBadgeClasses(item.risk_level)}`}>
                        <span className={fairnessTone}>{formatNumber(item.fairness_score, 2)}</span>
                      </span>
                      {' '}• <span className="font-semibold text-foreground">Compliance:</span>
                      <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskMappedBadgeClasses(item.risk_level)}`}>
                        <span className={complianceTone}>{formatNumber(item.compliance_score, 2)}</span>
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadFromHistory(item.report_id)}
                    disabled={downloadingReportId === item.report_id}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingReportId === item.report_id ? "Downloading..." : "Download"}
                  </Button>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Cover Page</CardTitle>
          <CardDescription>
            <span className="font-semibold text-foreground">Dataset:</span>{" "}
            <span className="font-semibold fv-status-text-info">{datasetName}</span>{" "}
            • <span className="font-semibold text-foreground">Generated:</span>{" "}
            <span className="font-semibold fv-status-text-analytics">{new Date().toLocaleDateString()}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground/90 whitespace-pre-line leading-6">
          {executiveSummary.replace(/\*\*/g, "")}
        </CardContent>
      </Card>

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Organizational Context</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <span className="font-semibold text-foreground">Outcome process:</span>{" "}
            <span className="font-semibold fv-status-text-info">{target}</span>
          </p>
          <p>
            <span className="font-semibold text-foreground">Primary demographic attribute:</span>{" "}
            <span className="font-semibold fv-status-text-analytics">{sensitive}</span>
          </p>
          <p>
            <span className="font-semibold text-foreground">Groups assessed:</span>{" "}
            <span className="font-semibold fv-status-text-info">{privileged}</span>{" "}
            <span className="text-foreground">and</span>{" "}
            <span className="font-semibold fv-status-text-danger">{unprivileged}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="fv-panel">
          <CardHeader>
            <CardTitle>Representation Audit</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="font-semibold text-foreground">{privileged} selection rate:</span>{" "}
              <span className={`font-semibold ${getUnitScoreToneClass(privilegedRate)}`}>{formatRate(privilegedRate)}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">{unprivileged} selection rate:</span>{" "}
              <span className={`font-semibold ${getUnitScoreToneClass(unprivilegedRate)}`}>{formatRate(unprivilegedRate)}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Demographic disparity (DPD):</span>{" "}
              <span className={`font-semibold ${Math.abs(dpd) > DISPARITY_DPD_THRESHOLD ? "fv-status-text-danger" : "fv-status-text-success"}`}>
                {formatNumber(dpd, 3)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="fv-panel">
          <CardHeader>
            <CardTitle>Compliance Assessment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="font-semibold text-foreground">Equity ratio (DI):</span>{" "}
              <span className={`font-semibold ${di < DISPARITY_DI_THRESHOLD ? "fv-status-text-danger" : "fv-status-text-success"}`}>
                {formatNumber(di, 3)}
              </span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Risk level:</span>{" "}
              <span className={`font-semibold ${getRiskToneClasses(auditIntelligence?.risk_scoring?.risk_level || "").text}`}>
                {auditIntelligence?.risk_scoring?.risk_level || "Not available"}
              </span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Compliance score:</span>{" "}
              <span className={`font-semibold ${getScoreToneClass(safeNum(auditIntelligence?.risk_scoring?.compliance_score))}`}>
                {formatNumber(auditIntelligence?.risk_scoring?.compliance_score, 2)} / 100
              </span>
            </p>
            <p className={`font-semibold ${disparityExceeded ? "fv-status-text-danger" : "fv-status-text-success"}`}>
              {disparityExceeded ? "Disparity is above acceptable threshold." : "Disparity is within acceptable threshold."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Intersectional Risk Analysis</CardTitle>
          <CardDescription>{loadingAudit ? "Loading intelligence context..." : "Integrated individual and combined attribute review"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="mb-1 font-semibold fv-status-text-analytics">Individual Attribute Analysis</p>
            {matrix.length === 0 ? (
              <p className="text-muted-foreground">No attribute-level matrix is available for this session.</p>
            ) : (
              <div className="space-y-1">
                {matrix.slice(0, 8).map((row) => (
                  <p key={row.attribute}>
                    <span className="font-semibold text-foreground">{row.attribute}:</span>{" "}
                    parity gap <span className={`font-semibold ${Math.abs(safeNum(row.statistical_parity)) > DISPARITY_DPD_THRESHOLD ? "fv-status-text-danger" : "fv-status-text-success"}`}>{formatNumber(row.statistical_parity, 3)}</span>,{" "}
                    impact ratio <span className={`font-semibold ${safeNum(row.disparate_impact) < DISPARITY_DI_THRESHOLD ? "fv-status-text-danger" : "fv-status-text-success"}`}>{formatNumber(row.disparate_impact, 3)}</span>,{" "}
                    fairness score <span className={`font-semibold ${getUnitScoreToneClass(safeNum(row.fairness_score))}`}>{formatNumber(row.fairness_score, 2)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {hasCombinedAttributeRisk && (
            <div>
              <p className="mb-1 font-semibold fv-status-text-danger">Combined Attribute Risk</p>
              <div className="space-y-1">
                {combinations.slice(0, 4).map((combo, index) => {
                  const worstCell = combo.heatmap.reduce<HeatmapCell | null>((acc, item) => {
                    if (!acc || item.severity > acc.severity) return item;
                    return acc;
                  }, null);
                  if (!worstCell) return null;
                  return (
                    <p key={`${combo.attributes.join("-")}-${index}`}>
                      <span className="font-semibold text-foreground">{combo.attributes.join(" + ")}:</span>{" "}
                      highest risk at <span className="font-semibold fv-status-text-info">{worstCell.x} / {worstCell.y}</span>{" "}
                      (severity <span className={`font-semibold ${getSeverityToneClass(safeNum(worstCell.severity))}`}>{formatNumber(worstCell.severity, 2)}</span>)
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasCorrectionSimulation && (
        <Card className="fv-panel">
          <CardHeader>
            <CardTitle>Corrective Strategy Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="font-semibold text-foreground">Scenario assessed:</span>{" "}
              <span className="font-semibold fv-status-text-info">{correctionScenarioName}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Projected disparity after correction:</span>{" "}
              <span className={`font-semibold ${Math.abs(safeNum(correctedDpd)) > DISPARITY_DPD_THRESHOLD ? "fv-status-text-danger" : "fv-status-text-success"}`}>
                {formatNumber(correctedDpd, 3)}
              </span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Projected operational accuracy:</span>{" "}
              <span className={`font-semibold ${getUnitScoreToneClass(safeNum(correctedAcc))}`}>{formatRate(correctedAcc)}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Estimated disparity reduction:</span>{" "}
              <span className={`font-semibold ${correctionImprovementRatio >= SIGNIFICANT_CORRECTION_THRESHOLD ? "fv-status-text-success" : "fv-status-text-warning"}`}>
                {(correctionImprovementRatio * 100).toFixed(1)}%
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {(correctionSignificant || advisoryRequired) && (
        <Card className="fv-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Governance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-foreground/90">
            {correctionSignificant ? (
              <>
                {strategicAdvice.map((entry) => (
                  <p key={entry.title}>
                    <span className="font-semibold fv-status-text-info">{entry.title}:</span>{" "}
                    <span className="text-foreground">{entry.content.replace(/\*\*/g, "")}</span>
                  </p>
                ))}
                <p>
                  <span className="font-semibold fv-status-text-analytics">Governance cadence:</span>{" "}
                  <span className="text-foreground">Maintain quarterly subgroup-level monitoring and documented review of adverse outcomes.</span>
                </p>
              </>
            ) : (
              <p className="font-medium fv-status-text-warning">
                Structural correction simulation showed limited disparity reduction. Conduct a deeper structural review across policy criteria, process routing, and historical decision governance before compliance sign-off.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="fv-panel">
        <CardHeader>
          <CardTitle>Glossary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {glossary.map((item) => (
            <p key={item.term}>
              <span className="font-semibold fv-status-text-info">{item.term}:</span> {item.def}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
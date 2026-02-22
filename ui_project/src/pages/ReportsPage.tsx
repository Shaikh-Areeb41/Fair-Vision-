import { useState, useEffect, useRef } from "react";
import { 
  FileText, Download, Building, Bot, BrainCircuit, Sparkles, Scale, ArrowRight, ClipboardCheck, BookOpen
} from "lucide-react";
import { Button } from "../components/ui/button";
// NOTE: We do NOT use <Badge> inside the printable area to avoid the "oklch" error
import { BiasBarChart } from "../components/Charts/BiasBarChart";
import { generateExecutiveSummary, generateStrategicAdvice, generateMitigationReport, getGlossary } from "../lib/auditAgent";


// --- PDF LIBRARIES ---
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [mitigation, setMitigation] = useState<any>(null);
  const [reportText, setReportText] = useState("");
  const [mitigationNarrative, setMitigationNarrative] = useState("");
  const [mitigationStrategy, setMitigationStrategy] = useState<any>(null);
  const [mitigationName, setMitigationName] = useState("Mitigation");
  const [advice, setAdvice] = useState<any[]>([]);
  const [datasetName, setDatasetName] = useState("Audit Session");


  // Ref to capture the report area
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [groupNames, setGroupNames] = useState({ priv: "Privileged Group", unpriv: "Unprivileged Group" });

  // --- SAFE FORMATTING HELPERS ---
  const safeFixed = (val: any, decimals: number = 3) => {
    if (val === undefined || val === null) return "-";
    return Number(val).toFixed(decimals);
  };

  const safeRate = (val: any) => {
    if (val === undefined || val === null) return "0.0";
    return (Number(val) * 100).toFixed(1);
  };

  const renderMarkdownBold = (text: string) => {
    return text.split("\n").map((line, lineIdx, lines) => (
      <span key={`line-${lineIdx}`}>
        {line.split(/(\*\*.*?\*\*)/g).map((segment, segIdx) => {
          const boldMatch = segment.match(/^\*\*(.*?)\*\*$/);
          if (boldMatch) {
            return <strong key={`seg-${lineIdx}-${segIdx}`}>{boldMatch[1]}</strong>;
          }
          return <span key={`seg-${lineIdx}-${segIdx}`}>{segment}</span>;
        })}
        {lineIdx < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };

  useEffect(() => {
    try {
      const analysisStored = localStorage.getItem("analysisResults") || sessionStorage.getItem("analysisResults");
      const dashboardStored = localStorage.getItem("dashboardData") || sessionStorage.getItem("dashboardData");
      
      if (analysisStored) {
        const analysis = JSON.parse(analysisStored);
        const dashboard = dashboardStored ? JSON.parse(dashboardStored) : null;
        
        setData(analysis);
        if (dashboard?.filename) setDatasetName(dashboard.filename);

        const realPrivilegedName = dashboard?.configuration?.privileged_group || "Privileged Group";
        const realUnprivilegedName = dashboard?.configuration?.unprivileged_group || "Unprivileged Group";
        
        setGroupNames({ priv: realPrivilegedName, unpriv: realUnprivilegedName });

        const mitigationData = analysis.mitigation || (dashboard ? dashboard.mitigation : null);
        setMitigation(mitigationData);

        const context = {
          target: dashboard?.configuration?.target_column || "Target Variable",
          sensitive: dashboard?.configuration?.sensitive_attribute || "Sensitive Attribute",
          privileged: realPrivilegedName,
          unprivileged: realUnprivilegedName,
          metrics: {
            di: analysis.di,
            dpd: analysis.dpd,
            accuracy: analysis.accuracy,
            priv_rate: analysis.privileged_rate,
            unpriv_rate: analysis.unprivileged_rate,
          }
        };

        setReportText(generateExecutiveSummary(context));
        setAdvice(generateStrategicAdvice(context));

        if (mitigationData) {
          const mitDpd = mitigationData.projected_dpd ?? mitigationData.mitigated_dpd;
          const mitAcc = mitigationData.projected_accuracy ?? mitigationData.mitigated_accuracy;

          const mitContext = {
            technique: mitigationData.technique || "Reweighing",
            original_dpd: analysis.dpd,
            mitigated_dpd: mitDpd,
            original_acc: analysis.accuracy,
            mitigated_acc: mitAcc
          };
          
          const result = generateMitigationReport(mitContext);
          setMitigationNarrative(result.narrative);
          setMitigationStrategy(result.strategy);
          setMitigationName(result.businessTechnique);
        }
      }
    } catch (e) {
      console.error("Failed to load report data", e);
    }
  }, []);

  // --- PDF GENERATION LOGIC ---
  const handleDownload = async () => {
      window.print();
  };



  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <FileText className="w-10 h-10 text-zinc-400 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">No Report Available</h2>
        <Button onClick={() => window.location.href = '/dashboard'}>Return to Dashboard</Button>
      </div>
    );
  }

  const isCompliant = data.di >= 0.8;
  const glossary = getGlossary();

  return (
    <div className="min-h-screen bg-zinc-100 py-8 animate-in fade-in duration-500">
      
      {/* CONTROL BAR */}
      <div className="max-w-5xl mx-auto px-4 mb-6 flex justify-between items-center print:hidden">
        <div>
           <h2 className="text-lg font-bold text-zinc-900">Audit Report Preview</h2>
           <p className="text-sm text-zinc-500">Review document before exporting.</p>
        </div>
        <Button 
        onClick={handleDownload}
          className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Print / Save as PDF
        </Button> 
      </div>

      {/* DOCUMENT PAPER - Wrapped in ref for capture */}
        <div
          ref={reportRef}
          data-print-root
          className="mx-auto max-w-[21cm] bg-white text-zinc-900 shadow-xl p-12 min-h-[29.7cm] rounded-sm"
        >
        
        {/* REPORT HEADER */}
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Building className="w-6 h-6 text-zinc-900" />
               <span className="font-bold text-lg tracking-tight uppercase">FairVision Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Algorithmic Audit Certificate</h1>
            <p className="text-zinc-500 mt-2 font-mono text-xs">
              REF: {Math.floor(Math.random() * 100000)} | DATE: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
             {/* MANUAL BADGE (Safe for PDF) */}
             <span 
                className="inline-block text-xs font-bold px-3 py-1 mb-2 rounded text-white"
                style={{ backgroundColor: isCompliant ? '#059669' : '#e11d48' }} // Hardcoded Hex
             >
                {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
             </span>
             <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide">
               Subject: {datasetName.substring(0, 20)}{datasetName.length > 20 ? "..." : ""}
             </p>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 border-l-4 border-zinc-900 pl-3">
            <Bot className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              1. Executive Summary
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-2 prose prose-sm max-w-none text-zinc-800">
              <p className="leading-relaxed">{renderMarkdownBold(reportText)}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <h4 className="font-semibold mb-4 text-[10px] uppercase text-center text-zinc-500">Initial Disparity Detected</h4>
              <div>
                <BiasBarChart 
                   title="" 
                   data={[
                     { name: groupNames.priv, rate: safeRate(data.privileged_rate) },
                     { name: groupNames.unpriv, rate: safeRate(data.unprivileged_rate) }
                   ]} 
                   height={170}
                   clean
                   colors={["#2563eb", "#06b6d4"]} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. STRATEGIC ANALYSIS */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 border-l-4 border-purple-600 pl-3">
            <BrainCircuit className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              2. Strategic Recommendations
            </h3>
          </div>
          <div className="grid gap-4">
            {advice.map((item, i) => (
              <div key={i} className="border-l-2 border-zinc-200 pl-4 py-1">
                 <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-600" /> {item.title}
                 </h4>
                 <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. REMEDIATION IMPACT */}
        {mitigation ? (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-6 border-l-4 border-emerald-600 pl-3">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                3. Remediation Impact Analysis
              </h3>
            </div>

            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 mb-6" style={{ backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-2 mb-3">
                 <span className="text-xs border border-emerald-200 bg-emerald-100 text-emerald-800 px-2 py-1 rounded" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                   Technique Applied: {mitigationName}
                 </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 mb-6">
                {renderMarkdownBold(mitigationNarrative)}
              </p>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-200">
                 <div>
                    <h5 className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Fairness Gap (DPD)</h5>
                    <div className="flex items-end gap-2">
                       <span className="text-xl font-bold text-zinc-400 line-through decoration-red-500">{safeFixed(data.dpd)}</span>
                       <ArrowRight className="w-4 h-4 mb-1.5 text-zinc-400" />
                       <span className="text-2xl font-bold text-emerald-600" style={{ color: '#059669' }}>
                         {safeFixed(mitigation.projected_dpd ?? mitigation.mitigated_dpd)}
                       </span>
                    </div>
                 </div>
                 <div>
                    <h5 className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Model Accuracy</h5>
                    <div className="flex items-end gap-2">
                       <span className="text-xl font-bold text-zinc-400">{safeRate(data.accuracy)}%</span>
                       <ArrowRight className="w-4 h-4 mb-1.5 text-zinc-400" />
                       <span className="text-2xl font-bold text-blue-600" style={{ color: '#2563eb' }}>
                          {safeRate(mitigation.projected_accuracy ?? mitigation.mitigated_accuracy)}%
                       </span>
                    </div>
                 </div>
              </div>
            </div>

            {/* ACTION PLAN */}
            {mitigationStrategy && (
              <div className="border border-emerald-100 bg-emerald-50 p-5 rounded-lg mb-6" style={{ backgroundColor: '#ecfdf5' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                    <h4 className="font-bold text-sm text-emerald-900 uppercase tracking-tight">
                      {mitigationStrategy.title}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {mitigationStrategy.steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="text-emerald-900 text-xs leading-relaxed" 
                             dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    ))}
                  </div>
              </div>
            )}
            
            {/* GRAPHS ROW */}
            <div className="grid grid-cols-2 gap-6">
               <div className="border border-zinc-200 p-3 rounded-lg bg-white">
                  <h4 className="text-[10px] font-bold uppercase text-center mb-2 text-zinc-500">Original Distribution</h4>
                  <div className="bg-white">
                    <BiasBarChart 
                       title="" 
                       data={[
                         { name: groupNames.priv, rate: safeRate(data.privileged_rate) },
                         { name: groupNames.unpriv, rate: safeRate(data.unprivileged_rate) }
                       ]} 
                       height={100}
                        clean
                       colors={["#ef4444", "#fca5a5"]} 
                    />
                  </div>
               </div>
               <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-lg" style={{ backgroundColor: '#ecfdf5' }}>
                  <h4 className="text-[10px] font-bold uppercase text-center mb-2 text-emerald-700">Projected (Fair) Distribution</h4>
                  <div className="bg-transparent">
                    <BiasBarChart 
                       title="" 
                       data={[
                         { name: groupNames.priv, rate: safeRate(mitigation.privileged_rate) },
                         { name: groupNames.unpriv, rate: safeRate(mitigation.unprivileged_rate) }
                       ]} 
                       height={100}
                        clean
                       colors={["#059669", "#6ee7b7"]} 
                    />
                  </div>
               </div>
            </div>
          </section>
        ) : (
          <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-800 text-sm mb-10">
            <strong>Note:</strong> No mitigation simulation was run for this session.
          </div>
        )}

        {/* 4. GLOSSARY SECTION */}
        <section className="mb-10 border-t border-zinc-200 pt-8">
           <div className="flex items-center gap-2 mb-4">
             <BookOpen className="w-4 h-4 text-zinc-400" />
             <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Technical Glossary</h3>
           </div>
           <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {glossary.map((item, i) => (
                <div key={i}>
                   <span className="text-xs font-bold text-zinc-700 block">{item.term}</span>
                   <span className="text-[10px] text-zinc-500 leading-tight block">{item.def}</span>
                </div>
              ))}
           </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 pt-6 border-t border-zinc-200 flex justify-between items-center text-zinc-400 text-[10px] font-mono">
          <p>GENERATED BY FAIRVISION GOVERNANCE PLATFORM</p>
          <p>CONFIDENTIAL - INTERNAL USE ONLY</p>
        </footer>

      </div>
    </div>
  );
}
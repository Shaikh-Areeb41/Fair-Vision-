import { useState, useEffect } from "react";
import { 
  FileText, Download, Building, Bot, BrainCircuit, Sparkles, Scale, ArrowRight, ClipboardCheck, BookOpen
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { BiasBarChart } from "../components/Charts/BiasBarChart";
import { generateExecutiveSummary, generateStrategicAdvice, generateMitigationReport, getGlossary } from "../lib/auditAgent";

export function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [mitigation, setMitigation] = useState<any>(null);
  const [reportText, setReportText] = useState("");
  const [mitigationNarrative, setMitigationNarrative] = useState("");
  const [mitigationStrategy, setMitigationStrategy] = useState<any>(null);
  const [mitigationName, setMitigationName] = useState("Mitigation");
  const [advice, setAdvice] = useState<any[]>([]);
  const [datasetName, setDatasetName] = useState("Audit Session");
  
  // New State for Dynamic Group Names
  const [groupNames, setGroupNames] = useState({ priv: "Privileged Group", unpriv: "Unprivileged Group" });

  useEffect(() => {
    try {
      // 1. Load Data
      const analysisStored = localStorage.getItem("analysisResults") || sessionStorage.getItem("analysisResults");
      const dashboardStored = localStorage.getItem("dashboardData") || sessionStorage.getItem("dashboardData");
      
      if (analysisStored) {
        const analysis = JSON.parse(analysisStored);
        const dashboard = dashboardStored ? JSON.parse(dashboardStored) : null;
        
        setData(analysis);
        if (dashboard?.filename) setDatasetName(dashboard.filename);

        // 2. Extract Real Group Names from Configuration
        // If "unprivileged_group" wasn't explicitly set in your config, we default to "Unprivileged Group"
        const realPrivilegedName = dashboard?.configuration?.privileged_group || "Privileged Group";
        const realUnprivilegedName = dashboard?.configuration?.unprivileged_group || "Unprivileged Group";
        
        setGroupNames({ priv: realPrivilegedName, unpriv: realUnprivilegedName });

        const mitigationData = analysis.mitigation || (dashboard ? dashboard.mitigation : null);
        setMitigation(mitigationData);

        // 3. AI Context (Now using REAL names)
        const context = {
          target: dashboard?.configuration?.target_column || "Target Variable",
          sensitive: dashboard?.configuration?.sensitive_attribute || "Sensitive Attribute",
          privileged: realPrivilegedName,     // <--- DYNAMIC NAME
          unprivileged: realUnprivilegedName, // <--- DYNAMIC NAME
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
          const mitContext = {
            technique: mitigationData.technique || "Reweighing",
            original_dpd: analysis.dpd,
            mitigated_dpd: mitigationData.mitigated_dpd,
            original_acc: analysis.accuracy,
            mitigated_acc: mitigationData.mitigated_accuracy
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

  const handleDownload = () => window.print();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-50 text-center px-4">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-zinc-200">
          <FileText className="w-10 h-10 text-zinc-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">No Report Available</h2>
        <p className="text-zinc-500 mb-6">Complete an audit to generate the compliance certificate.</p>
        <Button onClick={() => window.location.href = '/dashboard'}>Return to Dashboard</Button>
      </div>
    );
  }

  const isCompliant = data.di >= 0.8;
  const glossary = getGlossary();

  return (
    <div className="min-h-screen bg-zinc-100/50 dark:bg-zinc-950 py-8 animate-in fade-in duration-500">
      
      {/* CONTROL BAR */}
      <div className="max-w-5xl mx-auto px-4 mb-6 flex justify-between items-center print:hidden">
        <div>
           <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Audit Report Preview</h2>
           <p className="text-sm text-zinc-500">Review document before exporting.</p>
        </div>
        <Button onClick={handleDownload} className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg">
           <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </div>

      {/* DOCUMENT PAPER */}
      <div className="mx-auto max-w-[21cm] bg-white text-zinc-900 shadow-xl print:shadow-none print:max-w-none print:m-0 p-12 min-h-[29.7cm] rounded-sm">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Building className="w-6 h-6" />
               <span className="font-bold text-lg tracking-tight uppercase">FairVision Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Algorithmic Audit Certificate</h1>
            <p className="text-zinc-500 mt-2 font-mono text-xs">
              REF: {Math.floor(Math.random() * 100000)} | DATE: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
             <Badge className={`text-sm px-3 py-1 mb-2 ${isCompliant ? "bg-emerald-600" : "bg-rose-600"}`}>
              {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
             </Badge>
             <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide">
               Subject: {datasetName.substring(0, 20)}{datasetName.length > 20 ? "..." : ""}
             </p>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <section className="mb-10 break-inside-avoid">
          <div className="flex items-center gap-2 mb-4 border-l-4 border-zinc-900 pl-3">
            <Bot className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              1. Executive Summary
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-2 prose prose-zinc prose-sm max-w-none">
              <p className="leading-relaxed whitespace-pre-line text-zinc-800">{reportText}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
              <h4 className="font-semibold mb-4 text-[10px] uppercase text-center text-zinc-500">Initial Disparity Detected</h4>
              <div className="bg-white">
                {/* GRAPH NOW USES DYNAMIC GROUP NAMES */}
                <BiasBarChart 
                   title="" 
                   data={[
                     { name: groupNames.priv, rate: (data.privileged_rate * 100).toFixed(1) },
                     { name: groupNames.unpriv, rate: (data.unprivileged_rate * 100).toFixed(1) }
                   ]} 
                   height={120}
                   colors={["#18181b", "#a1a1aa"]} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. STRATEGIC ANALYSIS */}
        <section className="mb-10 break-inside-avoid">
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
          <section className="mb-8 break-inside-avoid">
            <div className="flex items-center gap-2 mb-6 border-l-4 border-emerald-600 pl-3">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                3. Remediation Impact Analysis
              </h3>
            </div>

            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                 <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    Technique Applied: {mitigationName}
                 </Badge>
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 mb-6">
                {mitigationNarrative}
              </p>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-200">
                 <div>
                    <h5 className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Fairness Gap (DPD)</h5>
                    <div className="flex items-end gap-2">
                       <span className="text-xl font-bold text-zinc-400 line-through decoration-red-500">{data.dpd.toFixed(3)}</span>
                       <ArrowRight className="w-4 h-4 mb-1.5 text-zinc-400" />
                       <span className="text-2xl font-bold text-emerald-600">{mitigation.mitigated_dpd.toFixed(3)}</span>
                    </div>
                 </div>
                 <div>
                    <h5 className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Model Accuracy</h5>
                    <div className="flex items-end gap-2">
                       <span className="text-xl font-bold text-zinc-400">{(data.accuracy * 100).toFixed(1)}%</span>
                       <ArrowRight className="w-4 h-4 mb-1.5 text-zinc-400" />
                       <span className="text-2xl font-bold text-blue-600">{(mitigation.mitigated_accuracy * 100).toFixed(1)}%</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* ACTION PLAN */}
            {mitigationStrategy && (
              <div className="border border-emerald-100 bg-emerald-50/50 p-5 rounded-lg mb-6 break-inside-avoid">
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
            
            {/* GRAPHS ROW (Dynamic Names) */}
            <div className="grid grid-cols-2 gap-6 break-inside-avoid">
               <div className="border border-zinc-200 p-3 rounded-lg bg-white">
                  <h4 className="text-[10px] font-bold uppercase text-center mb-2 text-zinc-500">Original Distribution</h4>
                  <div className="bg-white">
                    <BiasBarChart 
                       title="" 
                       data={[
                         { name: groupNames.priv, rate: (data.privileged_rate * 100).toFixed(1) },
                         { name: groupNames.unpriv, rate: (data.unprivileged_rate * 100).toFixed(1) }
                       ]} 
                       height={100}
                       colors={["#ef4444", "#fca5a5"]} 
                    />
                  </div>
               </div>
               <div className="border border-emerald-200 bg-emerald-50/30 p-3 rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-center mb-2 text-emerald-700">Projected (Fair) Distribution</h4>
                  <div className="bg-transparent">
                    <BiasBarChart 
                       title="" 
                       data={[
                         { name: groupNames.priv, rate: (mitigation.privileged_rate * 100).toFixed(1) },
                         { name: groupNames.unpriv, rate: (mitigation.unprivileged_rate * 100).toFixed(1) }
                       ]} 
                       height={100}
                       colors={["#059669", "#6ee7b7"]} 
                    />
                  </div>
               </div>
            </div>
          </section>
        ) : (
          <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-800 text-sm mb-10">
            <strong>Note:</strong> No mitigation simulation was run for this session. To generate remediation strategies, please run the "Fairness Simulator" on the dashboard.
          </div>
        )}

        {/* 4. GLOSSARY SECTION */}
        <section className="mb-10 break-inside-avoid border-t border-zinc-200 pt-8">
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
        <footer className="mt-8 pt-6 border-t border-zinc-200 flex justify-between items-center text-zinc-400 text-[10px] font-mono break-inside-avoid">
          <p>GENERATED BY FAIRVISION GOVERNANCE PLATFORM</p>
          <p>CONFIDENTIAL - INTERNAL USE ONLY</p>
        </footer>

      </div>
    </div>
  );
}
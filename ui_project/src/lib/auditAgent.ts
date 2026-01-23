// src/lib/auditAgent.ts

interface AnalysisContext {
  target: string;
  sensitive: string;
  privileged: string;
  unprivileged: string;
  metrics: {
    di: number;
    dpd: number;
    accuracy: number;
    priv_rate: number;
    unpriv_rate: number;
  };
}

// --- 1. BUSINESS VOCABULARY BANK ---
// Maps technical ML terms to Stakeholder-friendly terms
const VOCAB = {
  Hiring: {
    action: "Selection",
    entity: "Candidates",
    outcome: "selected for interview",
    risk: "potential barriers in the recruitment funnel",
    regs: "Equal Employment Opportunity (EEO) Standards",
    fix: "Review job descriptions for inclusive language and implement 'blind' resume screening."
  },
  Lending: {
    action: "Approval",
    entity: "Applicants",
    outcome: "approved for credit",
    risk: "potential unequal access to financial services",
    regs: "Fair Lending Guidelines",
    fix: "Audit credit scoring criteria for historical proxy variables."
  },
  General: {
    action: "Selection",
    entity: "Individuals",
    outcome: "selected",
    risk: "demographic imbalance in outcomes",
    regs: "Ethical AI Governance Frameworks",
    fix: "Ensure the training data accurately reflects the diversity of the real-world population."
  }
};

const detectDomain = (target: string): "Hiring" | "Lending" | "General" => {
  const t = target.toLowerCase();
  if (t.includes("hire") || t.includes("employ") || t.includes("recruit") || t.includes("promote")) return "Hiring";
  if (t.includes("credit") || t.includes("loan") || t.includes("risk") || t.includes("bank")) return "Lending";
  return "General";
};

// --- 2. EXECUTIVE SUMMARY (Business Focused) ---
export const generateExecutiveSummary = (ctx: AnalysisContext) => {
  const domain = detectDomain(ctx.target);
  const terms = VOCAB[domain];
  const gap = (ctx.metrics.priv_rate - ctx.metrics.unpriv_rate) * 100;
  const isCompliant = ctx.metrics.di >= 0.8;

  let text = `This audit evaluated the **${domain}** process for fairness regarding **${ctx.sensitive}**. `;
  
  text += `The data shows that **${ctx.privileged}** ${terms.entity.toLowerCase()} are currently being ${terms.outcome} at a rate of ${(ctx.metrics.priv_rate * 100).toFixed(1)}%. `;
  text += `In contrast, **${ctx.unprivileged}** ${terms.entity.toLowerCase()} are selected at a rate of ${(ctx.metrics.unpriv_rate * 100).toFixed(1)}%. `;

  text += `\n\nThis creates a **Fairness Gap of ${gap.toFixed(1)}%**. `;
  
  if (!isCompliant) {
    text += `Currently, the **Equity Ratio** (Disparate Impact) is **${ctx.metrics.di.toFixed(2)}**. This is below the 0.80 benchmark often used in ${terms.regs}, indicating a risk of **${terms.risk}**. `;
    text += `The system may be unintentionally favoring the privileged group due to historical patterns in the data.`;
  } else {
    text += `The **Equity Ratio** is **${ctx.metrics.di.toFixed(2)}**, which meets the standard benchmark (0.80) for ${terms.regs}. `;
    text += `The process currently demonstrates equitable treatment across these groups.`;
  }

  return text;
};

// --- 3. STRATEGIC RECOMMENDATIONS (Actionable) ---
export const generateStrategicAdvice = (ctx: AnalysisContext) => {
  const domain = detectDomain(ctx.target);
  const terms = VOCAB[domain];
  const isCompliant = ctx.metrics.di >= 0.8;
  
  if (isCompliant) {
    return [
      {
        title: "Verification of Fairness",
        content: `Current procedures are producing equitable outcomes. The Equity Ratio (${ctx.metrics.di.toFixed(2)}) confirms that ${terms.entity.toLowerCase()} from both groups have comparable success rates.`
      },
      {
        title: "Sustainability Plan",
        content: `Monitor this metric quarterly. If the applicant pool demographics shift (e.g., more applicants from the unprivileged group), re-run this audit to ensure the system scales fairly.`
      }
    ];
  } else {
    return [
      {
        title: "Identify Root Causes",
        content: `The disparity suggests 'historical drift.' The model is likely learning from past decisions where ${ctx.privileged} individuals were favored. ${terms.fix}`
      },
      {
        title: "Process Intervention",
        content: `We recommend a 'Human-in-the-Loop' review. Flag any rejection of a qualified ${ctx.unprivileged} candidate that falls within a 10% margin of the acceptance threshold for manual review.`
      },
      {
        title: "Governance Status: ACTION REQUIRED",
        content: `Current metrics suggest the process is not yet aligned with ${terms.regs}. We strongly recommend applying the 'Balanced Representation Strategy' (Mitigation) outlined below before full deployment.`
      }
    ];
  }
};

// --- 4. MITIGATION REPORT (From Math to Strategy) ---
interface MitigationContext {
  technique: string;
  original_dpd: number;
  mitigated_dpd: number;
  original_acc: number;
  mitigated_acc: number;
}

export const generateMitigationReport = (ctx: MitigationContext) => {
  const improvement = ((ctx.original_dpd - ctx.mitigated_dpd) / ctx.original_dpd) * 100;
  const accDrop = (ctx.original_acc - ctx.mitigated_acc) * 100;
  
  // Translate Technique Names
  let businessTechnique = ctx.technique;
  let strategyDesc = "";
  
  if (ctx.technique === "Reweighing") {
    businessTechnique = "Balanced Representation Strategy";
    strategyDesc = "adjusting the influence of historical records to ensure all groups have equal voice in the learning process.";
  } else if (ctx.technique.includes("Sampling")) {
    businessTechnique = "Targeted Recruitment Simulation";
    strategyDesc = "simulating a scenario where we actively recruit more examples of successful candidates from the underrepresented group.";
  } else {
    businessTechnique = "Fairness Calibration";
    strategyDesc = "mathematically adjusting the decision boundary to prioritize equity.";
  }

  // Narrative
  let narrative = `To address the identified gap, we simulated a **${businessTechnique}**. `;
  narrative += `This involves ${strategyDesc} `;
  
  if (improvement > 0) {
    narrative += `\n\n**Projected Outcome:** This strategy reduces the Fairness Gap by **${improvement.toFixed(1)}%**. `;
    narrative += `It effectively levels the playing field, bringing the Demographic Disparity down to **${ctx.mitigated_dpd.toFixed(3)}**. `;
  } else {
    narrative += `\n\nThe strategy showed minimal impact. We recommend reviewing the data quality directly. `;
  }

  if (accDrop < 2) {
    narrative += `Crucially, this fairness is achieved with **negligible impact on business performance** (accuracy remains stable).`;
  } else {
    narrative += `Note: This adjustment requires a trade-off. We accept a slight dip in overall predictive accuracy (${accDrop.toFixed(1)}%) to ensure regulatory compliance.`;
  }

  // Strategic Action Plan
  let strategy = {
    title: "Recommended Implementation",
    steps: [] as string[]
  };

  if (ctx.technique === "Reweighing") {
    strategy.title = "Action Plan: Balanced Representation";
    strategy.steps = [
      "**Policy Update:** Mandate that future training datasets must use 'Stratified Sampling' to ensure the unprivileged group constitutes at least 40% of the data pool.",
      "**Process Change:** Apply a 'Fairness Weight' in the automated decision engine. This ensures that an error made on a minority candidate is treated as more critical than a standard error.",
      "**Human Oversight:** Conduct a monthly audit of 'False Negatives' (qualified candidates who were rejected) to ensure the model isn't learning new bias."
    ];
  } else {
    strategy.title = "Action Plan: Active Correction";
    strategy.steps = [
      "**Data Collection:** Launch a targeted campaign to collect more data points from the unprivileged group.",
      "**Thresholding:** Consider setting a specific acceptance threshold for the unprivileged group that accounts for historical disadvantage."
    ];
  }

  return { narrative, strategy, businessTechnique };
};

// --- 5. GLOSSARY (New!) ---
export const getGlossary = () => [
  { term: "Equity Ratio (DI)", def: "A measure of fairness. If Group A is approved 50% of the time and Group B 40%, the ratio is 0.8. A score below 0.8 usually signals non-compliance." },
  { term: "Demographic Disparity (DPD)", def: "The simple difference in selection rates. If 30% of men are hired and 20% of women, the Disparity is 0.10 (or 10%). We want this near 0." },
  { term: "Privileged Group", def: "The demographic group that has historically seen higher approval or selection rates in the data." },
  { term: "Balanced Representation", def: "A technique (formerly Reweighing) that tells the AI to treat examples from minority groups as 'more important' to learn from, correcting historical imbalance." }
];
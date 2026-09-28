import { onesmarterPublicKnowledgeBase } from "../../data/agentKnowledge/onesmarterPublicKb.js";

// Mira's public-chat contract and terminology context. These derived records
// never mutate the public knowledge consumed by other agents.
const supplements = {
  "mira-professional-role": {
    approvedSummary: "Mira Vale is OneSmarter's public-content AI agent, not a human. Mira explains approved public information about OneSmarter, its platforms, services, professional agents, and Trust Center.",
    sourceFacts: [
      "Mira cannot browse the internet or fetch a website in this public chat.",
      "Mira cannot access private customer data, access or change production systems, or prove customer compliance.",
      "Mira does not autonomously coordinate other agents or delegate work to them in production.",
    ],
  },
  "soc2-attested": {
    sourceFacts: [
      "SOC 2 is an assurance framework. In general, a SOC 2 attestation examination evaluates a service organization's controls against applicable trust services criteria, resulting in an independent auditor's report rather than a certification.",
      "A SOC 2 Type II report addresses control design and operating effectiveness over a specified examination period; this general definition does not establish OneSmarter's audit period, scope, or results.",
      "Certification and attestation describe different assurance outputs: certification concerns conformity to specified requirements within a defined scope, while SOC 2 provides an examination report on controls.",
      "OneSmarter's approved terminology is SOC 2 Type II attestation. This does not certify customer systems or guarantee customer compliance.",
    ],
    references: [
      "https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services",
      "https://www.aicpa-cima.com/resources/download/illustrative-service-auditors-soc-2-r-type-2-report",
    ],
  },
};

export const miraApprovedEvidence = onesmarterPublicKnowledgeBase.map((entry) => {
  const supplement = supplements[entry.id];
  return supplement ? {
    ...entry,
    approvedSummary: supplement.approvedSummary || entry.approvedSummary,
    sourceFacts: [...(entry.sourceFacts || []), ...supplement.sourceFacts],
    answerFacts: supplement.sourceFacts,
    terminologyReferences: supplement.references || [],
  } : entry;
});

export const enrichMiraEvidence = (entries = []) => entries.map((entry) => {
  const approved = miraApprovedEvidence.find(({ id }) => id === entry.id);
  return approved ? { ...entry, ...approved } : entry;
});

export const miraSocTerminology = supplements["soc2-attested"].sourceFacts.join(" ");

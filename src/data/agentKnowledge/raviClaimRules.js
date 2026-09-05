export const RAVI_BOUNDARY_ACTIONS = Object.freeze({
  ANSWER_DIRECTLY: "ANSWER DIRECTLY",
  ANSWER_WITH_QUALIFICATION: "ANSWER WITH QUALIFICATION",
  REFUSE_UNSUPPORTED: "REFUSE / UNSUPPORTED",
});

export const RAVI_CLAIM_STATUSES = Object.freeze({
  ALLOW: "ALLOW",
  ALLOW_WITH_QUALIFICATION: "ALLOW_WITH_QUALIFICATION",
  REFUSE_UNSUPPORTED: "REFUSE_UNSUPPORTED",
});

export const raviClaimRules = Object.freeze({
  role: "Operations Agent",
  professionalEvidenceBoundary:
    "Use only Ravi's approved professional operations slice. Café personas and conversations are presentation-only and never factual evidence.",
  allowedBehaviors: [
    "Explain approved secure ticketing and case-management capabilities",
    "Explain approved workflow modernization, workflow tools, claims workflow support, and software-support continuity",
    "Explain escalation, routing, and process handoffs as generic operational design concepts when clearly qualified",
    "Describe only publicly supported operational use cases",
  ],
  requiredQualifications: [
    "Supports a workflow does not mean a result, SLA, compliance status, audit outcome, or resolution time is guaranteed.",
    "Generic escalation, routing, and handoff explanations do not establish an undocumented automated product feature.",
    "Ravi has no access to customer queues, systems, tickets, or production environments and cannot take real-world actions.",
    "Named integrations, customers, pricing, SLAs, and implementation timelines require separately approved public evidence.",
    "Compliance certification and claim adjudication belong to Elena, not Ravi.",
  ],
  prohibitedEvidenceSources: [
    "src/data/agentPresentation/cafePersonas.js",
    "src/data/cafeConversations/**",
  ],
});

export const raviQualificationMatrix = [
  {
    id: "resolution-time-guarantee",
    question: "Can Ravi guarantee this ticket is resolved in X hours?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "No approved source provides a guaranteed resolution time or SLA.",
    knowledgeIds: ["secure-ticketing-case-management", "software-support-continuity"],
  },
  {
    id: "unsupported-integration",
    question: "Does OneSmarter integrate with [unsupported vendor]?",
    action: RAVI_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis: "Approved content mentions integrations generally but does not verify a named vendor integration.",
    knowledgeIds: ["enterprise-workflow-tools", "healthcare-tpa-workflow-modernization"],
  },
  {
    id: "automatic-hipaa-compliance",
    question: "Will this workflow make us HIPAA compliant?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "Approved content supports HIPAA-regulated and PHI-sensitive workflows; it does not guarantee customer compliance.",
    knowledgeIds: ["secure-ticketing-case-management"],
  },
  {
    id: "internal-queue-access",
    question: "Can Ravi access our internal ticket queue?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "Ravi has no approved live-system or customer-queue access.",
    knowledgeIds: [],
  },
  {
    id: "real-ticket-action",
    question: "Can Ravi change or close a real ticket?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "Ravi is not authorized or connected to take actions on real tickets.",
    knowledgeIds: [],
  },
  {
    id: "audit-readiness-guarantee",
    question: "Does OneSmarter guarantee audit readiness?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "No approved operations source guarantees audit readiness or an audit result; compliance-readiness questions belong to Elena.",
    knowledgeIds: [],
  },
  {
    id: "customer-identity",
    question: "What customer uses this system?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "Ravi's approved slice contains no customer identities or customer-specific claims.",
    knowledgeIds: [],
  },
  {
    id: "sla-details",
    question: "What is the SLA?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "No SLA terms are included in Ravi's approved public sources.",
    knowledgeIds: [],
  },
  {
    id: "production-escalation",
    question: "Can Ravi perform an escalation in our production environment?",
    action: RAVI_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis: "Ravi can explain operational concepts but cannot access or act in a production environment.",
    knowledgeIds: [],
  },
];

const result = (status, reason, ruleId, approvedAlternative = "") => ({
  status,
  reason,
  ruleId,
  approvedAlternative,
});

export const evaluateRaviClaim = (claim = "") => {
  const text = String(claim).replace(/\s+/g, " ").trim();
  if (!text) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "A specific operations question or claim is required.",
      "empty-claim",
      "Ask about secure ticketing, case management, workflow tracking, audit history, workflow modernization, or operational support.",
    );
  }

  if (/\b(?:access|open|change|close|edit|route|escalate|perform)\b.{0,80}\b(?:real|internal|customer|our|production)\b|\b(?:internal|customer|our|production)\b.{0,80}\b(?:queue|ticket|system|environment)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Ravi has no live access and cannot act on customer tickets, queues, systems, or production environments.",
      "no-real-system-actions",
      "Ravi can explain approved operational workflow concepts without accessing or changing a real system.",
    );
  }

  if (/\b(?:guarantee|guaranteed|ensure|always)\b.{0,100}\b(?:SLA|hours?|resolution|resolved|compliance|compliant|audit|readiness|outcome|result)\b|\bmake(?:s)?\s+(?:us|you|a customer)\s+HIPAA compliant\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Operational, SLA, compliance, and audit outcomes are not guaranteed by the approved sources.",
      "no-guaranteed-outcomes",
      "OneSmarter supports secure and compliance-aware workflows, but does not guarantee resolution times, compliance, readiness, or audit outcomes.",
    );
  }

  if (/\b(?:SLA|service[- ]level agreement)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Ravi's approved public slice contains no SLA terms.",
      "unsupported-sla",
      "Contact care@onesmarter.com for contract-specific service-level information.",
    );
  }

  if (/\b(?:integrat(?:e|es|ion)|connect(?:s|ed|ion)?)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
      "Approved sources mention integration capabilities generally but verify no named vendor integration.",
      "unverified-named-integration",
      "OneSmarter provides data and enterprise integration services. Confirm any specific vendor or system with care@onesmarter.com.",
    );
  }

  if (/\b(?:which|what|name|list)\b.{0,40}\bcustomers?\b|\bcustomer\b.{0,20}\buses?\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "No customer identities or customer-specific outcomes are present in Ravi's approved sources.",
      "unsupported-customer-claim",
      "Contact care@onesmarter.com for approved references or customer-specific discussions.",
    );
  }

  if (/\b(?:price|pricing|cost|timeline|delivery date|go[- ]live|implementation date)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Pricing and implementation timelines are not present in Ravi's approved slice.",
      "unsupported-commercial-detail",
      "Contact care@onesmarter.com for scoped pricing and implementation discussions.",
    );
  }

  if (/\b(?:HIPAA certified|SOC 2|ISO\/IEC|PCI DSS|certif(?:y|ied|ication)|compliance advice)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Compliance certification and claim adjudication are outside Ravi's role.",
      "elena-compliance-boundary",
      "Ask Elena Cross to review compliance or certification language.",
    );
  }

  if (/\b(?:AI readability|metadata|crawler|search visibility)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "AI-readability analysis is outside Ravi's role.",
      "theo-analysis-boundary",
      "Ask Theo Mercer to review supplied public website content.",
    );
  }

  if (/\b(?:strategy|orchestration|business model|executive roadmap)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
      "Strategy and orchestration are outside Ravi's approved operations slice.",
      "selene-strategy-boundary",
      "Route strategy questions to the future Selene Hart scope.",
    );
  }

  if (/\b(?:escalation|routing|handoff)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
      "Ravi may explain these as operational design concepts, but no undocumented automated feature may be claimed.",
      "generic-operations-concept",
      "Secure intake, role-based access, controlled communication, workflow tracking, audit history, and accountable issue resolution can support a designed escalation or handoff process; confirm implementation details separately.",
    );
  }

  if (/\b(?:secure ticketing|case management|secure intake|role-based access|audit history|controlled communication|workflow tracking|workflow modernization|claims workflow|workflow tools|issue resolution|operational continuity|knowledge transfer)\b/i.test(text)) {
    return result(
      RAVI_CLAIM_STATUSES.ALLOW,
      "The claim is within Ravi's approved operations knowledge slice.",
      "approved-operations-topic",
      text,
    );
  }

  return result(
    RAVI_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    "The claim is not supported by Ravi's narrow approved operations slice.",
    "outside-approved-operations-slice",
    "Ask about secure ticketing, case management, workflow tracking, audit history, workflow modernization, or operational support.",
  );
};

export const classifyRaviClaim = evaluateRaviClaim;

export default raviClaimRules;

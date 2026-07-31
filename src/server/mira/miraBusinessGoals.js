const GOAL_DEFINITIONS = [
  {
    id: "case_workflow_control",
    label: "better case visibility, ownership, and workflow control",
    offeringIds: ["secure-ticketing-case-management"],
    signal:
      "we need case tracking assignment tracking audit history role-based access",
    patterns: [
      /\b(?:los(?:e|ing)|lost) track of cases?\b/i,
      /\bcases? (?:keep )?fall(?:ing)? through the cracks\b/i,
      /\b(?:cannot|can't|cant) see who owns (?:each )?cases?\b/i,
      /\bcase (?:tracking|ownership|assignment) (?:is |feels )?(?:messy|unclear|disorganized|difficult)\b/i,
      /\bstruggl(?:e|ing) to track (?:healthcare )?cases?\b/i,
      /\b(?:need|want) better case (?:tracking|visibility|ownership|control)\b/i,
    ],
  },
  {
    id: "secure_access_and_auditability",
    label: "secure access and stronger auditability",
    offeringIds: ["secure-ticketing-case-management"],
    signal: "we need role-based access audit history secure communication",
    patterns: [
      /\b(?:need|improve|better) (?:role[- ]based )?access (?:control|controls)?\b/i,
      /\b(?:audit trail|audit history|accountability) (?:is |feels )?(?:missing|weak|unclear)\b/i,
      /\bwho (?:accessed|changed|handled) (?:each )?(?:case|record)\b/i,
    ],
  },
  {
    id: "vendor_expense_control",
    label: "better vendor-bill review and discrepancy control",
    offeringIds: ["bill-audit-bill-pay"],
    signal: "we need vendor bill review discrepancy tracking recurring expense analysis",
    patterns: [
      /\b(?:problems?|errors?|issues?|discrepancies) (?:in|with) vendor (?:bills?|invoices?)\b/i,
      /\b(?:missing|miss|overlook(?:ing)?) (?:billing |invoice )?discrepancies\b/i,
      /\b(?:missing|miss|overlook(?:ing)?) vendor discrepancies\b/i,
      /\bvendor (?:bills?|invoices?) (?:are |feel )?(?:hard|difficult) to (?:review|control|track)\b/i,
    ],
  },
  {
    id: "approval_workflow_improvement",
    label: "more controlled approval and payment workflows",
    offeringIds: ["bill-audit-bill-pay"],
    signal: "we need vendor bills approval workflow payment workflow",
    patterns: [
      /\b(?:invoice|bill|vendor) approvals? (?:are |feel )?(?:slow|manual|unclear|difficult|messy)\b/i,
      /\bbetter vendor (?:bill|invoice) approvals?\b/i,
      /\bimprov(?:e|ing) (?:invoice|bill|payment) approvals?\b/i,
    ],
  },
  {
    id: "telecom_cost_control",
    label: "better telecom expense visibility and cost control",
    offeringIds: ["bill-audit-bill-pay"],
    signal:
      "we need telecom bills contract and rate comparison usage analysis telecom cost control",
    patterns: [
      /\b(?:reduce|lower|control|understand) telecom (?:costs?|expenses?|spend)\b/i,
      /\btelecom (?:bills?|rates?|contracts?) (?:are |feel )?(?:too high|unclear|hard to review)\b/i,
    ],
  },
  {
    id: "claims_operations_improvement",
    label: "better claims workflow operations and visibility",
    offeringIds: ["claims-processing-services"],
    signal: "we need claims processing claims-related operational tasks support",
    patterns: [
      /\bclaims? (?:workflows?|operations?|processing) (?:are |feel )?(?:slow|manual|fragmented|difficult|inefficient)\b/i,
      /\bimprov(?:e|ing) claims? (?:processing|operations?|visibility)\b/i,
      /\bstruggl(?:e|ing) with claims? (?:processing|operations?)\b/i,
    ],
  },
  {
    id: "workflow_automation",
    label: "less repetitive manual work through controlled automation",
    offeringIds: ["ai-agentic-services"],
    signal: "we need AI workflow automation repetitive workflows document automation",
    patterns: [
      /\b(?:hours?|too much time) (?:spent |spend |processing )?(?:on )?(?:repeating|manual|document[- ]heavy|paperwork)\b/i,
      /\b(?:manual document processing|too much paperwork|document[- ]heavy tasks?)\b/i,
      /\b(?:staff|employees?|team) (?:keep |are )?(?:repeating|repeat) (?:the same )?(?:document )?tasks?\b/i,
      /\brepetitive (?:manual |document |business )?(?:work|tasks?|workflows?)\b/i,
      /\b(?:people|staff|employees?|team) spend too much time repeatedly handling documents? by hand\b/i,
      /\btoo much of (?:our|the) process is manual paperwork\b/i,
      /\brepeat (?:the )?same document steps? every day\b/i,
    ],
  },
  {
    id: "legacy_modernization",
    label: "modernization of difficult-to-maintain legacy applications",
    offeringIds: ["ibm-i-as400-services", "enterprise-software-development"],
    signal: "we need IBM i AS400 modernization support",
    patterns: [
      /\b(?:old|legacy) (?:IBM i |AS400 )?(?:applications?|systems?) (?:are |becoming |feel )?(?:hard|difficult|costly) to maintain\b/i,
      /\b(?:old|legacy) (?:enterprise )?(?:applications?|systems?) (?:are |have )?(?:becoming )?(?:expensive|costly).{0,32}(?:difficult|hard) to maintain\b/i,
      /\bmoderniz(?:e|ing|ation) (?:our )?(?:legacy|IBM i|AS400)\b/i,
      /\b(?:IBM i|AS400)\b.*\b(?:aging|old|legacy|moderniz|difficult to maintain)\b/i,
      /\b(?:update|modernize) (?:our )?aging (?:applications?|systems?)\b/i,
    ],
  },
  {
    id: "application_support",
    label: "more sustainable application maintenance and support",
    offeringIds: ["ibm-i-as400-services", "software-support-consolidation"],
    signal: "we need IBM i AS400 support modernization",
    patterns: [
      /\b(?:applications?|systems?) (?:(?:are )?becoming |are )?(?:hard|difficult|expensive|costly) to (?:maintain|support)\b/i,
      /\b(?:maintenance|application support) (?:burden|backlog|problems?)\b/i,
      /\b(?:old|legacy) (?:enterprise )?(?:applications?|systems?).{0,32}(?:maintenance|support) burden\b/i,
      /\b(?:cannot|can't|cant) keep up with (?:the )?support (?:for|of) (?:our )?(?:old|legacy) (?:enterprise )?(?:applications?|systems?)\b/i,
    ],
  },
  {
    id: "software_delivery",
    label: "delivery or modernization of enterprise software",
    offeringIds: ["enterprise-software-development"],
    signal: "we need enterprise software development engineering",
    patterns: [
      /\b(?:build|develop|modernize) (?:a |our )?(?:custom )?enterprise (?:application|software)\b/i,
      /\bneed (?:a |new )?custom (?:application|software)\b/i,
    ],
  },
  {
    id: "support_consolidation",
    label: "consolidated software support",
    offeringIds: ["software-support-consolidation"],
    signal: "we need software support consolidation consolidate software support",
    patterns: [
      /\b(?:too many|multiple|fragmented) (?:software )?support (?:teams?|vendors?|contracts?)\b/i,
      /\bconsolidat(?:e|ing) (?:our )?(?:software |application )?support\b/i,
    ],
  },
  {
    id: "compliance_readiness",
    label: "stronger compliance readiness",
    offeringIds: ["compliance-cyber-assurance-overview"],
    signal: "we need compliance security review control documentation audit readiness",
    patterns: [
      /\bprepare for (?:an? )?(?:audit|compliance|security) review\b/i,
      /\b(?:compliance|audit) readiness (?:is |feels )?(?:weak|difficult|unclear)\b/i,
      /\borganize (?:our )?(?:controls?|compliance )?evidence\b/i,
    ],
  },
  {
    id: "security_evidence",
    label: "clear evidence of security posture",
    offeringIds: ["compliance-cyber-assurance-overview", "trust-center-overview"],
    signal:
      "we need compliance and security review control documentation audit readiness",
    patterns: [
      /\bshow (?:customers?|clients?|buyers?|auditors?) evidence of (?:our )?security posture\b/i,
      /\b(?:security|control) evidence (?:for|to) (?:customers?|procurement|auditors?)\b/i,
      /\bprove|demonstrate\b.*\bsecurity (?:posture|controls?)\b/i,
    ],
  },
  {
    id: "operational_visibility",
    label: "better operational visibility",
    offeringIds: [],
    signal: "",
    patterns: [
      /\b(?:lack|need|want) (?:better )?(?:operational )?visibility\b/i,
      /\b(?:cannot|can't|cant) see (?:what is happening|where work stands|who owns the work)\b/i,
    ],
  },
];

const GOAL_EVIDENCE_MAP = Object.freeze({
  case_workflow_control: {
    capabilityTerms: ["case tracking", "assignment tracking", "audit history"],
    candidateOfferingIds: ["secure-ticketing-case-management"],
    recommendationTerms: ["case intake", "assignment tracking", "audit history"],
  },
  secure_access_and_auditability: {
    capabilityTerms: ["role-based access", "audit history", "secure communication"],
    candidateOfferingIds: ["secure-ticketing-case-management"],
    recommendationTerms: ["role-based access", "audit history"],
  },
  vendor_expense_control: {
    capabilityTerms: ["vendor bill review", "discrepancy tracking", "recurring expense analysis"],
    candidateOfferingIds: ["bill-audit-bill-pay"],
    recommendationTerms: ["vendor invoices", "discrepancy tracking", "approval workflow"],
  },
  approval_workflow_improvement: {
    capabilityTerms: ["approval workflows", "payment workflows", "vendor bill review"],
    candidateOfferingIds: ["bill-audit-bill-pay"],
    recommendationTerms: ["vendor bills", "approvals", "payment workflows"],
  },
  telecom_cost_control: {
    capabilityTerms: ["telecom expense management", "contract and rate comparison", "usage analysis"],
    candidateOfferingIds: ["bill-audit-bill-pay"],
    recommendationTerms: ["telecom bills", "contract and rate comparison", "cost control"],
  },
  claims_operations_improvement: {
    capabilityTerms: ["claims processing", "claims-related operational tasks"],
    candidateOfferingIds: ["claims-processing-services"],
    recommendationTerms: ["claims processing", "operational support"],
  },
  workflow_automation: {
    capabilityTerms: ["controlled automation", "document workflows", "repetitive business processes"],
    candidateOfferingIds: ["ai-agentic-services"],
    recommendationTerms: ["AI workflow automation", "repetitive workflows", "document automation"],
  },
  software_delivery: {
    capabilityTerms: ["enterprise software development", "application modernization"],
    candidateOfferingIds: ["enterprise-software-development"],
    recommendationTerms: ["enterprise software development", "modernization"],
  },
  support_consolidation: {
    capabilityTerms: ["software support consolidation", "application support"],
    candidateOfferingIds: ["software-support-consolidation"],
    recommendationTerms: ["software support consolidation", "application support"],
  },
  compliance_readiness: {
    capabilityTerms: ["compliance review", "control documentation", "audit readiness"],
    candidateOfferingIds: ["compliance-cyber-assurance-overview"],
    recommendationTerms: ["compliance review", "audit readiness"],
  },
  security_evidence: {
    capabilityTerms: ["security posture", "control evidence", "Trust Center"],
    candidateOfferingIds: ["compliance-cyber-assurance-overview", "trust-center-overview"],
    recommendationTerms: ["security review", "control evidence"],
  },
});

const unique = (values) => [...new Set(values.filter(Boolean))];
const hasIbmiScope = (message) => /\b(?:IBM\s*i|AS\s*400|AS400)\b/i.test(message);

export const buildMiraGoalEvidenceBridge = (goalResolution, message = "") => {
  if (goalResolution?.confidence !== "high") {
    return { capabilityTerms: [], candidateOfferingIds: [], retrievalHint: "", recommendationHint: "" };
  }

  const capabilityTerms = [];
  const candidateOfferingIds = [];
  const recommendationTerms = [];
  for (const goal of goalResolution.businessGoals || []) {
    let evidence = GOAL_EVIDENCE_MAP[goal.id];
    if (goal.id === "legacy_modernization") {
      evidence = hasIbmiScope(message)
        ? {
            capabilityTerms: ["IBM i", "AS400", "legacy application modernization"],
            candidateOfferingIds: ["ibm-i-as400-services"],
            recommendationTerms: ["IBM i", "AS400", "modernization", "support"],
          }
        : {
            capabilityTerms: ["legacy application modernization", "enterprise software development"],
            candidateOfferingIds: ["enterprise-software-development"],
            recommendationTerms: ["enterprise software development", "application modernization"],
          };
    } else if (goal.id === "application_support") {
      evidence = hasIbmiScope(message)
        ? {
            capabilityTerms: ["IBM i", "AS400", "application support"],
            candidateOfferingIds: ["ibm-i-as400-services"],
            recommendationTerms: ["IBM i", "AS400", "support"],
          }
        : {
            capabilityTerms: ["software support consolidation", "application support"],
            candidateOfferingIds: ["software-support-consolidation"],
            recommendationTerms: ["software support consolidation", "application support"],
          };
    }
    if (!evidence) continue;
    capabilityTerms.push(...evidence.capabilityTerms);
    candidateOfferingIds.push(...evidence.candidateOfferingIds);
    recommendationTerms.push(...evidence.recommendationTerms);
  }

  const uniqueCapabilities = unique(capabilityTerms);
  const uniqueCandidates = unique(candidateOfferingIds);
  const uniqueRecommendationTerms = unique(recommendationTerms);
  return {
    capabilityTerms: uniqueCapabilities,
    candidateOfferingIds: uniqueCandidates,
    retrievalHint: uniqueCapabilities.join(" "),
    recommendationHint: uniqueRecommendationTerms.length
      ? `we need ${uniqueRecommendationTerms.join(" ")}`
      : "",
  };
};

const EXPLICIT_COMPARISON =
  /\b(?:compare|comparison|versus|vs\.?|difference between|different from)\b/i;
const VAGUE_OPERATIONS =
  /\b(?:improve|make) (?:our )?operations? (?:better|more efficient)?\b/i;

export const extractMiraBusinessGoals = (message = "") => {
  const text = String(message).trim();
  if (!text || EXPLICIT_COMPARISON.test(text)) {
    return {
      businessGoals: [],
      confidence: "low",
      ambiguous: false,
      implicitGoalRequest: false,
      signalText: "",
    };
  }

  const businessGoals = GOAL_DEFINITIONS.flatMap((definition) => {
    const evidence = definition.patterns
      .map((pattern) => text.match(pattern)?.[0] || "")
      .filter(Boolean);
    return evidence.length
      ? [
          {
            id: definition.id,
            label: definition.label,
            confidence: "high",
            evidence: [...new Set(evidence)],
            offeringIds: definition.offeringIds,
          },
        ]
      : [];
  });
  const deduplicatedGoals = businessGoals.filter(
    (goal, index, all) =>
      all.findIndex((candidate) => candidate.id === goal.id) === index,
  );
  const uniqueGoals = deduplicatedGoals.filter(
    (goal) =>
      goal.id !== "application_support" ||
      !deduplicatedGoals.some(
        (candidate) => candidate.id === "legacy_modernization",
      ),
  );

  return {
    businessGoals: uniqueGoals,
    confidence: uniqueGoals.length ? "high" : "low",
    ambiguous: !uniqueGoals.length && VAGUE_OPERATIONS.test(text),
    implicitGoalRequest: uniqueGoals.length > 0,
    signalText: uniqueGoals
      .map(
        (goal) =>
          GOAL_DEFINITIONS.find((definition) => definition.id === goal.id)
            ?.signal || "",
      )
      .filter(Boolean)
      .join(" "),
  };
};

export const frameMiraGoalRecommendation = (
  recommendationResolution,
  goalResolution,
) => {
  if (
    !recommendationResolution ||
    recommendationResolution.recommendation?.status !== "recommended" ||
    !goalResolution?.businessGoals?.length
  ) {
    return recommendationResolution;
  }
  const goalLabels = goalResolution.businessGoals.map((goal) => goal.label);
  const prefix =
    goalLabels.length === 1
      ? `If your goal is ${goalLabels[0]}, the strongest grounded match is:`
      : `Your stated goals are ${goalLabels.join(" and ")}. The grounded matches are:`;
  return {
    ...recommendationResolution,
    answer: `${prefix}\n${recommendationResolution.answer}`,
  };
};

export default extractMiraBusinessGoals;

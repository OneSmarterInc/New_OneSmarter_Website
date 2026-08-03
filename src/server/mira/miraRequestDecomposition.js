import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const REQUIREMENTS = [
  ["secure_case_tracking", /\bsecure (?:healthcare )?case (?:tracking|workflow|management)\b/i, "secure-ticketing-case-management", "secure case workflows"],
  ["role_based_access", /\brole[- ]based access\b/i, "secure-ticketing-case-management", "role-based access"],
  ["audit_history", /\baudit (?:history|trail|tracking)\b/i, "secure-ticketing-case-management", "audit history"],
  ["healthcare_sensitive_workflow", /\b(?:PHI[- ]sensitive (?:case )?|healthcare case )(?:workflow|workflows|tracking)\b/i, "secure-ticketing-case-management", "PHI-sensitive healthcare case workflows"],
  ["claims_workflow_support", /\bclaims? (?:workflow|workflows|operations?|processing|support)\b/i, "claims-processing-services", "claims workflow operations"],
  ["vendor_bill_approval", /\b(?:vendor|bill|invoice)(?:[- ]bill)? (?:approval|approvals|approve|approving)\b|\bapprov(?:e|ing) (?:vendor )?(?:bills?|invoices?)\b/i, "bill-audit-bill-pay", "vendor-bill approval workflows"],
  ["billing_discrepancies", /\b(?:billing|bill|invoice) discrepanc(?:y|ies)\b|\bidentify discrepancies\b/i, "bill-audit-bill-pay", "billing discrepancy tracking"],
  ["telecom_expense_control", /\b(?:control|reduce|manage)?\s*telecom (?:expenses?|costs?|spend|bills?)\b/i, "bill-audit-bill-pay", "telecom expense management"],
  ["document_workflow_automation", /\b(?:manual document work|document (?:review|automation|workflow)|automat\w* document)\b/i, "ai-agentic-services", "controlled document-workflow automation"],
  ["human_in_the_loop_review", /\b(?:human (?:approval|review)|human[- ]in[- ]the[- ]loop)\b/i, "ai-agentic-services", "human-in-the-loop review"],
  ["repeatable_workflow", /\brepeatable (?:business )?workflow\b/i, "ai-agentic-services", "repeatable business processes"],
  ["enterprise_workflow_integration", /\b(?:integrat\w* (?:the )?workflow|enterprise integration)\b/i, "ai-agentic-services", "enterprise integration"],
  ["legacy_modernization", /\b(?:moderniz\w*|old|legacy) (?:an? )?(?:application|app|system)\b|\bapplication.{0,24}moderniz\w*\b/i, "enterprise-software-development", "application modernization"],
  ["application_support", /\bmaintenance (?:costs?|burden)\b|\b(?:difficult|expensive|costly) to maintain\b/i, "software-support-consolidation", "application maintenance and support"],
  ["compliance_readiness", /\bcompliance readiness (?:services?|support)?\b/i, "compliance-cyber-assurance-overview", "compliance readiness"],
  ["trust_center_evidence", /\bTrust Center\b/i, "trust-center-overview", "OneSmarter security and compliance evidence"],
];

const ACTIONS = [
  ["compare", /\b(?:compare|comparison|versus|vs\.?|difference)\b/i],
  ["recommend", /\b(?:recommend|suggest|which (?:one|platform|service) is better)\b/i],
  ["list", /\b(?:list|what are|which are)\b/i],
  ["summarize", /\bsummari[sz]e\b/i],
  ["separate", /\b(?:separate|bifurcate)\b/i],
  ["names_only", /\b(?:names? only|just (?:give|tell|list).{0,16}names?)\b/i],
  ["explain", /\b(?:explain|tell me|describe|clarify)\b/i],
  ["clarify", /\bclarify\b/i],
];

const CONSTRAINTS = [
  ["healthcare_relevance", /\bhealthcare\b|\bTPA\b/i],
  ["not_all_services", /\b(?:do not|don't|dont|not) list (?:all|every) (?:the )?services?\b/i],
  ["no_comparison", /\b(?:do not|don't|dont|no) compar(?:e|ison)\b/i],
  ["names_only", /\bnames? only\b|\bjust .{0,16}names?\b/i],
  ["only_platforms", /\bonly platforms?\b|\bplatforms? only\b/i],
  ["no_technology_assumption", /\b(?:avoid|do not|don't|dont|without) assum(?:e|ing).{0,24}(?:technology|AS400|IBM i)\b/i],
  ["must_support_audit_history", /\bmust support audit (?:history|trail)\b/i],
];

const evidenceFor = (pattern, text) => text.match(pattern)?.[0] || "";
const unique = (values) => [...new Set(values.filter(Boolean))];

export const decomposeMiraRequest = (message = "") => {
  const text = String(message).trim();
  const potentialCompound =
    /\b(?:and|also|but|while)\b/i.test(text) ||
    (text.match(/\b(?:compare|recommend|suggest|list|explain|summari[sz]e|separate|clarify)\b/gi) || [])
      .length > 1;
  if (!potentialCompound) {
    return {
      simpleRequest: true,
      compoundRequest: false,
      requirements: [],
      requestedActions: [],
      constraints: [],
    };
  }
  const requirements = REQUIREMENTS.flatMap(([id, pattern, offeringId, coverage]) => {
    const evidence = evidenceFor(pattern, text);
    return evidence
      ? [{ id, textEvidence: [evidence], confidence: "high", offeringId, coverage }]
      : [];
  });
  const requestedActions = ACTIONS.filter(([, pattern]) => pattern.test(text)).map(
    ([id]) => id,
  );
  const constraints = CONSTRAINTS.filter(([, pattern]) => pattern.test(text)).map(
    ([id]) => id,
  );
  const recommendationClause =
    text.match(
      /\b(?:recommend|suggest)(?:ation)?\b[^,.;?]*(?=,|;|\?|$)/i,
    )?.[0] || "";
  const recommendationRequirementIds = recommendationClause
    ? requirements
        .filter((requirement) =>
          requirement.textEvidence.some((evidence) =>
            recommendationClause.toLowerCase().includes(evidence.toLowerCase()),
          ),
        )
        .map((requirement) => requirement.id)
    : [];
  if (constraints.includes("no_comparison")) {
    const index = requestedActions.indexOf("compare");
    if (index >= 0) requestedActions.splice(index, 1);
  }
  if (constraints.includes("not_all_services")) {
    const index = requestedActions.indexOf("list");
    if (index >= 0) requestedActions.splice(index, 1);
  }
  const explicitEntities = unique(
    requirements.map((requirement) => requirement.offeringId),
  );
  const conjunctions = (text.match(/\b(?:and|also|but|while)\b/gi) || []).length;
  const compoundRequest =
    requirements.length > 1 ||
    requestedActions.length > 1 ||
    (explicitEntities.length > 1 && requestedActions.length > 0) ||
    (conjunctions > 0 && requirements.length + requestedActions.length > 2);
  return {
    simpleRequest: !compoundRequest,
    compoundRequest,
    existingDecisionFastPath: /\bwhich is better\b/i.test(text),
    requirements,
    requestedActions,
    constraints,
    recommendationRequirementIds,
  };
};

export const composeMiraCompoundAnswer = ({
  decomposition,
  decisionResolution,
  comparisonResolution,
  recommendationResolution,
} = {}) => {
  if (!decomposition?.compoundRequest) return null;
  const grouped = new Map();
  for (const requirement of decomposition.requirements) {
    const values = grouped.get(requirement.offeringId) || [];
    values.push(requirement);
    grouped.set(requirement.offeringId, values);
  }
  if (
    decisionResolution &&
    grouped.size === 1 &&
    ((decisionResolution.decisionIntent === "select_for_requirement" &&
      decomposition.existingDecisionFastPath) ||
      (decomposition.requestedActions.length === 1 &&
        !decomposition.requestedActions.includes("compare")))
  ) {
    return null;
  }
  const entities = [...grouped.keys()]
    .map((id, index) => groundedConversationEntityForId(id, { position: index + 1 }))
    .filter(Boolean);
  const coverage = entities.map((entity) => ({
    offeringId: entity.id,
    label: entity.label,
    supportedRequirements: (grouped.get(entity.id) || []).map(({ id }) => id),
    partiallySupportedRequirements: [],
    conditionalRequirements: [],
    unsupportedRequirements: [],
    unknownRequirements: [],
  }));
  const actions = decomposition.requestedActions;
  const sections = [];
  if (actions.includes("compare") && comparisonResolution?.comparison?.status === "complete") {
    sections.push(`Comparison:\n${comparisonResolution.answer}`);
  }
  let recommendation = recommendationResolution?.recommendation || null;
  if (
    actions.includes("recommend") &&
    recommendation?.status !== "recommended" &&
    entities.length
  ) {
    const targetedOfferingIds = new Set(
      decomposition.requirements
        .filter((requirement) =>
          decomposition.recommendationRequirementIds?.includes(requirement.id),
        )
        .map((requirement) => requirement.offeringId),
    );
    const primary = entities
      .map((entity) => ({
        entity,
        targeted: targetedOfferingIds.has(entity.id) ? 1 : 0,
        count: (grouped.get(entity.id) || []).length,
      }))
      .sort(
        (left, right) =>
          right.targeted - left.targeted || right.count - left.count,
      )[0].entity;
    recommendation = {
      status: "recommended",
      primaryOption: { id: primary.id, label: primary.label, type: primary.type },
      reasons: [
        `It has the strongest approved coverage for the requested ${(
          grouped.get(primary.id) || []
        )
          .map(({ coverage: value }) => value)
          .join(", ")}.`,
      ],
      alternatives: [],
      missingInformation: [],
    };
  }
  if (actions.includes("recommend") && recommendation?.status === "recommended") {
    const recommendationAnswer =
      recommendationResolution?.recommendation?.status === "recommended"
        ? recommendationResolution.answer
        : `Recommended: ${recommendation.primaryOption.label}.\n${recommendation.reasons[0]}`;
    sections.push(`Recommendation:\n${recommendationAnswer}`);
  }
  const coveredIds = new Set(
    recommendation?.primaryOption ? [recommendation.primaryOption.id] : [],
  );
  const coverageLines = coverage
    .filter(({ offeringId }) => !actions.includes("recommend") || !coveredIds.has(offeringId))
    .map(({ label, offeringId }) => {
      const covered = (grouped.get(offeringId) || []).map(({ coverage: value }) => value);
      return `- ${label}: ${covered.join(", ")}.`;
    });
  if (coverageLines.length) {
    sections.push(`Requirement coverage:\n${coverageLines.join("\n")}`);
  }
  if (coverage.length > 1) {
    sections.push("No single offering is presented as covering every requirement; each match is scoped to the needs listed above.");
  }
  if (!sections.length) return null;

  return {
    answer: sections.join("\n\n"),
    entities,
    matchedEntries: matchedEntriesForConversationEntities(entities),
    offeringCoverage: coverage,
    addressedActions: actions,
    recommendation,
  };
};

export default decomposeMiraRequest;

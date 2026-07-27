import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const EVIDENCE_RULES = [
  {
    id: "secure-ticketing-case-management",
    pattern:
      /\b(?:audit history|role[- ]based access|secure (?:case )?intake|case tracking|case assignment|controlled communication)\b/i,
    reason:
      "Secure Ticketing and Case Management supports secure intake, role-based access, audit history, controlled communication, and workflow tracking.",
  },
  {
    id: "bill-audit-bill-pay",
    pattern:
      /\b(?:telecom expenses?|telecom costs?|vendor bills?|vendor invoices?|bill discrepancies|discrepancy tracking|bill approvals?|payment workflows?|contract and rate comparison|usage analysis)\b/i,
    reason:
      "Bill Audit & Bill Pay supports vendor bill review, discrepancy tracking, approval and payment workflows, with telecom expense management as an approved use case.",
  },
  {
    id: "claims-processing-services",
    pattern:
      /\b(?:claims? (?:processing|operations?|workflow|modernization|technology support)|member and provider portals?)\b/i,
    reason:
      "Claims Processing Services support claims workflow modernization, claims technology, portals, reporting, and operational visibility.",
  },
  {
    id: "ai-agentic-services",
    pattern:
      /\b(?:ai (?:agents?|agentic|automation)|agentic ai|controlled automation|document automation|human[- ]in[- ]the[- ]loop|manual workflow work|repetitive (?:business )?workflows?)\b/i,
    reason:
      "AI Agentic Services support controlled automation, document workflows, decision support, human-in-the-loop review, and repeatable business processes.",
  },
  {
    id: "ibm-i-as400-services",
    pattern:
      /\b(?:ibm[\s/-]*i|as[\s/-]*400|legacy (?:system )?modernization)\b/i,
    reason:
      "IBM i / AS400 Services are an approved Technology Solutions service for IBM i and AS400 needs.",
  },
  {
    id: "enterprise-software-development",
    pattern:
      /\b(?:enterprise software (?:development|modernization)|software modernization|application modernization)\b/i,
    reason:
      "Enterprise Software Development is an approved Technology Solutions service relevant to software modernization.",
  },
  {
    id: "software-support-consolidation",
    pattern:
      /\b(?:software support consolidation|consolidat(?:e|ing) software support)\b/i,
    reason:
      "Software Support Consolidation is an approved Technology Solutions service.",
  },
  {
    id: "compliance-cyber-assurance-overview",
    pattern:
      /\b(?:compliance review|security review|control documentation|framework mapping|audit readiness|vapt|remediation)\b/i,
    reason:
      "Compliance & Cyber Assurance supports review preparation, evidence organization, control documentation, framework mapping, VAPT coordination, and remediation.",
  },
  {
    id: "hipaa-security-rule-assessment",
    pattern: /\bhipaa (?:security rule )?(?:compliance )?assessment\b/i,
    reason:
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment; this is assessment wording, not a certification or compliance guarantee.",
  },
];

const BROAD_CATEGORY_RULES = [
  {
    pattern:
      /\b(?:document[- ]heavy|manual (?:work|processes?)|paper[- ]heavy)\b/i,
    entityIds: ["ai-agentic-services", "business-services-overview"],
  },
  {
    pattern: /\bmoderni[sz](?:e|ation|ing)\b/i,
    entityIds: ["ibm-i-as400-services", "enterprise-software-development"],
  },
  {
    pattern:
      /\bhealthcare\b|\bhealthcare operations?\b|\bhealthcare (?:and |&)tpa\b|\btpa operations?\b/i,
    entityIds: [
      "secure-ticketing-case-management",
      "claims-processing-services",
      "healthcare-tpa-technology-services",
    ],
    supportingIds: ["hipaa-security-rule-assessment"],
  },
  {
    pattern: /\btechnology services?\b|\btechnology solutions?\b/i,
    entityIds: [
      "claims-processing-services",
      "ai-agentic-services",
      "ibm-i-as400-services",
    ],
  },
  {
    pattern: /\bback[- ]office (?:operations?|workflows?|support)\b/i,
    entityIds: ["business-services-overview", "bill-audit-bill-pay"],
  },
];

const QUESTION_SCOPE =
  /\b(?:tell me about|what|which|how|where|do you do|offer|offers|support|supports|help|helps|available|overview)\b/i;
const BROAD_OVERVIEW_REQUEST =
  /\b(?:tell me|overview of)\b|\bwhat\b.+\b(?:offer|offers|do for|help)\b/i;
const EXPLICIT_COMPARISON =
  /\b(?:compare|comparison|versus|vs\.?|difference between|different from|pros and cons|one or both)\b/i;
const DECISION_REQUEST =
  /\b(?:which (?:one|option|platform|service|offering)|what (?:platform|service|offering) should|best for|better for|right for|fits? (?:our|my|the|this))\b/i;
const STANDALONE_REQUIREMENT = /\b(?:we|i|our company|my company)\s+(?:need|want|process|handle)\b/i;

const entityForId = (id) =>
  groundedConversationEntityForId(id, {
    level: id === "technology-solutions-overview" ||
      id === "secure-ticketing-case-management" ||
      id === "bill-audit-bill-pay" ||
      id === "claims-processing-services" ||
      id === "ai-agentic-services" ||
      id === "business-services-overview" ||
      id === "compliance-cyber-assurance-overview" ||
      id === "hipaa-security-rule-assessment"
      ? 0
      : 1,
    includeChildren: false,
  });

const uniqueById = (items = []) =>
  items.filter(
    (item, index) =>
      item?.id && items.findIndex((candidate) => candidate?.id === item.id) === index,
  );

const metadataEntity = (entity) => ({
  id: entity.id,
  label: entity.label,
  type: entity.type,
  ...(entity.parentId ? { parentId: entity.parentId } : {}),
});

export const resolveMiraRelevantFacts = (message = "") => {
  if (
    !QUESTION_SCOPE.test(message) ||
    EXPLICIT_COMPARISON.test(message) ||
    DECISION_REQUEST.test(message) ||
    STANDALONE_REQUIREMENT.test(message)
  ) {
    return null;
  }

  const broadRule = BROAD_OVERVIEW_REQUEST.test(message)
    ? BROAD_CATEGORY_RULES.find((rule) => rule.pattern.test(message))
    : null;
  const matchedRules = EVIDENCE_RULES.filter((rule) => rule.pattern.test(message));
  const selectedIds = broadRule?.entityIds || matchedRules.map((rule) => rule.id);
  if (!selectedIds.length) return null;

  const entities = uniqueById(selectedIds.map(entityForId).filter(Boolean)).slice(0, 3);
  if (!entities.length) return null;
  const supportingEntities = uniqueById(
    (broadRule?.supportingIds || []).map(entityForId).filter(Boolean),
  );
  const matchedEntries = matchedEntriesForConversationEntities([
    ...entities,
    ...supportingEntities,
  ]);
  const reasons = entities.map((entity) => {
    const rule = EVIDENCE_RULES.find((candidate) => candidate.id === entity.id);
    return {
      entity,
      reason:
        rule?.reason ||
        (entity.id === "healthcare-tpa-technology-services"
          ? "Healthcare & TPA Technology Services are included under OneSmarter Technology Solutions."
          : entity.id === "business-services-overview"
            ? "Business Services cover finance, HR, payment, benefits, and back-office workflows."
          : ""),
    };
  });

  return {
    entities,
    matchedEntries,
    answer: [
      entities.length === 1
        ? "The strongest approved match is:"
        : "The strongest approved matches are:",
      ...reasons.map(
        ({ entity, reason }, index) =>
          `${index + 1}. ${entity.label} (${entity.type})\n   - ${reason}`,
      ),
      ...(supportingEntities.some(
        (entity) => entity.id === "hipaa-security-rule-assessment",
      )
        ? [
            "Supporting context: OneSmarter has completed an independent HIPAA Security Rule compliance assessment. This is evidence-based assessment wording, not a certification or compliance guarantee.",
          ]
        : []),
    ].join("\n"),
    evidenceSelection: {
      primary: entities.map(metadataEntity),
      supporting: supportingEntities.map(metadataEntity),
      excluded: [],
    },
  };
};

export const applyMiraEvidenceSelection = (
  result,
  { initialMatchedEntries = [] } = {},
) => {
  const primaryEntities = uniqueById(
    (result.resolvedConversationEntities || [])
      .flatMap((entity) => [entity, ...(entity.children || [])])
      .filter((entity) =>
        result.matchedEntries?.some(
          (entry) =>
            entry.id === entity.id || entity.sourceIds?.includes(entry.id),
        ),
      ),
  );
  const primary =
    result.evidenceSelection?.primary?.length
      ? result.evidenceSelection.primary
      : primaryEntities.length
        ? primaryEntities.map(metadataEntity)
        : (result.matchedEntries || []).map((entry) => ({
            id: entry.id,
            label: entry.title,
            type: String(entry.category || "topic").toLowerCase().replace(/\s+/g, "_"),
          }));
  const primarySourceIds = new Set([
    ...primary.map((item) => item.id),
    ...(result.evidenceSelection?.supporting || []).map((item) => item.id),
    ...primaryEntities.flatMap((entity) => entity.sourceIds || []),
  ]);
  const excluded = uniqueById(initialMatchedEntries)
    .filter((entry) => !primarySourceIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      label: entry.title,
      type: String(entry.category || "topic").toLowerCase().replace(/\s+/g, "_"),
    }));

  return {
    ...result,
    evidenceSelection: {
      primary,
      supporting: result.evidenceSelection?.supporting || [],
      excluded,
    },
  };
};

export default applyMiraEvidenceSelection;

import { onesmarterPublicKnowledgeBase } from "../../../src/data/agentKnowledge/onesmarterPublicKb.js";
import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
  resolveMiraConversationReference,
} from "./miraConversationReferences.js";

const COMPARISON_INTENT =
  /\b(?:compare|side[- ]by[- ]side comparison|comparison (?:between|of)|difference(?:s)?(?: between)?|different from|versus|vs\.?|which (?:one|option|platform|service|offering) is better|which is better|pros and cons|one or both|first (?:one )?compared with (?:the )?second|how (?:is|are) .+ different from)\b/i;
const knowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);
const ENTITY_ALIASES = [
  ["secure-ticketing-case-management", ["secure ticketing and case management", "secure ticketing", "case management"]],
  ["bill-audit-bill-pay", ["bill audit & bill pay", "bill audit and bill pay", "bill audit", "bill pay"]],
  ["technology-solutions-overview", ["technology solutions overview", "technology solutions"]],
  ["claims-processing-services", ["claims processing services", "claims processing"]],
  ["ai-agentic-services", ["ai agentic services", "ai agents", "agentic services"]],
  ["ibm-i-as400-services", ["ibm i / as400 services", "ibm i services", "as400 services", "ibm i", "as400"]],
  ["enterprise-software-development", ["enterprise software development"]],
  ["software-support-consolidation", ["software support consolidation"]],
  ["compliance-cyber-assurance-overview", ["compliance & cyber assurance", "compliance and cyber assurance"]],
];

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/\bcompar\b/g, "compare")
    .replace(/\bdiffrence\b/g, "difference")
    .replace(/\bplatfrom\b/g, "platform")
    .replace(/\bsecnd\b/g, "second")
    .replace(/\bfrist\b/g, "first")
    .replace(/[^a-z0-9&/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const uniqueEntities = (entities = []) =>
  entities.filter(
    (entity, index, all) =>
      entity &&
      all.findIndex((candidate) => candidate?.id === entity.id) === index,
  );
const nestedIds = new Set([
  "claims-processing-services",
  "ai-agentic-services",
  "ibm-i-as400-services",
  "enterprise-software-development",
  "software-support-consolidation",
]);

const explicitlyNamedEntities = (message = "") => {
  const text = normalize(message);
  return uniqueEntities(
    ENTITY_ALIASES.filter(([, aliases]) =>
      aliases.some((alias) => text.includes(normalize(alias))),
    )
      .map(([id]) =>
        groundedConversationEntityForId(id, {
          level: nestedIds.has(id) ? 1 : 0,
        }),
      )
      .filter(Boolean),
  );
};

const requirementSignals = (message = "") => {
  const text = normalize(message);
  const signals = [];
  const add = (optionId, reason) => signals.push({ optionId, reason });
  if (/\btelecom|contract and rate|usage analysis|cost control\b/.test(text)) {
    add(
      "bill-audit-bill-pay",
      "Telecom expense management is an approved Bill Audit & Bill Pay use case, including bill analysis, contract and rate comparison, historical usage review, and cost-control reporting.",
    );
  }
  if (/\bvendor bill|vendor invoice|discrepanc|approval|payment workflow\b/.test(text)) {
    add(
      "bill-audit-bill-pay",
      "Vendor bill review, discrepancy tracking, approvals, and payment workflows are approved Bill Audit & Bill Pay capabilities.",
    );
  }
  if (/\bcase intake|case tracking|case management|role based access|audit history|secure communication\b/.test(text)) {
    add(
      "secure-ticketing-case-management",
      "Secure case intake, role-based access, audit history, controlled communication, and workflow tracking align with Secure Ticketing and Case Management.",
    );
  }
  if (/\bclaims? processing|claims? workflow|claims? operations\b/.test(text)) {
    add(
      "claims-processing-services",
      "Claims workflow modernization and claims technology support align with Claims Processing Services.",
    );
  }
  if (/\bai agent|ai automation|automate|controlled automation|document workflow|human in the loop\b/.test(text)) {
    add(
      "ai-agentic-services",
      "Controlled automation, document workflows, decision support, and human-in-the-loop review align with AI Agentic Services.",
    );
  }
  if (/\bibm i|as400|modernization\b/.test(text)) {
    add(
      "ibm-i-as400-services",
      "IBM i / AS400 work aligns with IBM i / AS400 Services.",
    );
  }
  return signals.filter(
    (signal, index, all) =>
      all.findIndex((candidate) => candidate.optionId === signal.optionId) ===
      index,
  );
};

const optionMetadata = (entity, entry) => ({
  id: entity.id,
  label: entity.label,
  type: entity.type,
  summary: entry?.approvedSummary || "",
  bestFor: (entry?.allowedClaims || []).slice(0, 4),
  capabilities: (entry?.sourceFacts || []).slice(0, 4),
  limitations: [],
});

const answerForComparison = (comparison) =>
  [
    "Here is a grounded comparison of the selected OneSmarter offerings:",
    ...comparison.options.flatMap((option) => {
      return [
        "",
        `${option.label} (${option.type.replaceAll("_", " ")}):`,
        `- Purpose: ${option.summary}`,
        ...option.capabilities.slice(0, 3).map((fact) => `- ${fact}`),
      ];
    }),
    "",
    ...comparison.keyDifferences.map((difference) => `Key difference: ${difference}`),
    comparison.decisionGuidance,
  ]
    .filter(Boolean)
    .join("\n");

export const isMiraComparisonIntent = (message = "") =>
  COMPARISON_INTENT.test(normalize(message));

export const resolveMiraComparison = (message = "", conversationHistory = []) => {
  if (!isMiraComparisonIntent(message)) return null;
  if (
    /\b(?:salesforce|microsoft dynamics|servicenow|zendesk|sap|oracle)\b/i.test(
      message,
    )
  ) {
    const decisionGuidance =
      "The approved OneSmarter knowledge base does not contain enough verified information about the external offering for a reliable comparison.";
    return {
      comparison: {
        status: "insufficient_evidence",
        options: [],
        sharedCapabilities: [],
        keyDifferences: [],
        decisionGuidance,
        evidenceGaps: ["Verified information about the external offering"],
      },
      entities: [],
      matchedEntries: [],
      answer: decisionGuidance,
    };
  }

  const reference = resolveMiraConversationReference(
    message,
    conversationHistory,
  );
  const named = explicitlyNamedEntities(message);
  const referenced =
    reference.kind === "resolved" && reference.entities.length > 1
      ? reference.entities
      : [];
  const signals = requirementSignals(message);
  let entities = uniqueEntities(named.length >= 2 ? named : referenced);
  const historyText = conversationHistory
    .slice(-4)
    .map((turn) => turn?.content || "")
    .join(" ");
  const historyHasBothPlatforms =
    /secure ticketing/i.test(historyText) && /bill audit/i.test(historyText);
  const asksForPlatformPair =
    /\b(?:both platforms|the two|one or both)\b/i.test(message) ||
    historyHasBothPlatforms;

  if (!entities.length && asksForPlatformPair) {
    entities = [
      groundedConversationEntityForId("secure-ticketing-case-management"),
      groundedConversationEntityForId("bill-audit-bill-pay"),
    ].filter(Boolean);
  }

  if (!entities.length && signals.length) {
    const signalIds = new Set(signals.map((signal) => signal.optionId));
    entities = [
      groundedConversationEntityForId("secure-ticketing-case-management"),
      groundedConversationEntityForId("bill-audit-bill-pay"),
    ].filter(
      (entity) =>
        entity &&
        (signalIds.has(entity.id) ||
          /\bwhich (?:one|option|platform|offering)? ?is better\b/i.test(message)),
    );
  }

  if (entities.length < 2) {
    const clarification =
      signals.length && entities.length === 1
        ? `For the need you described, ${entities[0].label} is the grounded match. Which other OneSmarter platform or service would you like to compare it with?`
        : "Which platforms or services would you like me to compare?";
    return {
      comparison: {
        status: "needs_clarification",
        options: [],
        sharedCapabilities: [],
        keyDifferences: [],
        decisionGuidance: "",
        evidenceGaps: [
          "Two grounded OneSmarter options and, if asking which is better, the target workflow",
        ],
      },
      entities: [],
      matchedEntries: [],
      answer: clarification,
    };
  }

  const matchedEntries = matchedEntriesForConversationEntities(entities);
  if (matchedEntries.length < entities.length) {
    return {
      comparison: {
        status: "insufficient_evidence",
        options: [],
        sharedCapabilities: [],
        keyDifferences: [],
        decisionGuidance: "",
        evidenceGaps: ["Approved knowledge for every selected option"],
      },
      entities: [],
      matchedEntries: [],
      answer:
        "The approved OneSmarter knowledge base does not contain enough verified information for that comparison.",
    };
  }

  const options = entities.map((entity) =>
    optionMetadata(
      entity,
      matchedEntries.find((entry) => entity.sourceIds?.includes(entry.id)),
    ),
  );
  const matchedSignals = signals.filter((signal) =>
    options.some((option) => option.id === signal.optionId),
  );
  const decisionGuidance =
    matchedSignals.length === 1
      ? `${matchedSignals[0].reason} Based on that stated need, ${options.find((option) => option.id === matchedSignals[0].optionId)?.label} is the stronger grounded match.`
      : matchedSignals.length > 1
        ? `The stated needs map to both ${matchedSignals
            .map(
              (signal) =>
                options.find((option) => option.id === signal.optionId)?.label,
            )
            .filter(Boolean)
            .join(" and ")}; one option should not be forced when both workflows remain in scope.`
        : "Neither option is automatically better; the practical choice depends on the workflow and capabilities you need.";
  const keyDifferences = options.map(
    (option) =>
      `${option.label} is a ${option.type.replaceAll("_", " ")} focused on ${knowledgeById.get(option.id)?.approvedSummary || "its approved purpose"}`,
  );
  const comparison = {
    status: "complete",
    options,
    sharedCapabilities: [],
    keyDifferences,
    decisionGuidance,
    evidenceGaps: [],
  };
  return {
    comparison,
    entities,
    matchedEntries,
    answer: answerForComparison(comparison),
  };
};

export default resolveMiraComparison;

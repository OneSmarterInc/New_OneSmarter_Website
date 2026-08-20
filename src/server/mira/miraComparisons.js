import { onesmarterPublicKnowledgeBase } from "../../data/agentKnowledge/onesmarterPublicKb.js";
import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
  resolveMiraConversationReference,
} from "./miraConversationReferences.js";
import {
  resolveMiraComparisonEntities,
  resolveMiraEntityText,
} from "./miraEntityResolver.js";
import { isMiraContextualComparisonFollowUp } from "./miraTurnContext.js";

const COMPARISON_INTENT =
  /\b(?:compare|side[- ]by[- ]side comparison|comparison (?:between|of)|difference(?:s)?(?: between)?|different from|versus|vs\.?|which (?:one|option|platform|service|offering) is better|which is better|pros and cons|one or both|first (?:one )?compared with (?:the )?second|how (?:is|are) .+ different from|use .+ as (?:the )?second option)\b/i;
const EXPLORATORY_COMPARISON =
  /\b(?:compare|side[- ]by[- ]side|difference(?:s)?(?: between)?|different from|versus|vs\.?|pros and cons|one or both|how (?:is|are) .+ different|use .+ as (?:the )?second option)\b/i;
const SELECTION_LANGUAGE =
  /\b(?:which (?:one|option|platform|service|offering)? ?is (?:better|best|right)|which of those is (?:better|best|right)|which (?:platform|service|option) (?:fits|should)|what should (?:i|we) use|best fit)\b/i;
const EXPLICIT_HISTORY_REFERENCE =
  /\b(?:those two|the first and second|first (?:versus|and|compared with) second|between them|which of those|which one|the two|one or both|previous option)\b/i;
const knowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);
const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/\b(?:comapre|compar)\b/g, "compare")
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
  "healthcare-tpa-technology-services",
  "claims-processing-services",
  "ai-agentic-services",
  "ibm-i-as400-services",
  "enterprise-software-development",
  "software-support-consolidation",
]);

const ASSISTANT_SELECTED_CANDIDATE =
  /\b(?:any other|another|something (?:similar|relevant)|whatever is closest|any other .+ in your mind|pick (?:one )?(?:other|relevant)|choose (?:one )?other|select (?:one )?other)\b/i;
const CATEGORY_PLATFORM = /\b(?:another|other|one) platform\b/i;
const CATEGORY_SERVICE = /\b(?:another|other|relevant|healthcare) service\b/i;

const CANDIDATE_PROFILES = [
  {
    id: "secure-ticketing-case-management",
    type: "platform",
    parent: "platforms",
    tags: ["workflow", "healthcare", "case", "security"],
    boundary: "secure case workflows, role-based access, audit history, or PHI-sensitive operations",
  },
  {
    id: "bill-audit-bill-pay",
    type: "platform",
    parent: "platforms",
    tags: ["workflow", "billing", "approval", "telecom"],
    boundary: "vendor bills, discrepancies, approvals, payments, or telecom expense workflows",
  },
  {
    id: "healthcare-tpa-technology-services",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["healthcare", "tpa", "technology", "operations"],
    boundary: "broader healthcare or TPA technology work",
  },
  {
    id: "claims-processing-services",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["healthcare", "claims", "technology", "operations"],
    boundary: "claims-processing operations and claims technology support",
  },
  {
    id: "ai-agentic-services",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["technology", "software", "workflow", "automation"],
    boundary: "controlled automation, document workflows, or human-in-the-loop review",
  },
  {
    id: "ibm-i-as400-services",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["technology", "software", "modernization", "support", "ibm-i"],
    boundary: "an IBM i / AS400 environment needing specialized support or modernization",
  },
  {
    id: "enterprise-software-development",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["technology", "software", "modernization", "development"],
    boundary: "broader or cross-technology application development and modernization",
  },
  {
    id: "software-support-consolidation",
    type: "service",
    parent: "technology-solutions-overview",
    tags: ["technology", "software", "support", "maintenance"],
    boundary: "consolidating ongoing application support across teams or vendors",
  },
];

const profileFor = (id) => CANDIDATE_PROFILES.find((profile) => profile.id === id);

const requestedCandidateType = (message = "") =>
  CATEGORY_PLATFORM.test(message)
    ? "platform"
    : CATEGORY_SERVICE.test(message)
      ? "service"
      : "";

const contextTagsFor = (message = "") => [
  ...(/\bhealthcare|tpa\b/i.test(message) ? ["healthcare"] : []),
  ...(/\bclaims?\b/i.test(message) ? ["claims"] : []),
  ...(/\bmoderniz/i.test(message) ? ["modernization"] : []),
  ...(/\b(?:IBM\s*i|AS400)\b/i.test(message) ? ["ibm-i"] : []),
  ...(/\bautomation|workflow\b/i.test(message) ? ["workflow"] : []),
  ...(/\bvendor bill|approval\b/i.test(message) ? ["approval"] : []),
];

const recommendationContextTagsFor = (message = "") => [
  ...(/\bhealthcare|tpa\b/i.test(message) ? ["healthcare"] : []),
  ...(/\bclaims?\b/i.test(message) ? ["claims"] : []),
  ...(/\bmoderniz/i.test(message) ? ["modernization"] : []),
  ...(/\b(?:IBM\s*i|AS400).{0,32}\b(?:environment|maintain|moderniz|support)\b|\b(?:environment|maintain|moderniz|support).{0,32}\b(?:IBM\s*i|AS400)\b/i.test(message)
    ? ["ibm-i"]
    : []),
  ...(/\bvendor bill|approval\b/i.test(message) ? ["approval"] : []),
];

const selectAssistantComparisonCandidate = (
  message,
  explicitEntities,
  { excludedIds = [] } = {},
) => {
  const allowsSelection = ASSISTANT_SELECTED_CANDIDATE.test(message);
  const typeConstraint = requestedCandidateType(message);
  if (!allowsSelection && !(typeConstraint === "platform" && explicitEntities.length === 0)) {
    return null;
  }
  if (explicitEntities.length > 1) return null;
  if (!explicitEntities.length && typeConstraint === "platform") {
    const entities = [
      groundedConversationEntityForId("secure-ticketing-case-management"),
      groundedConversationEntityForId("bill-audit-bill-pay"),
    ].filter(Boolean);
    return {
      entities,
      selectedCandidate: entities[1],
      reason: "both are approved OneSmarter platforms serving different operational workflows",
    };
  }
  const explicit = explicitEntities[0];
  if (!explicit) return null;
  const explicitProfile = profileFor(explicit.id);
  const contextTags = contextTagsFor(message);
  const candidates = CANDIDATE_PROFILES.filter(
    (profile) =>
      profile.id !== explicit.id &&
      !excludedIds.includes(profile.id) &&
      (!typeConstraint || profile.type === typeConstraint),
  )
    .map((profile, order) => ({
      profile,
      order,
      score:
        (profile.type === explicitProfile?.type ? 40 : 0) +
        (profile.parent === explicitProfile?.parent ? 20 : 0) +
        profile.tags.filter((tag) => explicitProfile?.tags.includes(tag)).length * 10 +
        profile.tags.filter((tag) => contextTags.includes(tag)).length * 15 -
        (profile.tags.includes("ibm-i") && !contextTags.includes("ibm-i")
          ? 25
          : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order);
  const selectedProfile = candidates[0]?.profile;
  const selectedCandidate = selectedProfile
    ? groundedConversationEntityForId(selectedProfile.id, {
        level: nestedIds.has(selectedProfile.id) ? 1 : 0,
      })
    : null;
  if (!selectedCandidate) return null;
  const sharedTags = explicitProfile?.tags.filter((tag) =>
    selectedProfile.tags.includes(tag),
  );
  return {
    entities: [explicit, selectedCandidate],
    selectedCandidate,
    reason: sharedTags?.length
      ? `both relate to ${sharedTags.slice(0, 2).join(" and ")}, while differing in specialization`
      : "they provide a meaningful grounded contrast within OneSmarter's approved offerings",
  };
};

const explicitlyNamedEntities = (message = "") =>
  uniqueEntities(
    resolveMiraComparisonEntities(message).matches.map(
      (match) => match.entity,
    ),
  );

const latestComparisonContext = (conversationHistory = []) => {
  const recentHistory = conversationHistory.slice(-4);
  const latestAssistantIndex = recentHistory.findLastIndex(
    (turn) => turn?.role === "assistant",
  );
  const latestAssistant = recentHistory[latestAssistantIndex];
  if (!latestAssistant || latestAssistant.conversationEntities?.length < 2) {
    return null;
  }
  const entities = uniqueEntities(
    latestAssistant.conversationEntities
      .map((entity) =>
        groundedConversationEntityForId(entity.id, {
          level: nestedIds.has(entity.id) ? 1 : 0,
          position: entity.position,
        }),
      )
      .filter(Boolean),
  );
  if (entities.length < 2) return null;
  const previousUser = recentHistory
    .slice(0, latestAssistantIndex)
    .findLast((turn) => turn?.role === "user");
  if (!previousUser || !COMPARISON_INTENT.test(normalize(previousUser.content))) {
    return null;
  }
  const explicitIds = new Set(
    explicitlyNamedEntities(previousUser?.content).map((entity) => entity.id),
  );
  const anchor =
    entities.find((entity) => explicitIds.has(entity.id)) || entities[0];
  const replaceable = entities.find((entity) => entity.id !== anchor.id);
  return replaceable
    ? { anchor, replaceable, previousMessage: previousUser?.content || "" }
    : null;
};

const requirementSignals = (message = "") => {
  const text = normalize(message);
  const signals = [];
  const add = (optionId, reason) => signals.push({ optionId, reason });
  if (/\bcase intake|case tracking|case management|patient records? workflow|role based access|audit history|secure communication\b/.test(text)) {
    add(
      "secure-ticketing-case-management",
      "Secure case intake, role-based access, audit history, controlled communication, and workflow tracking align with Secure Ticketing and Case Management.",
    );
  }
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
  if (/\bclaims? processing|claims? workflow|claims? operations\b/.test(text)) {
    add(
      "claims-processing-services",
      "Claims workflow modernization and claims technology support align with Claims Processing Services.",
    );
  }
  if (/\bai agent|ai (?:workflow )?automation|automate|controlled automation|document workflow|human in the loop\b/.test(text)) {
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

const answerForAssistantSelection = (
  entities,
  assistantSelection,
  comparison,
) => [
  `I'll compare ${entities[0].label} with ${assistantSelection.selectedCandidate.label} because ${assistantSelection.reason}.`,
  "",
  "Comparison:",
  ...comparison.keyDifferences.map((difference) => `- ${difference}.`),
  "",
  `Recommendation: ${comparison.decisionGuidance}`,
].join("\n");

export const isMiraComparisonIntent = (message = "") =>
  COMPARISON_INTENT.test(normalize(message));

export const classifyMiraDecisionIntent = (
  message = "",
  conversationHistory = [],
) => {
  const normalizedMessage = normalize(message);
  const signals = requirementSignals(message);
  const optionIds = [...new Set(signals.map((signal) => signal.optionId))];
  const reference = resolveMiraConversationReference(
    message,
    conversationHistory,
  );
  const hasTwoResolvedOptions =
    reference.kind === "resolved" && reference.entities.length > 1;
  const statesDirectNeed = /\b(?:we|i) need\b/i.test(normalizedMessage);
  if (optionIds.length > 1 && statesDirectNeed) {
    return { decisionIntent: "multi_need", signals, reference };
  }
  if (optionIds.length === 1 && statesDirectNeed) {
    return { decisionIntent: "select_for_requirement", signals, reference };
  }
  if (optionIds.length > 1 && SELECTION_LANGUAGE.test(normalizedMessage)) {
    return { decisionIntent: "multi_need", signals, reference };
  }
  if (SELECTION_LANGUAGE.test(normalizedMessage) && optionIds.length === 1) {
    return { decisionIntent: "select_for_requirement", signals, reference };
  }
  if (SELECTION_LANGUAGE.test(normalizedMessage) && optionIds.length === 0) {
    return { decisionIntent: "ambiguous_selection", signals, reference };
  }
  if (
    EXPLORATORY_COMPARISON.test(normalizedMessage) &&
    (explicitlyNamedEntities(message).length >= 2 ||
      hasTwoResolvedOptions ||
      EXPLICIT_HISTORY_REFERENCE.test(normalizedMessage))
  ) {
    return { decisionIntent: "compare_options", signals, reference };
  }
  if (EXPLORATORY_COMPARISON.test(normalizedMessage)) {
    return { decisionIntent: "compare_options", signals, reference };
  }
  if (isMiraContextualComparisonFollowUp(normalizedMessage)) {
    return { decisionIntent: "compare_options", signals, reference };
  }
  return { decisionIntent: "none", signals, reference };
};

const selectionAnswer = (entities, signals) => {
  if (entities.length > 1) {
    return [
      "Your requirements map to more than one grounded OneSmarter offering:",
      ...entities.map((entity) => {
        const signal = signals.find((candidate) => candidate.optionId === entity.id);
        return `- ${entity.label}: ${signal?.reason || "This offering matches part of the stated need."}`;
      }),
      "Both offerings are relevant because the current request includes distinct workflows.",
    ].join("\n");
  }
  const entity = entities[0];
  const entry = matchedEntriesForConversationEntities([entity])[0];
  const signal = signals.find((candidate) => candidate.optionId === entity.id);
  return [
    "Recommended option:",
    entity.label,
    "",
    "Why it fits:",
    `- ${signal?.reason || entry?.approvedSummary || ""}`,
    ...(entry?.allowedClaims || []).slice(0, 3).map((claim) => `- ${claim}`),
  ].join("\n");
};

export const resolveMiraDecisionRequest = (
  message = "",
  conversationHistory = [],
) => {
  const classification = classifyMiraDecisionIntent(
    message,
    conversationHistory,
  );
  if (
    !["select_for_requirement", "multi_need"].includes(
      classification.decisionIntent,
    )
  ) {
    return null;
  }
  const entities = uniqueEntities(
    classification.signals
      .map((signal) =>
        groundedConversationEntityForId(signal.optionId, {
          level: nestedIds.has(signal.optionId) ? 1 : 0,
        }),
      )
      .filter(Boolean),
  );
  const matchedEntries = matchedEntriesForConversationEntities(entities);
  const options = entities.map(({ id, label, type }) => ({ id, label, type }));
  return {
    decisionIntent: classification.decisionIntent,
    recommendation: {
      status: "recommended",
      primaryOption: options[0] || null,
      reasons: classification.signals.map((signal) => signal.reason),
      alternatives: options.slice(1),
      missingInformation: [],
    },
    entities,
    matchedEntries,
    answer: selectionAnswer(entities, classification.signals),
  };
};

export const resolveMiraComparison = (message = "", conversationHistory = []) => {
  const classification = classifyMiraDecisionIntent(
    message,
    conversationHistory,
  );
  if (
    !["compare_options", "ambiguous_selection"].includes(
      classification.decisionIntent,
    )
  ) {
    return null;
  }
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

  const reference = classification.reference;
  const contextualInstruction = isMiraContextualComparisonFollowUp(message);
  const contextualFollowUp = contextualInstruction
    ? latestComparisonContext(conversationHistory)
    : null;
  const explicitContextualTarget = message.match(
    /\bcompare it (?:with|to)\s+(?!(?:another|a different|different|something else|a new|new)\b)([^.!?]+)/i,
  )?.[1];
  const commandOnlyContextualInstruction =
    contextualInstruction &&
    (/^\s*(?:choose|pick|select|use|try)\b/i.test(message) ||
      /\bcompare it (?:with|to)\b/i.test(message) ||
      /^\s*(?:another|different|something else)(?:\s+(?:one|option|service|platform|offering))?[.!?]*\s*$/i.test(
        message,
      ));
  const fuzzyResolution =
    commandOnlyContextualInstruction && !explicitContextualTarget
      ? { matches: [], issues: [] }
      : resolveMiraComparisonEntities(message);
  const named = uniqueEntities(
    fuzzyResolution.matches.map((match) => match.entity),
  );
  const correctionEntityResolution =
    /\b(?:no|instead).+\buse .+ as (?:the )?second option\b/i.test(message)
      ? resolveMiraEntityText(message)
      : null;
  const correctionNamed =
    named.length || correctionEntityResolution?.status !== "resolved"
      ? named
      : [correctionEntityResolution.match.entity];
  const contextualOverride =
    contextualFollowUp &&
    correctionNamed.length === 1 &&
    correctionNamed[0].id !== contextualFollowUp.anchor.id
      ? [contextualFollowUp.anchor, correctionNamed[0]]
      : [];
  const assistantSelection = selectAssistantComparisonCandidate(
    contextualFollowUp
      ? `${contextualFollowUp.previousMessage} ${message}`
      : message,
    contextualFollowUp && !contextualOverride.length
      ? [contextualFollowUp.anchor]
      : correctionNamed,
    contextualFollowUp
      ? { excludedIds: [contextualFollowUp.replaceable.id] }
      : undefined,
  );
  if (
    contextualFollowUp &&
    !assistantSelection &&
    !contextualOverride.length
  ) {
    const type =
      requestedCandidateType(
        `${contextualFollowUp.previousMessage} ${message}`,
      ) || contextualFollowUp.anchor.type;
    const matchedEntries = matchedEntriesForConversationEntities([
      contextualFollowUp.anchor,
    ]);
    const answer = `I don't have another sufficiently relevant approved ${type.replaceAll("_", " ")} to compare in this context.`;
    return {
      comparison: {
        status: "insufficient_evidence",
        options: [],
        sharedCapabilities: [],
        keyDifferences: [],
        decisionGuidance: answer,
        evidenceGaps: [`Another grounded ${type.replaceAll("_", " ")} candidate`],
      },
      entities: [contextualFollowUp.anchor],
      matchedEntries,
      answer,
    };
  }
  const referenced =
    reference.kind === "resolved" &&
    (reference.entities.length > 1 || reference.ordinalReference)
      ? reference.entities
      : [];
  const latestComparisonEntities = [...conversationHistory]
    .reverse()
    .find(
      (turn) =>
        turn?.role === "assistant" && turn.conversationEntities?.length >= 2,
    )?.conversationEntities;
  const groundedLatestComparisonEntities = uniqueEntities(
    (latestComparisonEntities || [])
      .map((entity) =>
        groundedConversationEntityForId(entity.id, {
          level: nestedIds.has(entity.id) ? 1 : 0,
          position: entity.position,
        }),
      )
      .filter(Boolean),
  );
  const signals = classification.signals;
  const correctionEntities =
    /\b(?:no|instead).+\buse .+ as (?:the )?second option\b/i.test(message) &&
    correctionNamed.length === 1 &&
    (referenced.length >= 2 || groundedLatestComparisonEntities.length >= 2)
      ? [
          (referenced.length >= 2
            ? referenced
            : groundedLatestComparisonEntities)[0],
          correctionNamed[0],
        ]
      : [];
  const mixedReferenceEntities =
    correctionNamed.length === 1 && referenced.length === 1
      ? (() => {
          const normalizedMessage = normalize(message);
          const namedIndex = normalizedMessage.indexOf(
            normalize(correctionNamed[0].label),
          );
          const ordinalIndex = normalizedMessage.search(
            /\b(?:first|second|third|fourth|1st|2nd|3rd|4th)\b/,
          );
          return namedIndex >= 0 && namedIndex < ordinalIndex
            ? [correctionNamed[0], referenced[0]]
            : [referenced[0], correctionNamed[0]];
        })()
      : [];
  let entities = uniqueEntities(
    contextualOverride.length
      ? contextualOverride
      : correctionEntities.length
      ? correctionEntities
      : mixedReferenceEntities.length
        ? mixedReferenceEntities
      : assistantSelection?.entities ||
        (correctionNamed.length >= 2 ? correctionNamed : referenced),
  );
  const historyText = conversationHistory
    .slice(-4)
    .map((turn) => turn?.content || "")
    .join(" ");
  const historyHasBothPlatforms =
    /secure ticketing/i.test(historyText) && /bill audit/i.test(historyText);
  const asksForPlatformPair =
    /\b(?:both platforms|the two|one or both|your platforms)\b/i.test(message) ||
    (historyHasBothPlatforms && EXPLICIT_HISTORY_REFERENCE.test(message));

  if (entities.length < 2 && asksForPlatformPair) {
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

  if (
    fuzzyResolution.issues.length &&
    entities.length < 2 &&
    !assistantSelection &&
    !correctionEntities.length &&
    !referenced.length &&
    !(signals.length >= 2 && /\bcompare both\b/i.test(message))
  ) {
    const recognizedEntities = uniqueEntities(
      fuzzyResolution.matches.map((match) => match.entity),
    );
    const matchedEntries =
      matchedEntriesForConversationEntities(recognizedEntities);
    const likelyOptions = fuzzyResolution.issues
      .flatMap((issue) => issue.candidates || [])
      .map((candidate) => candidate.label)
      .filter((label, index, labels) => labels.indexOf(label) === index)
      .slice(0, 4);
    const unresolvedLabels = fuzzyResolution.issues
      .map((issue) => `"${issue.operand}"`)
      .join(" and ");
    const hasRecognizedEntity = recognizedEntities.length > 0;
    const answer = hasRecognizedEntity
      ? `I recognized ${recognizedEntities.map((entity) => entity.label).join(" and ")}, but the approved knowledge base does not establish an offering for ${unresolvedLabels}.`
      : likelyOptions.length
        ? `I could not resolve that comparison confidently. Did you mean ${likelyOptions.join(", or ")}?`
        : `I could not resolve ${unresolvedLabels} to approved OneSmarter offerings. Which platforms or services would you like me to compare?`;
    return {
      comparison: {
        status: hasRecognizedEntity
          ? "insufficient_evidence"
          : "needs_clarification",
        options: recognizedEntities.map((entity) =>
          optionMetadata(
            entity,
            matchedEntries.find((entry) =>
              entity.sourceIds?.includes(entry.id),
            ),
          ),
        ),
        sharedCapabilities: [],
        keyDifferences: [],
        decisionGuidance: answer,
        evidenceGaps: fuzzyResolution.issues.map(
          (issue) => `Approved offering match for ${issue.operand}`,
        ),
      },
      entities: recognizedEntities,
      matchedEntries,
      answer,
    };
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
  const missingApprovedEvidence = entities.some(
    (entity) =>
      !matchedEntries.some((entry) => entity.sourceIds?.includes(entry.id)),
  );
  if (missingApprovedEvidence) {
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
  const matchedSignals =
    classification.decisionIntent === "compare_options" && signals.length < 2
      ? []
      : signals.filter((signal) =>
          options.some((option) => option.id === signal.optionId),
        );
  const contextualCandidate = assistantSelection
    ? options.find((option) => {
        const tags = profileFor(option.id)?.tags || [];
        return recommendationContextTagsFor(message).some((tag) =>
          tags.includes(tag),
        );
      })
    : null;
  const decisionGuidance = contextualCandidate
    ? `Based on the stated context, ${contextualCandidate.label} is the stronger grounded match. It is suited when the need is ${profileFor(contextualCandidate.id)?.boundary}.`
    : matchedSignals.length === 1
      ? `${matchedSignals[0].reason} Based on that stated need, ${options.find((option) => option.id === matchedSignals[0].optionId)?.label} is the stronger grounded match.`
      : matchedSignals.length > 1
        ? `The stated needs map to both ${matchedSignals
            .map(
              (signal) =>
                options.find((option) => option.id === signal.optionId)?.label,
            )
            .filter(Boolean)
            .join(" and ")}; one option should not be forced when both workflows remain in scope.`
        : assistantSelection
          ? `Choose ${options[0].label} when the need is ${profileFor(options[0].id)?.boundary}; choose ${options[1].label} when the need is ${profileFor(options[1].id)?.boundary}.`
          : "Neither option is automatically better; the practical choice depends on the workflow and capabilities you need.";
  const keyDifferences = options.map(
    (option) => {
      const boundary = profileFor(option.id)?.boundary;
      return boundary
        ? `${option.label}: ${boundary}`
        : `${option.label} is a ${option.type.replaceAll("_", " ")} focused on ${knowledgeById.get(option.id)?.approvedSummary || "its approved purpose"}`;
    },
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
    assistantSelectedCandidate: assistantSelection
      ? {
          id: assistantSelection.selectedCandidate.id,
          label: assistantSelection.selectedCandidate.label,
          reason: assistantSelection.reason,
        }
      : null,
    answer: assistantSelection
      ? answerForAssistantSelection(entities, assistantSelection, comparison)
      : answerForComparison(comparison),
  };
};

export default resolveMiraComparison;

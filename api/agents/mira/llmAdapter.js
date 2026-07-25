import {
  runMiraLocalHarness,
  runMiraSafetyGate,
} from "../../../src/data/agentKnowledge/miraLocalEngine.js";
import { runOpenAiMiraAdapter } from "./openAiAdapter.js";
import { buildMiraPromptPayload } from "./miraPromptContract.js";
import { validateMiraModelOutput } from "./miraOutputValidator.js";
import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
  resolveMiraConversationReference,
} from "./miraConversationReferences.js";
import {
  isExplicitMiraComparisonRequest,
  resolveMiraRecommendation,
} from "./miraRecommendations.js";
import {
  classifyMiraDecisionIntent,
  isMiraComparisonIntent,
  resolveMiraComparison,
  resolveMiraDecisionRequest,
} from "./miraComparisons.js";
import { resolveMiraEntityText } from "./miraEntityResolver.js";

export const LOCAL_HARNESS_MODE = "local_harness_mock";
const STAGING_LLM_MODE = "staging_llm";
const HARD_STOP_RISK_FLAGS = new Set([
  "phi_or_confidential_data",
  "legal_advice",
  "medical_advice",
  "compliance_guarantee",
  "prompt_injection",
  "business_specific_review",
]);

const unavailableResponse = (message) => ({
  question: message,
  normalizedQuestion: "",
  riskFlags: [],
  confidence: "low",
  matchedEntries: [],
  answerSeed:
    "Mira is not available right now. For business inquiries, email care@onesmarter.com.",
  handoffNeeded: true,
  handoffReason: "llm_mode_off",
  suggestedFollowUps: ["Email care@onesmarter.com for business follow-up."],
  mode: "off",
  fallbackUsed: false,
  fallbackReason: "",
});

const withFallbackMetadata = (localResult, fallbackReason, providerResult = {}) => ({
  ...localResult,
  mode: LOCAL_HARNESS_MODE,
  fallbackUsed: true,
  fallbackReason,
  providerMetadata: providerResult.metadata
    ? {
        latencyMs: providerResult.metadata.latencyMs ?? null,
        httpStatus: providerResult.metadata.httpStatus ?? null,
        tokenUsage: providerResult.metadata.tokenUsage ?? null,
        providerStatus: providerResult.metadata.providerStatus || "",
        providerErrorType: providerResult.metadata.providerErrorType || "",
        providerErrorCode: providerResult.metadata.providerErrorCode || "",
        providerErrorParam: providerResult.metadata.providerErrorParam || "",
        providerRequestId: providerResult.metadata.providerRequestId || "",
        providerResponseStatus: providerResult.metadata.providerResponseStatus || "",
        providerIncompleteReason: providerResult.metadata.providerIncompleteReason || "",
        providerOutputItemTypes: providerResult.metadata.providerOutputItemTypes || [],
        providerContentPartTypes: providerResult.metadata.providerContentPartTypes || [],
        providerHasRefusal: Boolean(providerResult.metadata.providerHasRefusal),
        providerUsageInputTokens: providerResult.metadata.providerUsageInputTokens ?? null,
        providerUsageOutputTokens: providerResult.metadata.providerUsageOutputTokens ?? null,
        providerUsageReasoningTokens: providerResult.metadata.providerUsageReasoningTokens ?? null,
      }
    : undefined,
  providerErrorType: providerResult.metadata?.providerErrorType || "",
  providerErrorCode: providerResult.metadata?.providerErrorCode || "",
  providerErrorParam: providerResult.metadata?.providerErrorParam || "",
  providerResponseStatus: providerResult.metadata?.providerResponseStatus || "",
  providerIncompleteReason: providerResult.metadata?.providerIncompleteReason || "",
  providerOutputItemTypes: providerResult.metadata?.providerOutputItemTypes || [],
  providerContentPartTypes: providerResult.metadata?.providerContentPartTypes || [],
  providerHasRefusal: Boolean(providerResult.metadata?.providerHasRefusal),
  providerUsageInputTokens: providerResult.metadata?.providerUsageInputTokens ?? null,
  providerUsageOutputTokens: providerResult.metadata?.providerUsageOutputTokens ?? null,
  providerUsageReasoningTokens: providerResult.metadata?.providerUsageReasoningTokens ?? null,
});

const hasHardStopRisk = (riskFlags = []) =>
  riskFlags.some((riskFlag) => HARD_STOP_RISK_FLAGS.has(riskFlag));

const hasClaimBoundaryRisk = (riskFlags = []) =>
  riskFlags.includes("hipaa_claim_boundary") || riskFlags.includes("soc2_claim_boundary");

const hasOutOfScopeRisk = (riskFlags = []) => riskFlags.includes("out_of_scope");

const hasApprovedContext = (localResult) =>
  Array.isArray(localResult?.matchedEntries) &&
  localResult.matchedEntries.length > 0 &&
  localResult.confidence !== "low";

const recentHistoryText = (conversationHistory = []) =>
  conversationHistory
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join(" ")
    .toLowerCase();

const recentUserHistoryText = (conversationHistory = []) =>
  conversationHistory
    .slice(-6)
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .join(" ")
    .toLowerCase();

const SENSITIVE_SUBMISSION_INTENT_PATTERN =
  /\b(upload|attach|paste|send|share|provide|submit|process|analyze|analyse|review|compare|store|transmit|here are)\b/i;
const SENSITIVE_DATA_PATTERN =
  /\b(phi|patient information|patient (?:files?|records?|data)|claims?\s+(files?|data|info|information|records?|number)|claim number|confidential\s+(documents?|client documents?|files?|data|information|records?)|private operational\s+(data|details|records?)|credentials?|vendor contract)\b/i;

const hasSensitiveDataSubmissionIntent = (text = "") =>
  SENSITIVE_SUBMISSION_INTENT_PATTERN.test(text) && SENSITIVE_DATA_PATTERN.test(text);

const isComparisonIntent = (message = "") =>
  isExplicitMiraComparisonRequest(message);

const isBroadPlatformQuestion = (message = "") =>
  isComparisonIntent(message) || /\b(two platforms|all platforms|platforms)\b/i.test(message);

const historyHasPlatformOptions = (conversationHistory = []) => {
  const history = recentHistoryText(conversationHistory);
  return (
    (/\bsecure ticketing\b|\bcase management\b/.test(history) &&
      /\bbill audit\b|\bbill pay\b/.test(history)) ||
    /\b(two|both) platforms?\b/.test(history)
  );
};

const historyHasKnownApprovedTopic = (conversationHistory = []) =>
  /\bsecure ticketing\b|\bcase management\b|\bbill audit\b|\bbill pay\b|\bsoc\s*2\b|\bsoc2\b|\bhipaa\b|\bclaims processing\b|\bai agentic\b|\bmira\b/.test(
    recentHistoryText(conversationHistory),
  );

const referencesPriorContext = (message = "") =>
  /\b(that|it|this|those|they|them|which one|the first one|the second one|first option|second option|tell me more|what about|why does that matter|how is that different|previous|above|same one)\b/i.test(
    message,
  );

const needsFollowUpClarification = (message = "", conversationHistory = []) => {
  const normalizedMessage = String(message).toLowerCase();
  if (!referencesPriorContext(normalizedMessage)) return false;

  const asksForOption =
    /\b(which one|first one|second one|first option|second option|how is that different)\b/.test(
      normalizedMessage,
    );
  if (asksForOption && !historyHasPlatformOptions(conversationHistory)) return true;

  if (!conversationHistory.length && referencesPriorContext(normalizedMessage)) return true;
  if (!historyHasKnownApprovedTopic(conversationHistory)) return true;
  return false;
};

const resolveActiveSubject = (message = "", conversationHistory = []) => {
  const normalizedMessage = String(message).toLowerCase();
  const history = recentHistoryText(conversationHistory);

  if (
    historyHasPlatformOptions(conversationHistory) &&
    /\b(first one|first option|first platform)\b/.test(normalizedMessage)
  ) {
    return "secure-ticketing-case-management";
  }
  if (
    historyHasPlatformOptions(conversationHistory) &&
    /\b(second one|second option|second platform|other platform)\b/.test(normalizedMessage)
  ) {
    return "bill-audit-bill-pay";
  }
  if (isBroadPlatformQuestion(normalizedMessage)) return "";
  if (!referencesPriorContext(normalizedMessage)) {
    return "";
  }

  const recentTurns = conversationHistory.slice(-4).reverse();
  for (const turn of recentTurns) {
    const content = String(turn?.content || "").toLowerCase();
    if (/\bsoc\s*2\b|\bsoc2\b/.test(content)) return "soc2-attested";
    if (/\bbill audit\b|\bbill pay\b/.test(content)) {
      return "bill-audit-bill-pay";
    }
    if (/\bsecure ticketing\b|\bcase management\b/.test(content)) {
      return "secure-ticketing-case-management";
    }
  }

  if (/\bsoc\s*2\b|\bsoc2\b/.test(history)) return "soc2-attested";
  if (/\bbill audit\b|\bbill pay\b/.test(history)) return "bill-audit-bill-pay";
  if (/\bsecure ticketing\b|\bcase management\b/.test(history)) {
    return "secure-ticketing-case-management";
  }
  return "";
};

const answerSeedForEntries = (matchedEntries = []) => {
  const primary = matchedEntries[0];
  if (!primary) return "";
  const facts = (primary.sourceFacts || []).slice(0, 2).join(" ");
  const relatedText =
    matchedEntries.length > 1
      ? ` Related approved topics: ${matchedEntries
          .slice(1, 3)
          .map((entry) => entry.title)
          .join(", ")}.`
      : "";
  return `${primary.approvedSummary} ${facts}${relatedText} ${primary.handoffGuidance}`.trim();
};

const entityTypeLabel = (type = "entity") =>
  ({
    platform: "Platform",
    service: "Service",
    service_category: "Service category",
    use_case: "Use case",
    capability: "Capability",
    industry: "Industry",
  })[type] || "Offering";

const comparisonAnswerSeedForEntities = (entities = [], matchedEntries = []) =>
  [
    "Here is a grounded comparison of the selected OneSmarter offerings:",
    ...entities.flatMap((entity) => {
      const entry = matchedEntries.find((candidate) =>
        entity.sourceIds?.includes(candidate.id),
      );
      if (!entry) return [];
      return [
      "",
      `${entity.label} (${entityTypeLabel(entity.type)}):`,
      `- Purpose: ${entry.approvedSummary}`,
      ...(entry.sourceFacts || []).slice(0, 2).map((fact) => `- ${fact}`),
      `- Suitable when the visitor's needs align with this ${entityTypeLabel(entity.type).toLowerCase()}'s approved purpose and capabilities.`,
      ];
    }),
    "",
    `Key difference: ${entities
      .map((entity) => `${entity.label} is a ${entityTypeLabel(entity.type).toLowerCase()}`)
      .join("; ")}.`,
  ]
    .filter((line, index) => line || index > 0)
    .join("\n");

const listAnswerSeedForEntities = (entities = [], matchedEntries = []) =>
  [
    "The grounded items in that group are:",
    ...entities.flatMap((entity, index) => [
      `${index + 1}. ${entity.label} (${entityTypeLabel(entity.type)})`,
      ...(entity.children || []).map(
        (child) => `   - ${child.label} (${entityTypeLabel(child.type)})`,
      ),
    ]),
    "",
    ...matchedEntries.map((entry) => `${entry.title}: ${entry.approvedSummary}`),
  ].join("\n");

const withResolvedConversationEntities = (
  localResult,
  referenceResolution,
) => {
  const matchedEntries = matchedEntriesForConversationEntities(
    referenceResolution.entities,
  );
  if (!matchedEntries.length) return localResult;
  return {
    ...localResult,
    confidence: "high",
    matchedEntries,
    answerSeed: referenceResolution.isList
      ? listAnswerSeedForEntities(referenceResolution.entities, matchedEntries)
      : referenceResolution.isComparison
      ? comparisonAnswerSeedForEntities(
          referenceResolution.entities,
          matchedEntries,
        )
      : `${matchedEntries[0].title}: ${answerSeedForEntries(matchedEntries)}`,
    suggestedFollowUps: matchedEntries
      .flatMap((entry) => entry.relatedQuestions || [])
      .slice(0, 3),
    resolvedConversationEntities: referenceResolution.entities,
    answerStructureKind: referenceResolution.isComparison
      ? "comparison"
      : referenceResolution.isList
        ? "list"
        : "",
  };
};

const withMainOfferingEntities = (localResult) => {
  const entities = [
    "secure-ticketing-case-management",
    "bill-audit-bill-pay",
    "technology-solutions-overview",
  ]
    .map(groundedConversationEntityForId)
    .filter(Boolean);
  const matchedEntries = matchedEntriesForConversationEntities(entities);
  return {
    ...localResult,
    confidence: "high",
    matchedEntries,
    answerSeed: [
      "OneSmarter's main offerings are:",
      ...entities.flatMap((entity, index) => [
        `${index + 1}. ${entity.label} (${entityTypeLabel(entity.type)})`,
        ...(entity.children || []).map(
          (child) => `   - ${child.label} (${entityTypeLabel(child.type)})`,
        ),
      ]),
      "",
      ...matchedEntries.map((entry) => `${entry.title}: ${entry.approvedSummary}`),
    ].join("\n"),
    resolvedConversationEntities: entities,
    answerStructureKind: "offering-list",
    answerStructureIntroduction: "OneSmarter's main offerings are:",
  };
};

const withPlatformEntities = (localResult) => {
  const entities = [
    "secure-ticketing-case-management",
    "bill-audit-bill-pay",
  ]
    .map(groundedConversationEntityForId)
    .filter(Boolean);
  const matchedEntries = matchedEntriesForConversationEntities(entities);
  return {
    ...localResult,
    confidence: "high",
    matchedEntries,
    answerSeed: [
      "OneSmarter offers two platforms:",
      ...entities.map(
        (entity, index) =>
          `${index + 1}. ${entity.label} (${entityTypeLabel(entity.type)})`,
      ),
      "",
      "Broader services are also available under Technology Solutions.",
      "",
      ...matchedEntries.map(
        (entry) => `${entry.title}: ${entry.approvedSummary}`,
      ),
    ].join("\n"),
    resolvedConversationEntities: entities,
    answerStructureKind: "platform-list",
    answerStructureIntroduction: "OneSmarter offers two purpose-built platforms.",
    answerStructureImportantNote:
      "Broader services are also available under Technology Solutions.",
    answerStructureFollowUpQuestion:
      "Would you like help choosing between these two platforms?",
  };
};

const naturalHandoff =
  "For platform-level security, procurement, contractual, implementation, or supporting-evidence questions, contact care@onesmarter.com.";

const comparisonAnswerSeedFor = () =>
  [
    "Here is the practical difference between OneSmarter's two platform offerings for a healthcare organization.",
    "",
    "Secure Ticketing and Case Management:",
    "- Built for HIPAA-regulated workflows and PHI-sensitive operations.",
    "- Supports secure intake, role-based access, audit history, controlled communication, workflow tracking, and accountable issue resolution.",
    "- Best fit when the need is case management, issue tracking, controlled communication, or workflow accountability.",
    "",
    "Bill Audit & Bill Pay:",
    "- Helps organizations review vendor bills, analyze recurring expenses, identify discrepancies, coordinate approvals, and support payment workflows.",
    "- Supports telecom expense management as a use case, including bill analysis, contract and rate comparison, historical usage review, and cost-control reporting.",
    "- Best fit when the need is vendor-expense review, recurring bill analysis, discrepancy tracking, approvals, or payment workflow support.",
    "",
    "Key difference: Secure Ticketing and Case Management is centered on secure operational case workflows; Bill Audit & Bill Pay is centered on financial and vendor-expense workflows.",
    naturalHandoff,
  ]
    .filter(Boolean)
    .join("\n");

const withPlatformComparisonContext = (localResult) => {
  const secureEntry = localResult.matchedEntries.find(
    (entry) => entry.id === "secure-ticketing-case-management",
  );
  const billEntry = localResult.matchedEntries.find((entry) => entry.id === "bill-audit-bill-pay");

  if (!secureEntry || !billEntry) return localResult;

  const matchedEntries = [
    { ...secureEntry, score: Math.max(secureEntry.score, 45) },
    { ...billEntry, score: Math.max(billEntry.score, 45) },
  ];

  return {
    ...localResult,
    confidence: "high",
    matchedEntries,
    answerSeed: comparisonAnswerSeedFor(),
    suggestedFollowUps: [
      "Tell me more about Secure Ticketing and Case Management.",
      "Tell me more about Bill Audit & Bill Pay.",
      "How should I contact OneSmarter?",
    ],
    answerStructureKind: "comparison",
  };
};

const withActiveSubjectPriority = (localResult, activeSubject) => {
  if (!activeSubject) return localResult;
  const activeEntry = localResult.matchedEntries.find((entry) => entry.id === activeSubject);
  if (!activeEntry) return localResult;

  const matchedEntries = [
    { ...activeEntry, score: Math.max(activeEntry.score, 40) },
    ...localResult.matchedEntries
      .filter(
        (entry) =>
          entry.id !== activeSubject &&
          !["secure-ticketing-case-management", "bill-audit-bill-pay"].includes(entry.id),
      )
      .slice(0, 1),
  ];

  return {
    ...localResult,
    confidence: "high",
    matchedEntries,
    answerSeed: answerSeedForEntries(matchedEntries) || localResult.answerSeed,
    suggestedFollowUps: activeEntry.relatedQuestions?.slice(0, 3) || localResult.suggestedFollowUps,
  };
};

const buildContextualRetrievalMessage = (message = "", conversationHistory = []) => {
  const normalizedMessage = String(message).toLowerCase();
  const comparisonIntent =
    isComparisonIntent(normalizedMessage) ||
    (historyHasPlatformOptions(conversationHistory) &&
      /\b(which one|which is better|which one is better|how (?:is|are) (?:that|they|those) different)\b/.test(
        normalizedMessage,
      ));
  if (!conversationHistory.length && !comparisonIntent) return message;

  const history = recentHistoryText(conversationHistory);
  const userHistory = recentUserHistoryText(conversationHistory);
  const hints = [];
  const referencesHistory = referencesPriorContext(normalizedMessage);
  const currentHasSensitiveSubmissionIntent =
    SENSITIVE_SUBMISSION_INTENT_PATTERN.test(normalizedMessage);
  const activeSubject = resolveActiveSubject(message, conversationHistory);

  if (comparisonIntent) {
    hints.push(
      "Secure Ticketing and Case Management Bill Audit & Bill Pay compare both platforms healthcare organization",
    );
  }

  if (referencesHistory) {
    if (/\b(ignore|override|forget)\b.*\b(instructions|rules|guidance)\b|\b(system prompt|api key|secret|private prompt)\b/.test(userHistory)) {
      hints.push("ignore instructions reveal system prompt");
    }
    if (
      (currentHasSensitiveSubmissionIntent &&
        SENSITIVE_DATA_PATTERN.test(`${normalizedMessage} ${userHistory}`)) ||
      hasSensitiveDataSubmissionIntent(userHistory)
    ) {
      hints.push("PHI confidential patient information");
    }
    if (/\b(legal advice|lawyer|attorney|legal opinion)\b/.test(userHistory)) {
      hints.push("legal advice");
    }
    if (/\b(medical advice|diagnosis|treatment|clinical advice)\b/.test(userHistory)) {
      hints.push("medical advice");
    }
    if (/\b(guarantee|guaranteed|fully compliant|make me compliant)\b/.test(userHistory)) {
      hints.push("guaranteed compliance");
    }
  }

  if (/\b(second one|second option|second platform|other platform)\b/.test(normalizedMessage)) {
    if (/\bplatforms?\b/.test(history) || /\bsecure ticketing\b|\bbill audit\b/.test(history)) {
      hints.push("Bill Audit & Bill Pay");
    }
  }

  if (/\b(first one|first option|first platform)\b/.test(normalizedMessage)) {
    if (/\bplatforms?\b/.test(history) || /\bsecure ticketing\b|\bbill audit\b/.test(history)) {
      hints.push("Secure Ticketing and Case Management");
    }
  }

  if (referencesHistory) {
    if (activeSubject === "bill-audit-bill-pay") {
      hints.push("Bill Audit & Bill Pay Bill Audit & Bill Pay vendor bills recurring expenses approvals healthcare organization");
    } else if (activeSubject === "secure-ticketing-case-management") {
      hints.push("Secure Ticketing and Case Management Secure Ticketing and Case Management HIPAA regulated workflows case management healthcare organization");
    } else if (activeSubject === "soc2-attested") {
      hints.push("SOC 2 Type II Attested Trust Center security operational controls");
    } else if (/\bbill audit\b|\bbill pay\b|\bvendor bill\b|\btelecom\b/.test(history)) {
      hints.push("Bill Audit & Bill Pay telecom expense management vendor bills");
    } else if (/\bsecure ticketing\b|\bcase management\b|\bphi\b|\bhipaa\b/.test(history)) {
      hints.push("Secure Ticketing and Case Management HIPAA regulated workflows");
    } else if (/\bsoc\s*2\b|\bsoc2\b/.test(history)) {
      hints.push("SOC 2 Type II Attested Trust Center");
    } else if (/\bhipaa\b/.test(history)) {
      hints.push("HIPAA Security Rule Compliance Assessment Completed Trust Center");
    } else if (/\bai agentic\b|\bai agents?\b|\bmira\b/.test(history)) {
      hints.push("AI Agentic Services Mira AI agents");
    } else if (/\bclaims processing\b|\bhealthcare\b|\btpa\b/.test(history)) {
      hints.push("Claims Processing Services healthcare TPA technology");
    }
  }

  if (/\b(contact|email|reach|talk|follow up)\b/.test(normalizedMessage)) {
    hints.push("Contact care@onesmarter.com");
  }

  return hints.length ? `${message} ${[...new Set(hints)].join(" ")}` : message;
};

const withClaimBoundaryMetadata = (localResult) => ({
  ...localResult,
  mode: LOCAL_HARNESS_MODE,
  handoffNeeded: false,
  handoffReason: "",
  fallbackUsed: true,
  fallbackReason: "pre_call_claim_boundary",
});

const normalizeModelHandoff = (modelOutput, localResult) => {
  if (localResult.handoffNeeded || hasHardStopRisk(localResult.riskFlags)) {
    return {
      handoffNeeded: true,
      handoffReason: modelOutput.handoffReason || localResult.handoffReason || "handoff_required",
    };
  }

  if (
    modelOutput.groundingStatus === "insufficient_context" ||
    modelOutput.groundingStatus === "refused"
  ) {
    return {
      handoffNeeded: modelOutput.handoffNeeded,
      handoffReason: modelOutput.handoffReason || "",
    };
  }

  return {
    handoffNeeded: false,
    handoffReason: "",
  };
};

export const runMiraResponseAdapter = async ({
  message,
  conversationId,
  persona,
  memoryTheme,
  empathyState,
  conversationHistory = [],
  config,
  localHarness = runMiraLocalHarness,
  openAiAdapter = runOpenAiMiraAdapter,
} = {}) => {
  if (config?.mode === "off") {
    return unavailableResponse(message);
  }

  const safetyResult = runMiraSafetyGate(message);
  if (safetyResult) {
    return withFallbackMetadata(safetyResult, "pre_call_safety_gate");
  }

  const directEntityRequest =
    /\b(?:tell me about|what (?:is|are)|explain|describe)\b/i.test(message);
  const directEntityResolution = directEntityRequest
    ? resolveMiraEntityText(message)
    : null;
  const referenceResolution = resolveMiraConversationReference(
    message,
    conversationHistory,
  );
  const retrievalMessage = buildContextualRetrievalMessage(message, conversationHistory);
  const activeSubject = resolveActiveSubject(message, conversationHistory);
  const comparisonIntent =
    isMiraComparisonIntent(message) ||
    isComparisonIntent(message) ||
    (historyHasPlatformOptions(conversationHistory) &&
      /\b(which one|which is better|which one is better|how (?:is|are) (?:that|they|those) different)\b/i.test(
        message,
      ));
  const initialLocalResult = {
    ...localHarness(retrievalMessage),
    question: message,
  };
  const recommendationResolution = resolveMiraRecommendation(
    message,
    conversationHistory,
  );
  const comparisonResolution = resolveMiraComparison(
    message,
    conversationHistory,
  );
  const decisionResolution = resolveMiraDecisionRequest(
    message,
    conversationHistory,
  );
  let localResult = comparisonIntent
    ? withPlatformComparisonContext(initialLocalResult)
    : withActiveSubjectPriority(initialLocalResult, activeSubject);

  if (decisionResolution && !localResult.riskFlags.length) {
    localResult = {
      ...localResult,
      confidence: "high",
      matchedEntries: decisionResolution.matchedEntries,
      answerSeed: decisionResolution.answer,
      handoffNeeded: false,
      handoffReason: "",
      suggestedFollowUps: [],
      recommendation: decisionResolution.recommendation,
      resolvedConversationEntities: decisionResolution.entities,
      recommendationHandled: true,
      clarificationNeeded: false,
      answerStructureKind: "recommendation",
      decisionIntent: decisionResolution.decisionIntent,
    };
  } else if (comparisonResolution && !localResult.riskFlags.length) {
    localResult = {
      ...localResult,
      confidence:
        comparisonResolution.comparison.status === "complete" ? "high" : "low",
      matchedEntries: comparisonResolution.matchedEntries,
      answerSeed: comparisonResolution.answer,
      handoffNeeded: false,
      handoffReason: "",
      suggestedFollowUps: [],
      comparison: comparisonResolution.comparison,
      resolvedConversationEntities: comparisonResolution.entities,
      comparisonHandled: true,
      decisionIntent: classifyMiraDecisionIntent(
        message,
        conversationHistory,
      ).decisionIntent,
      clarificationNeeded:
        comparisonResolution.comparison.status === "needs_clarification",
      answerStructureKind:
        comparisonResolution.comparison.status === "complete"
          ? "comparison"
          : "",
    };
  } else if (
    directEntityResolution?.status === "resolved" &&
    !localResult.riskFlags.length
  ) {
    localResult = withResolvedConversationEntities(localResult, {
      entities: [directEntityResolution.match.entity],
      isComparison: false,
      isList: false,
    });
  } else if (
    referenceResolution.kind === "resolved" &&
    !localResult.riskFlags.length
  ) {
    localResult = withResolvedConversationEntities(
      localResult,
      referenceResolution,
    );
  } else if (
    referenceResolution.kind === "none" &&
    /\b(main platforms|platforms do you offer|your platforms)\b/i.test(message)
  ) {
    localResult = withPlatformEntities(localResult);
  } else if (
    referenceResolution.kind === "none" &&
    /\b(main offerings|offerings do you have|offerings do you offer|your offerings)\b/i.test(
      message,
    )
  ) {
    localResult = withMainOfferingEntities(localResult);
  } else if (
    recommendationResolution &&
    referenceResolution.kind !== "resolved" &&
    !localResult.riskFlags.length
  ) {
    localResult = {
      ...localResult,
      confidence:
        recommendationResolution.recommendation.status === "recommended"
          ? "high"
          : "low",
      matchedEntries: recommendationResolution.matchedEntries,
      answerSeed: recommendationResolution.answer,
      handoffNeeded: false,
      handoffReason: "",
      suggestedFollowUps: [],
      recommendation: recommendationResolution.recommendation,
      relationToPreviousTurn:
        recommendationResolution.topicShift.relationToPreviousTurn,
      requirementState: recommendationResolution.requirementState,
      missingRequirements: recommendationResolution.missingRequirements,
      recommendationReady: recommendationResolution.recommendationReady,
      recommendationReadiness:
        recommendationResolution.recommendationReadiness,
      resolvedConversationEntities: recommendationResolution.entities,
      recommendationHandled: true,
      clarificationNeeded:
        recommendationResolution.recommendation.status ===
        "needs_clarification",
      answerStructureKind:
        recommendationResolution.recommendation.status === "recommended"
          ? "recommendation"
          : "",
    };
  }

  if (
    ((referenceResolution.kind === "clarification" &&
      (referenceResolution.hadEntityContext || !conversationHistory.length)) ||
      needsFollowUpClarification(message, conversationHistory)) &&
    !localResult.riskFlags.length &&
    !localResult.recommendationHandled &&
    !localResult.comparisonHandled
  ) {
    localResult = {
      ...localResult,
      confidence: "low",
      matchedEntries: [],
      answerSeed:
        referenceResolution.clarification ||
        "Which platforms or services would you like me to compare?",
      handoffNeeded: false,
      handoffReason: "",
      suggestedFollowUps: [],
      clarificationNeeded: true,
    };
  }

  if (
    config?.mode === STAGING_LLM_MODE &&
    config?.provider === "openai"
  ) {
    if (localResult.clarificationNeeded) {
      return withFallbackMetadata(localResult, "follow_up_clarification");
    }

    if (hasClaimBoundaryRisk(localResult.riskFlags)) {
      return withClaimBoundaryMetadata(localResult);
    }

    if (!config.providerConfigComplete) {
      return withFallbackMetadata(localResult, "missing_provider_config");
    }

    if (hasOutOfScopeRisk(localResult.riskFlags)) {
      return withFallbackMetadata(localResult, "out_of_scope");
    }

    if (hasHardStopRisk(localResult.riskFlags)) {
      return withFallbackMetadata(localResult, "pre_call_safety_gate");
    }

    if (!hasApprovedContext(localResult)) {
      return withFallbackMetadata(localResult, "no_adequate_approved_context");
    }

    const requestContext = {
      persona: typeof persona === "string" ? persona : "",
      memoryTheme: typeof memoryTheme === "string" ? memoryTheme : "",
      empathyState: typeof empathyState === "string" ? empathyState : "",
      responseGuidance: localResult.comparison
        ? "Provide only the grounded comparison and decision guidance represented by the supplied approved context. Do not invent pricing, integrations, implementation timelines, performance claims, guarantees, or unsupported limitations."
        : localResult.recommendation
        ? "Provide only the grounded recommendation represented by the supplied approved context. Do not invent features, pricing, timelines, integrations, guarantees, or compliance claims."
        : referenceResolution.isComparison
        ? `Compare only these selected grounded entities: ${referenceResolution.entities
            .map((entity) => entity.label)
            .join(" and ")}. Use only the approved context supplied for them.`
        : comparisonIntent
        ? [
            "Return a concise side-by-side comparison with headings for Secure Ticketing and Case Management and Bill Audit & Bill Pay.",
            "Give each platform 2-4 bullets from approved context.",
            "Include a short key-difference summary.",
            "Do not expose source-note wording such as related topics, route guidance, retrieved context, or page language.",
          ].join(" ")
        : "",
    };
    const promptPayload = buildMiraPromptPayload({
      message,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      requestContext,
      conversationHistory,
    });
    const providerResult = await openAiAdapter({
      message,
      conversationId,
      requestContext,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      promptPayload,
      config,
    });

    if (providerResult.error || !providerResult.modelOutput) {
      return withFallbackMetadata(
        localResult,
        providerResult.metadata?.fallbackReason || providerResult.error || "provider_error",
        providerResult,
      );
    }

    const validation = validateMiraModelOutput(providerResult.modelOutput, {
      message,
      riskFlags: localResult.riskFlags,
      localHarnessResult: localResult,
    });

    if (!validation.valid) {
      return withFallbackMetadata(
        localResult,
        `output_validation_failed:${validation.violations.join(",")}`,
      );
    }

    const modelOutput = validation.correctedOutput;
    const normalizedHandoff = normalizeModelHandoff(modelOutput, localResult);
    return {
      ...localResult,
      mode: STAGING_LLM_MODE,
      answerSeed: modelOutput.answer,
      handoffNeeded: normalizedHandoff.handoffNeeded,
      handoffReason: normalizedHandoff.handoffReason,
      suggestedFollowUps: modelOutput.suggestedFollowUps,
      modelProvider: "openai",
      modelName: config.model,
      groundingStatus: modelOutput.groundingStatus,
      outputSafetyStatus: modelOutput.outputSafetyStatus,
      fallbackUsed: false,
      fallbackReason: "",
      providerMetadata: {
        latencyMs: providerResult.metadata?.latencyMs ?? null,
        httpStatus: providerResult.metadata?.httpStatus ?? null,
        tokenUsage: providerResult.metadata?.tokenUsage ?? null,
        providerStatus: providerResult.metadata?.providerStatus || "",
        providerResponseStatus: providerResult.metadata?.providerResponseStatus || "",
        providerIncompleteReason: providerResult.metadata?.providerIncompleteReason || "",
        providerOutputItemTypes: providerResult.metadata?.providerOutputItemTypes || [],
        providerContentPartTypes: providerResult.metadata?.providerContentPartTypes || [],
        providerHasRefusal: Boolean(providerResult.metadata?.providerHasRefusal),
        providerUsageInputTokens: providerResult.metadata?.providerUsageInputTokens ?? null,
        providerUsageOutputTokens: providerResult.metadata?.providerUsageOutputTokens ?? null,
        providerUsageReasoningTokens: providerResult.metadata?.providerUsageReasoningTokens ?? null,
      },
    };
  }

  return {
    ...localResult,
    mode: LOCAL_HARNESS_MODE,
    fallbackUsed: false,
    fallbackReason: "",
  };
};

export default runMiraResponseAdapter;

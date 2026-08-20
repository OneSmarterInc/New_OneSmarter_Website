import {
  groundedConversationEntityForId,
  matchedEntriesForConversationEntities,
} from "./miraConversationReferences.js";

const DIMENSIONS = Object.freeze([
  {
    topicKey: "legacy_modernization",
    goalIds: ["legacy_modernization", "application_support"],
    broadPattern:
      /\b(?:legacy|old|aging) (?:applications?|apps?|systems?)\b|\bapplications?.{0,30}(?:expensive|costly|difficult|hard) to maintain\b/i,
    knownPattern: /\b(?:IBM\s*i|AS\s*\/?\s*400|AS400|custom Java)\b/i,
    factKey: "current_technology",
    preliminaryOfferingIds: [
      "enterprise-software-development",
      "ibm-i-as400-services",
    ],
    question: "What technology do the applications currently run on?",
    reason:
      "The current technology distinguishes broader application modernization from IBM i / AS400-specific services.",
    preliminaryAnswer:
      "Enterprise Software Development is the broadest grounded option for modernizing aging applications. IBM i / AS400 Services may be relevant if the applications run on IBM i / AS400.",
  },
  {
    topicKey: "billing_workflow",
    goalIds: ["vendor_expense_control", "approval_workflow_improvement"],
    broadPattern:
      /\b(?:billing|bill|invoice) (?:problems?|issues?|challenges?)\b|\btoo many billing problems\b/i,
    knownPattern:
      /\b(?:discrepanc(?:y|ies)|approval(?:s| delays?)?|payment coordination|payment workflows?|telecom (?:costs?|expenses?|bills?)|vendor invoice approvals?)\b/i,
    factKey: "primary_bottleneck",
    preliminaryOfferingIds: ["bill-audit-bill-pay"],
    question:
      "Is the main issue invoice discrepancies, approval delays, recurring telecom expenses, or payment coordination?",
    reason:
      "The primary billing bottleneck changes which approved Bill Audit & Bill Pay capability should be emphasized.",
    preliminaryAnswer:
      "Bill Audit & Bill Pay is relevant to bill review, discrepancy tracking, approvals, payment workflows, and telecom expense management use cases.",
  },
  {
    topicKey: "healthcare_workflow",
    goalIds: ["case_workflow_control", "claims_operations_improvement"],
    broadPattern: /\bsecure healthcare (?:workflow|operations?)\b/i,
    knownPattern:
      /\b(?:case (?:tracking|intake|management)|role[- ]based access|audit history|claims? (?:processing|operations?))\b/i,
    factKey: "workflow_type",
    preliminaryOfferingIds: [
      "secure-ticketing-case-management",
      "claims-processing-services",
    ],
    question: "Is your main need secure case tracking or claims-processing operations?",
    reason:
      "The workflow type distinguishes the case-management platform from claims-processing services.",
    preliminaryAnswer:
      "Secure Ticketing and Case Management is relevant for secure case workflows, while Claims Processing Services is separately relevant for claims operations.",
  },
  {
    topicKey: "compliance_readiness",
    goalIds: ["compliance_readiness", "security_evidence"],
    broadPattern:
      /\b(?:demonstrat(?:e|ing)|show|improve|help with)?\s*(?:our )?compliance readiness\b|\bhelp demonstrating compliance\b/i,
    directPattern:
      /\b(?:SOC\s*2|HIPAA|ISO(?:\/IEC)?\s*27001|PCI\s*DSS)\b.{0,30}\breadiness (?:support|help|services?)\b/i,
    knownPattern: /\b(?:SOC\s*2|HIPAA|ISO(?:\/IEC)?\s*27001|PCI\s*DSS)\b/i,
    factKey: "target_compliance_framework",
    preliminaryOfferingIds: ["compliance-cyber-assurance-overview"],
    question: "Which compliance framework is relevant: SOC 2, HIPAA, ISO/IEC 27001, or PCI DSS?",
    reason:
      "The target framework determines which approved readiness evidence is relevant.",
    preliminaryAnswer:
      "OneSmarter's approved content covers readiness support across SOC, HIPAA, ISO/IEC 27001, and PCI DSS contexts without promising certification or guaranteed compliance.",
    directAnswer: (fact) =>
      `${fact} readiness support is included in OneSmarter's approved compliance and cyber-assurance service scope. This is evidence-based readiness support, not a certification or compliance guarantee.`,
  },
  {
    topicKey: "ai_automation",
    goalIds: ["workflow_automation"],
    broadPattern: /\b(?:AI )?(?:automation|automate)\b/i,
    knownPattern:
      /\b(?:document workflows?|human[- ]in[- ]the[- ]loop|human (?:review|approval)|repetitive (?:workflow|tasks?)|decision support)\b/i,
    factKey: "workflow_type",
    preliminaryOfferingIds: ["ai-agentic-services"],
    question: "Which repetitive workflow are you trying to automate?",
    reason:
      "The workflow being automated determines which approved AI Agentic Services capabilities are relevant.",
    preliminaryAnswer:
      "AI Agentic Services is the relevant grounded service area for controlled automation of repetitive business workflows.",
  },
]);

const CORRECTION_PATTERN =
  /\b(?:actually|instead|correction|i meant|forget that|not that)\b/i;
const SIMPLE_MODES = new Set([
  "acknowledgement",
  "names_only",
]);

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const NESTED_SERVICE_IDS = new Set([
  "healthcare-tpa-technology-services",
  "claims-processing-services",
  "ai-agentic-services",
  "ibm-i-as400-services",
  "enterprise-software-development",
  "software-support-consolidation",
]);

const latestAssistantQuestion = (history = []) =>
  [...history]
    .reverse()
    .find((turn) => turn?.role === "assistant" && /\?/.test(turn.content || ""));

export const isMiraAdaptiveDiscoveryFollowUp = (
  message = "",
  conversationHistory = [],
) => {
  if (CORRECTION_PATTERN.test(message)) return false;
  const previousQuestion = latestAssistantQuestion(conversationHistory)?.content || "";
  return DIMENSIONS.some(
    (dimension) =>
      previousQuestion.includes(dimension.question) &&
      dimension.knownPattern.test(message),
  );
};

const dimensionFor = ({ message, businessGoals, conversationHistory }) => {
  const direct = DIMENSIONS.find(
    (dimension) =>
      dimension.broadPattern.test(message) ||
      dimension.directPattern?.test(message),
  );
  if (direct) return { dimension: direct, source: "current_message" };
  if (CORRECTION_PATTERN.test(message)) return null;

  const previousQuestion = latestAssistantQuestion(conversationHistory)?.content || "";
  const followUp = DIMENSIONS.find(
    (dimension) =>
      previousQuestion.includes(dimension.question) &&
      dimension.knownPattern.test(message),
  );
  if (followUp) return { dimension: followUp, source: "explicit_follow_up" };

  const goalIds = new Set((businessGoals || []).map(({ id }) => id));
  const goalDimension = DIMENSIONS.find(
    (dimension) =>
      dimension.goalIds.some((goalId) => goalIds.has(goalId)) &&
      dimension.broadPattern.test(message),
  );
  return goalDimension
    ? { dimension: goalDimension, source: "current_message" }
    : null;
};

const factValueFor = (dimension, message) =>
  message.match(dimension.knownPattern)?.[0]?.trim() || "";

const entitiesFor = (ids = []) =>
  ids
    .map((id, index) =>
      groundedConversationEntityForId(id, {
        level: NESTED_SERVICE_IDS.has(id) ? 1 : 0,
        position: index + 1,
      }),
    )
    .filter(Boolean);

const shouldBypass = ({ localResult, responseMode, comparisonIntent }) =>
  Boolean(
    localResult?.riskFlags?.length ||
      localResult?.unsupportedHandled ||
      localResult?.fastPathHandled ||
      localResult?.listingHandled ||
      comparisonIntent ||
      SIMPLE_MODES.has(responseMode?.mode),
  );

export const applyMiraAdaptiveDiscovery = ({
  message = "",
  conversationHistory = [],
  businessGoals = [],
  responseMode,
  comparisonIntent = false,
  localResult,
} = {}) => {
  if (shouldBypass({ localResult, responseMode, comparisonIntent })) {
    return localResult;
  }

  const match = dimensionFor({ message, businessGoals, conversationHistory });
  if (!match) return localResult;
  const { dimension, source } = match;
  const factValue = factValueFor(dimension, message);
  const knownDecisionFacts = factValue
    ? [
        {
          key: dimension.factKey,
          value: factValue,
          source,
          confidence: "high",
        },
      ]
    : [];
  const missingDecisionFacts = factValue
    ? []
    : [
        {
          key: dimension.factKey,
          importance: "high",
          reason: dimension.reason,
        },
      ];
  const preliminaryOfferingIds = factValue
    ? unique(
        (localResult?.resolvedConversationEntities || []).map(({ id }) => id),
      )
    : dimension.preliminaryOfferingIds;
  const entities = entitiesFor(preliminaryOfferingIds);
  const decisionState = {
    topicKey: dimension.topicKey,
    currentGoalIds: unique((businessGoals || []).map(({ id }) => id)).slice(0, 4),
    knownDecisionFacts,
    missingDecisionFacts,
    preliminaryOfferingIds: preliminaryOfferingIds.slice(0, 3),
    recommendationStatus: factValue ? "direct" : "needs_refinement",
    nextBestQuestion: factValue ? null : dimension.question,
  };

  if (factValue) {
    if (dimension.directAnswer && localResult?.clarificationNeeded) {
      return {
        ...localResult,
        confidence: "high",
        matchedEntries: matchedEntriesForConversationEntities(entities),
        answerSeed: dimension.directAnswer(factValue),
        handoffNeeded: false,
        handoffReason: "",
        resolvedConversationEntities: entities,
        decisionState,
        adaptiveDiscoveryHandled: true,
        clarificationNeeded: false,
        suggestedFollowUps: [],
      };
    }
    return {
      ...localResult,
      decisionState,
      adaptiveDiscoveryHandled: true,
      clarificationNeeded: false,
      suggestedFollowUps: [],
    };
  }

  return {
    ...localResult,
    confidence: "high",
    matchedEntries: matchedEntriesForConversationEntities(entities),
    answerSeed: `${dimension.preliminaryAnswer}\n\n${dimension.question}`,
    handoffNeeded: false,
    handoffReason: "",
    suggestedFollowUps: [],
    resolvedConversationEntities: entities,
    decisionState,
    adaptiveDiscoveryHandled: true,
    clarificationNeeded: false,
    answerStructureKind: "recommendation",
  };
};

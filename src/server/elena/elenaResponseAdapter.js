import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { resolveAgentIntent } from "../agentIntent/agentIntentResolver.js";
import { runOpenAiAgentIntentProvider } from "../agentIntent/agentIntentOpenAiProvider.js";
import { elenaApprovedKnowledge } from "../../data/agentKnowledge/elenaApprovedKnowledge.js";
import {
  elenaQualificationMatrix,
  evaluateElenaClaim,
} from "../../data/agentKnowledge/elenaClaimRules.js";
import { runElenaLocalEngine } from "./elenaLocalEngine.js";
import { validateElenaModelOutput } from "./elenaOutputValidator.js";
import { buildElenaPromptPayload } from "./elenaPromptContract.js";
import { readElenaRuntimeConfig } from "./elenaRuntimeConfig.js";
import {
  chargeSuccessfulAgentWork,
  readAgentDepletionContext,
  sharedAgentStateStore,
} from "../agentState/agentDepletionRuntime.js";

export const ELENA_MESSAGE_LIMIT = 1000;
export const ELENA_HISTORY_LIMIT = 6;
export const ELENA_HISTORY_MESSAGE_LIMIT = 700;
export const ELENA_HISTORY_TOTAL_LIMIT = 2000;
const AGENT = "Elena Cross";
const ENDPOINT = "/api/agents/elena/chat";
const degradedRateLimitStore = createMiraMemoryRateLimitStore({ buckets: new Map() });
const elenaIntentTopics = elenaApprovedKnowledge.map(({ id, title }) => ({ id, title }));
const elenaClaimIntentLabels = elenaQualificationMatrix.map(({ id, question }) => ({ id, question }));
const ELENA_OUTCOME_GUARANTEE_TOPIC = "customer-outcome-guarantee";
export const ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC = "compliance-language-review";
const ELENA_OUT_OF_SCOPE_TOPIC = "outside-elena-scope";
const elenaSemanticTopicIds = [...new Set([
  ...elenaIntentTopics.map(({ id }) => id),
  ...elenaClaimIntentLabels.map(({ id }) => id),
  ELENA_OUTCOME_GUARANTEE_TOPIC,
  ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC,
  ELENA_OUT_OF_SCOPE_TOPIC,
])];
const elenaKnowledgeBySemanticTopic = new Map(elenaApprovedKnowledge.flatMap((entry) => [
  [entry.id.toLowerCase(), entry],
  [entry.title.toLowerCase(), entry],
]));
const elenaClaimCaseBySemanticTopic = new Map(elenaQualificationMatrix.map((claimCase) => [
  claimCase.id.toLowerCase(),
  claimCase,
]));

export const buildElenaSemanticClaimCandidate = (semanticIntent = {}) => [
  `Proposition: ${semanticIntent.proposition || ""}`,
  `Topic: ${semanticIntent.topic || ""}`,
  `Entities: ${(semanticIntent.entities || []).join(", ")}`,
  `Polarity: ${semanticIntent.polarity || "unknown"}`,
  `Question type: ${semanticIntent.questionType || "unknown"}`,
  `Speech act: ${semanticIntent.speechAct || "unknown"}`,
  `Requested detail: ${semanticIntent.requestedDetail || ""}`,
  `Negation scope: ${(semanticIntent.negationScope || [])
    .map(({ marker, scope }) => `${marker}: ${scope}`)
    .join("; ")}`,
].join("\n");

const semanticTopicKey = (semanticIntent = {}) => String(semanticIntent.topic || "").trim().toLowerCase();

export const resolveElenaSemanticClaimPolicy = (semanticIntent = {}) => {
  const topicKey = semanticTopicKey(semanticIntent);
  const canonicalKnowledge = elenaKnowledgeBySemanticTopic.get(topicKey) || null;
  const canonicalClaimCase = elenaClaimCaseBySemanticTopic.get(topicKey) || null;
  const candidates = [
    canonicalClaimCase?.question,
    topicKey === ELENA_OUTCOME_GUARANTEE_TOPIC
      ? "OneSmarter guarantees compliance, certification, or audit success"
      : null,
    canonicalKnowledge?.approvedSummary,
    ...(canonicalKnowledge?.allowedClaims || []),
    semanticIntent.proposition,
    semanticIntent.requestedDetail,
    buildElenaSemanticClaimCandidate(semanticIntent),
  ].filter(Boolean);
  const evaluations = candidates.map((candidate) => evaluateElenaClaim(candidate));
  const supported = evaluations.filter(({ matchedRuleId }) =>
    matchedRuleId !== "not_in_elena_approved_knowledge");
  const preferred = canonicalKnowledge
    ? supported.find(({ knowledgeIds }) => knowledgeIds.includes(canonicalKnowledge.id))
    : null;
  return {
    claimEvaluation: preferred || supported[0] || evaluations.at(-1) || null,
    canonicalKnowledgeIds: [
      ...(canonicalClaimCase?.knowledgeIds || []),
      ...(canonicalKnowledge ? [canonicalKnowledge.id] : []),
    ].filter((id, index, ids) => ids.indexOf(id) === index),
  };
};

const parseBody = (body) => typeof body === "string" ? JSON.parse(body) : (body || {});
const headerValue = (headers, key) => Object.entries(headers || {})
  .find(([name]) => name.toLowerCase() === key)?.[1];
const clientKey = (headers) => {
  const forwarded = headerValue(headers, "x-forwarded-for");
  const real = headerValue(headers, "x-real-ip");
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || (Array.isArray(real) ? real[0] : real) || "anonymous";
  return `elena:${ip}`;
};

const ELENA_SENSITIVE_FIELD_PATTERN =
  /\b(?:patient\s+name|date\s+of\s+birth|dob|claim\s+number|member\s+id|medical\s+record\s+number|mrn|api\s*key|password|secret|access\s+token|private\s+key)\s*:\s*\S+/i;

export const containsElenaSensitiveData = (message = "") =>
  ELENA_SENSITIVE_FIELD_PATTERN.test(String(message));

const errorResult = (status, error, message, requestId = crypto.randomUUID()) => ({
  status,
  body: { requestId, agent: AGENT, status, error, message },
});

const intentAwareScopeFallback = (semanticIntent = {}) => {
  const domain = String(semanticIntent.domain || "unresolved")
    .replace(/[^a-z0-9 _-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "unresolved";
  const questionType = String(semanticIntent.questionType || "request")
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 40) || "request";
  return {
    answer: `I don't have approved Elena compliance evidence for this ${domain} ${questionType.replaceAll("_", "-")} request. I can help with OneSmarter's approved compliance and readiness topics.`,
    matchedEntries: [],
    sources: [],
    confidence: "low",
    clarificationNeeded: true,
    clarificationQuestion: "Would you like to review a OneSmarter compliance or readiness topic?",
    claimEvaluation: null,
  };
};

const providerFailureFallback = ({ message, conversationHistory, verbosityBand }) => {
  const claimEvaluation = evaluateElenaClaim(message);
  return runElenaLocalEngine({ message, conversationHistory, verbosityBand, claimEvaluation });
};

export const normalizeElenaConversationHistory = (history) => {
  if (history === undefined || history === null) return { ok: true, history: [] };
  if (!Array.isArray(history)) {
    return { ok: false, error: "invalid_conversation_history", message: "conversationHistory must be an array." };
  }
  if (history.length > ELENA_HISTORY_LIMIT) {
    return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must include ${ELENA_HISTORY_LIMIT} messages or fewer.` };
  }
  let total = 0;
  const normalized = [];
  for (const turn of history) {
    const content = typeof turn?.content === "string" ? turn.content.trim() : "";
    if (!turn || !["user", "assistant"].includes(turn.role) || !content) {
      return { ok: false, error: "invalid_conversation_history", message: "Each history item requires role user or assistant and non-empty content." };
    }
    if (content.length > ELENA_HISTORY_MESSAGE_LIMIT || total + content.length > ELENA_HISTORY_TOTAL_LIMIT) {
      return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must be ${ELENA_HISTORY_TOTAL_LIMIT} total characters or fewer.` };
    }
    total += content.length;
    normalized.push({ role: turn.role, content });
  }
  return { ok: true, history: normalized };
};

export const runElenaResponseAdapter = async ({
  message,
  conversationHistory = [],
  conversationId,
  verbosityBand = "normal",
  config = readElenaRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
  intentProvider,
} = {}) => {
  if (config.mode !== "staging_llm") {
    const localResult = runElenaLocalEngine({ message, conversationHistory, verbosityBand });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    const localResult = providerFailureFallback({ message, conversationHistory, verbosityBand });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  const semanticResolution = await resolveAgentIntent({
    agentIdentity: "Elena Cross",
    message,
    conversationHistory,
    allowedDomains: ["compliance"],
    inputGuard: async () => ({
      ok: message.length <= ELENA_MESSAGE_LIMIT && !containsElenaSensitiveData(message),
      error: containsElenaSensitiveData(message) ? "sensitive_input" : "message_too_long",
    }),
    provider: intentProvider || ((request) => runOpenAiAgentIntentProvider({
      ...request,
      system: `${request.system} Choose topic from the strict Elena topic enum. Use an approved professional topic id or approved claim-intent id when its meaning applies; otherwise use ${ELENA_OUT_OF_SCOPE_TOPIC}. These are interpretation labels, not factual evidence, and you must not answer or select evidence. Use ${ELENA_OUTCOME_GUARANTEE_TOPIC} for any request about promised, assured, automatic, blanket, or vendor-produced compliance, certification, or audit outcomes. Use ${ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC} when the visitor clearly asks to review, evaluate, distinguish, explain, or propose compliance/security wording but no narrower approved topic applies. A clear wording-review request is in Elena's compliance domain even when the proposed claim is unsupported; lack of supporting evidence is a policy outcome, not semantic ambiguity. When a visitor describes preparing for or working toward a future independent certification, select the applicable readiness-support topic rather than OneSmarter's current corporate certification-status topic. For a terminology explanation, distinction, or comparison, select the canonical approved status or readiness topic whose language the visitor is asking Elena to interpret; do not classify an in-scope compliance terminology request as outside scope merely because it compares two terms. Normalize proposition into a concise declarative statement while preserving polarity and negation. Classify a request under the allowed compliance domain when its meaning concerns an approved compliance label, even when the visitor uses different vocabulary.`,
      outputSchema: {
        ...request.outputSchema,
        properties: {
          ...request.outputSchema.properties,
          topic: {
            ...request.outputSchema.properties.topic,
            enum: elenaSemanticTopicIds,
          },
        },
      },
      input: {
        ...request.input,
        agentContext: {
          ...request.input.agentContext,
          approvedProfessionalTopicLabels: elenaIntentTopics,
          approvedClaimIntentLabels: elenaClaimIntentLabels,
        },
      },
    }, { config })),
  });
  if (!semanticResolution.ok) {
    const localResult = providerFailureFallback({ message, conversationHistory, verbosityBand });
    return {
      ...localResult,
      mode: "local_deterministic",
      fallbackUsed: !semanticResolution.ok,
      fallbackReason: semanticResolution.error,
      semanticIntent: semanticResolution.intent,
    };
  }

  const resolvedIntent = semanticResolution.intent;
  const policyOwnedSemanticTopic = elenaClaimCaseBySemanticTopic.has(semanticTopicKey(resolvedIntent)) ||
    resolvedIntent.topic === ELENA_OUTCOME_GUARANTEE_TOPIC;
  const semanticIntent = policyOwnedSemanticTopic && resolvedIntent.clarificationNeeded
    ? { ...resolvedIntent, clarificationNeeded: false }
    : resolvedIntent;
  const semanticScopeAllowed = semanticResolution.domainAllowed &&
    semanticIntent.topic !== ELENA_OUT_OF_SCOPE_TOPIC &&
    (!semanticIntent.clarificationNeeded || policyOwnedSemanticTopic);
  const semanticPolicy = semanticScopeAllowed
    ? resolveElenaSemanticClaimPolicy(semanticIntent)
    : { claimEvaluation: null, canonicalKnowledgeIds: [] };
  const claimEvaluation = semanticPolicy.claimEvaluation;
  const retrievedResult = semanticScopeAllowed
    ? runElenaLocalEngine({
        message,
        conversationHistory,
        verbosityBand,
        semanticIntent,
        claimEvaluation,
        preferredKnowledgeIds: semanticPolicy.canonicalKnowledgeIds,
      })
    : intentAwareScopeFallback(semanticIntent);
  const localResult = retrievedResult.clarificationNeeded
    ? intentAwareScopeFallback(semanticIntent)
    : retrievedResult;

  // Expand explicit evidence relationships, not visitor-text matches. Definitions
  // remain a separate source and cannot establish additional corporate status.
  if (semanticScopeAllowed && localResult.matchedEntries.length) {
    const relatedIds = new Set(localResult.matchedEntries.flatMap(entry => entry.relatedKnowledgeIds || []));
    for (const entry of elenaApprovedKnowledge) {
      if (!relatedIds.has(entry.id) || localResult.matchedEntries.some(item => item.id === entry.id)) continue;
      localResult.matchedEntries.push(entry);
      localResult.sources.push({ id: entry.id, title: entry.title, route: entry.route, sourceLabel: entry.sourceReference.sourceLabel });
    }
  }
  const promptPayload = buildElenaPromptPayload({
    message,
    matchedEntries: localResult.matchedEntries,
    conversationHistory,
    verbosityBand,
    semanticIntent,
    claimEvaluation: localResult.claimEvaluation || claimEvaluation,
  });
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: {
      persona: "Professional Compliance Reader",
      memoryTheme: "Bounded request-carried context only",
      empathyState: "Careful and precise",
      semanticIntent,
    },
    retrievalResult: { matchedEntries: localResult.matchedEntries },
    riskFlags: [],
    promptPayload,
    config,
  });
  if (providerResult.error || !providerResult.modelOutput) {
    return {
      ...localResult,
      mode: "local_deterministic",
      fallbackUsed: true,
      fallbackReason: providerResult.error || "provider_error",
      semanticIntent,
    };
  }
  const validation = validateElenaModelOutput(providerResult.modelOutput, {
    matchedEntries: localResult.matchedEntries,
    fallbackResult: localResult,
    claimEvaluation: localResult.claimEvaluation || claimEvaluation,
  });
  if (!validation.valid) {
    return {
      ...localResult,
      mode: "local_deterministic",
      fallbackUsed: true,
      fallbackReason: `output_validation_failed:${validation.violations.join(",")}`,
      semanticIntent,
    };
  }
  return {
    ...localResult,
    answer: validation.correctedOutput.answer,
    mode: "staging_llm",
    fallbackUsed: false,
    fallbackReason: "",
    confidence: validation.correctedOutput.groundingStatus === "grounded" ? "high" : "low",
    clarificationNeeded: validation.correctedOutput.groundingStatus === "insufficient_context",
    clarificationQuestion: validation.correctedOutput.groundingStatus === "insufficient_context"
      ? validation.correctedOutput.suggestedFollowUps[0] || "Which approved compliance topic would you like to review?"
      : "",
    semanticIntent,
  };
};

export const handleElenaChatRequest = async ({
  method = "GET",
  body,
  headers = {},
  rateLimitStore,
  agentStateStore = sharedAgentStateStore,
  isRequestAborted = () => false,
  now = new Date(),
  responseAdapter = runElenaResponseAdapter,
} = {}) => {
  const requestId = crypto.randomUUID();
  let parsed;
  try {
    parsed = parseBody(body);
  } catch {
    return errorResult(400, "invalid_json", "Request body must be valid JSON.", requestId);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return errorResult(400, "invalid_request", "Request body must be an object.", requestId);
  }
  if (method !== "POST") {
    return errorResult(405, "method_not_allowed", `Use POST for ${ENDPOINT}.`, requestId);
  }

  const activeStore = rateLimitStore || createMiraRateLimitStore();
  let rateLimit;
  try {
    rateLimit = await activeStore.consume(clientKey(headers), now.getTime());
  } catch {
    rateLimit = await degradedRateLimitStore.consume(clientKey(headers), now.getTime());
  }
  if (!rateLimit.allowed) {
    const limited = errorResult(429, "rate_limited", "Elena is receiving too many requests. Please try again shortly.", requestId);
    return { ...limited, body: { ...limited.body, retryAfterSeconds: rateLimit.retryAfterSeconds } };
  }

  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) return errorResult(400, "missing_message", "message is required and must not be empty.", requestId);
  if (message.length > ELENA_MESSAGE_LIMIT) {
    return errorResult(413, "message_too_long", `message must be ${ELENA_MESSAGE_LIMIT} characters or fewer.`, requestId);
  }
  if (containsElenaSensitiveData(message)) {
    return errorResult(
      400,
      "sensitive_content",
      "Please do not submit patient information, PHI, personal identifiers, or confidential evidence through this public agent.",
      requestId,
    );
  }
  const history = normalizeElenaConversationHistory(parsed.conversationHistory);
  if (!history.ok) {
    return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);
  }
  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim()
    ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const depletion = await readAgentDepletionContext({
    agentId: "elena-cross",
    stateStore: agentStateStore,
    nowMs: now.getTime(),
  });
  const result = await responseAdapter({
    message,
    conversationHistory: history.history,
    conversationId,
    verbosityBand: depletion.verbosityBand,
  });
  const response = {
    status: 200,
    body: {
      requestId,
      timestamp: now.toISOString(),
      agent: AGENT,
      role: "Compliance Reader",
      conversationId,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      clarification: {
        needed: result.clarificationNeeded,
        question: result.clarificationQuestion || null,
      },
      fallback: {
        used: result.fallbackUsed,
      },
      mode: result.mode,
      safety: {
        approvedKnowledgeOnly: true,
        historyUsedAsEvidence: false,
        persistentMemory: false,
        cafeMaterialUsed: false,
      },
      privacyReminder:
        "Do not submit confidential documents, private security evidence, PHI, or personal data through this public agent.",
    },
  };
  if (!result.fallbackUsed && !result.clarificationNeeded && !isRequestAborted()) {
    await chargeSuccessfulAgentWork({
      agentId: "elena-cross",
      stateStore: agentStateStore,
      nowMs: now.getTime(),
    });
  }
  return response;
};

export default runElenaResponseAdapter;

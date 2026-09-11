import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { resolveAgentIntent } from "../agentIntent/agentIntentResolver.js";
import { runOpenAiAgentIntentProvider } from "../agentIntent/agentIntentOpenAiProvider.js";
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

const outOfScopeResult = (semanticIntent = {}) => {
  const domain = String(semanticIntent.domain || "").toLowerCase();
  const entities = new Set((semanticIntent.entities || []).map((entity) => String(entity).toLowerCase()));
  const mentionedPerson = (semanticIntent.mentionedNames || []).length > 0;
  let answer = "That request is outside Elena's OneSmarter compliance and readiness role. What compliance topic would you like to review?";
  let clarificationQuestion = "What OneSmarter compliance or readiness topic would you like to review?";
  if (entities.has("ravi") || (semanticIntent.mentionedNames || []).some((name) => String(name).toLowerCase() === "ravi") || domain === "operations") {
    answer = "That is an operational question for Ravi rather than Elena's compliance role. You can open Ravi to ask it; I have not transferred or submitted the request.";
    clarificationQuestion = "Would you like to ask Elena about a compliance boundary instead?";
  } else if (semanticIntent.questionType === "recommendation_request" || domain === "customer_ai_strategy" || domain === "business_strategy" || domain === "agent_architecture") {
    answer = "Customer-specific AI strategy is outside Elena's compliance role. Please contact the OneSmarter team for business-specific guidance; I have not submitted a request on your behalf.";
    clarificationQuestion = "Would you like to review a OneSmarter compliance or readiness topic?";
  } else if (domain === "website_analysis") {
    answer = "Website or supplied-content analysis is outside Elena's compliance-reader role. Theo handles content analysis; I have not transferred the request.";
    clarificationQuestion = "Would you like to review compliance language instead?";
  } else if (domain === "person_information" || mentionedPerson) {
    answer = "I do not have approved compliance information about that person. What OneSmarter compliance topic would you like to review?";
    clarificationQuestion = "Which compliance topic is connected to your question?";
  }
  return {
    answer,
    matchedEntries: [],
    sources: [],
    confidence: "low",
    clarificationNeeded: true,
    clarificationQuestion,
    claimEvaluation: null,
  };
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
    const localResult = runElenaLocalEngine({ message: "", verbosityBand, semanticIntent: { clarificationNeeded: true } });
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
    provider: intentProvider || ((request) => runOpenAiAgentIntentProvider(request, { config })),
  });
  if (!semanticResolution.ok || semanticResolution.intent.clarificationNeeded || !semanticResolution.domainAllowed) {
    const localResult = semanticResolution.ok
      ? outOfScopeResult(semanticResolution.intent)
      : runElenaLocalEngine({ message: "", verbosityBand, semanticIntent: { clarificationNeeded: true } });
    return {
      ...localResult,
      mode: "local_deterministic",
      fallbackUsed: !semanticResolution.ok,
      fallbackReason: semanticResolution.error || (semanticResolution.domainAllowed ? "ambiguous_semantic_intent" : "out_of_scope_semantic_intent"),
      semanticIntent: semanticResolution.intent,
    };
  }

  const semanticIntent = semanticResolution.intent;
  const localResult = runElenaLocalEngine({ message, conversationHistory, verbosityBand, semanticIntent });
  if (localResult.clarificationNeeded) {
    return { ...outOfScopeResult(semanticIntent), mode: "local_deterministic", fallbackUsed: false, fallbackReason: "unsupported_semantic_intent", semanticIntent };
  }

  const promptPayload = buildElenaPromptPayload({
    message,
    matchedEntries: localResult.matchedEntries,
    conversationHistory,
    verbosityBand,
    semanticIntent,
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

import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import {
  chargeSuccessfulAgentWork,
  readAgentDepletionContext,
  sharedAgentStateStore,
} from "../agentState/agentDepletionRuntime.js";
import { runRaviLocalEngine } from "./raviLocalEngine.js";
import { validateRaviModelOutput } from "./raviOutputValidator.js";
import { buildRaviPromptPayload } from "./raviPromptContract.js";
import { readRaviRuntimeConfig } from "./raviRuntimeConfig.js";

export const RAVI_MESSAGE_LIMIT = 1000;
export const RAVI_HISTORY_LIMIT = 6;
export const RAVI_HISTORY_MESSAGE_LIMIT = 700;
export const RAVI_HISTORY_TOTAL_LIMIT = 2000;
const AGENT = "Ravi Sen";
const ENDPOINT = "/api/agents/ravi/chat";
const degradedRateLimitStore = createMiraMemoryRateLimitStore({ buckets: new Map() });

const parseBody = (body) => typeof body === "string" ? JSON.parse(body) : (body || {});
const headerValue = (headers, key) => Object.entries(headers || {})
  .find(([name]) => name.toLowerCase() === key)?.[1];
const clientKey = (headers) => {
  const forwarded = headerValue(headers, "x-forwarded-for");
  const real = headerValue(headers, "x-real-ip");
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || (Array.isArray(real) ? real[0] : real) || "anonymous";
  return `ravi:${ip}`;
};

const RAVI_SENSITIVE_FIELD_PATTERN =
  /\b(?:patient\s+name|date\s+of\s+birth|dob|claim\s+number|member\s+id|medical\s+record\s+number|mrn)\s*:\s*\S+/i;
const UPLOAD_FIELDS = new Set(["file", "files", "upload", "uploads", "attachment", "attachments"]);

export const containsRaviSensitiveData = (message = "") =>
  RAVI_SENSITIVE_FIELD_PATTERN.test(String(message));

const containsUpload = (body) => Object.keys(body || {}).some((key) =>
  UPLOAD_FIELDS.has(key.toLowerCase()));

const errorResult = (status, error, message, requestId = crypto.randomUUID()) => ({
  status,
  body: { requestId, agent: AGENT, status, error, message },
});

export const normalizeRaviConversationHistory = (history) => {
  if (history === undefined || history === null) return { ok: true, history: [] };
  if (!Array.isArray(history)) {
    return { ok: false, error: "invalid_conversation_history", message: "conversationHistory must be an array." };
  }
  if (history.length > RAVI_HISTORY_LIMIT) {
    return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must include ${RAVI_HISTORY_LIMIT} messages or fewer.` };
  }
  let total = 0;
  const normalized = [];
  for (const turn of history) {
    const content = typeof turn?.content === "string" ? turn.content.trim() : "";
    if (!turn || !["user", "assistant"].includes(turn.role) || !content) {
      return { ok: false, error: "invalid_conversation_history", message: "Each history item requires role user or assistant and non-empty content." };
    }
    if (content.length > RAVI_HISTORY_MESSAGE_LIMIT || total + content.length > RAVI_HISTORY_TOTAL_LIMIT) {
      return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must be ${RAVI_HISTORY_TOTAL_LIMIT} total characters or fewer.` };
    }
    total += content.length;
    normalized.push({ role: turn.role, content });
  }
  return { ok: true, history: normalized };
};

export const runRaviResponseAdapter = async ({
  message,
  conversationHistory = [],
  conversationId,
  verbosityBand = "normal",
  config = readRaviRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
} = {}) => {
  const localResult = runRaviLocalEngine({ message, conversationHistory });
  if (config.mode !== "staging_llm" || localResult.clarificationNeeded) {
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  const promptPayload = buildRaviPromptPayload({
    message,
    matchedEntries: localResult.matchedEntries,
    conversationHistory,
    verbosityBand,
  });
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: {
      persona: "Professional Operations Agent",
      memoryTheme: "Bounded request-carried context only",
      empathyState: "Practical and precise",
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
    };
  }
  const validation = validateRaviModelOutput(providerResult.modelOutput, {
    matchedEntries: localResult.matchedEntries,
    fallbackResult: localResult,
  });
  if (!validation.valid) {
    return {
      ...localResult,
      mode: "local_deterministic",
      fallbackUsed: true,
      fallbackReason: `output_validation_failed:${validation.violations.join(",")}`,
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
      ? validation.correctedOutput.suggestedFollowUps[0] || "Which approved operations topic would you like to review?"
      : "",
  };
};

export const handleRaviChatRequest = async ({
  method = "GET",
  body,
  headers = {},
  rateLimitStore,
  agentStateStore = sharedAgentStateStore,
  isRequestAborted = () => false,
  now = new Date(),
  responseAdapter = runRaviResponseAdapter,
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
  if (containsUpload(parsed)) {
    return errorResult(400, "uploads_not_supported", "Ravi accepts text questions only; uploads and attachments are not supported.", requestId);
  }

  const activeStore = rateLimitStore || createMiraRateLimitStore();
  let rateLimit;
  try {
    rateLimit = await activeStore.consume(clientKey(headers), now.getTime());
  } catch {
    rateLimit = await degradedRateLimitStore.consume(clientKey(headers), now.getTime());
  }
  if (!rateLimit.allowed) {
    const limited = errorResult(429, "rate_limited", "Ravi is receiving too many requests. Please try again shortly.", requestId);
    return { ...limited, body: { ...limited.body, retryAfterSeconds: rateLimit.retryAfterSeconds } };
  }

  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) return errorResult(400, "missing_message", "message is required and must not be empty.", requestId);
  if (message.length > RAVI_MESSAGE_LIMIT) {
    return errorResult(413, "message_too_long", `message must be ${RAVI_MESSAGE_LIMIT} characters or fewer.`, requestId);
  }
  if (containsRaviSensitiveData(message)) {
    return errorResult(
      400,
      "sensitive_content",
      "Please do not submit patient information, personal identifiers, ticket contents, or confidential operational data through this public agent.",
      requestId,
    );
  }
  const history = normalizeRaviConversationHistory(parsed.conversationHistory);
  if (!history.ok) {
    return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);
  }
  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim()
    ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const depletion = await readAgentDepletionContext({
    agentId: "ravi-sen",
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
      role: "Operations Agent",
      conversationId,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      clarification: {
        needed: result.clarificationNeeded,
        question: result.clarificationQuestion || null,
      },
      fallback: { used: result.fallbackUsed },
      mode: result.mode,
      safety: {
        approvedKnowledgeOnly: true,
        historyUsedAsEvidence: false,
        persistentConversationMemory: false,
        liveSystemAccess: false,
        actionsPerformed: false,
        cafeMaterialUsed: false,
      },
      privacyReminder:
        "Do not submit ticket contents, confidential operational data, PHI, personal data, credentials, or production-system details.",
    },
  };
  if (!result.fallbackUsed && !result.clarificationNeeded && !isRequestAborted()) {
    await chargeSuccessfulAgentWork({
      agentId: "ravi-sen",
      stateStore: agentStateStore,
      nowMs: now.getTime(),
    });
  }
  return response;
};

export default runRaviResponseAdapter;

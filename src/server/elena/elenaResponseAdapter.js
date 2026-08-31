import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { runElenaLocalEngine } from "./elenaLocalEngine.js";
import { validateElenaModelOutput } from "./elenaOutputValidator.js";
import { buildElenaPromptPayload } from "./elenaPromptContract.js";
import { readElenaRuntimeConfig } from "./elenaRuntimeConfig.js";

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

const errorResult = (status, error, message, requestId = crypto.randomUUID()) => ({
  status,
  body: { requestId, agent: AGENT, status, error, message },
});

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
  config = readElenaRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
} = {}) => {
  const localResult = runElenaLocalEngine({ message, conversationHistory });
  if (config.mode !== "staging_llm" || localResult.clarificationNeeded) {
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  const promptPayload = buildElenaPromptPayload({
    message,
    matchedEntries: localResult.matchedEntries,
    conversationHistory,
  });
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: {
      persona: "Professional Compliance Reader",
      memoryTheme: "Bounded request-carried context only",
      empathyState: "Careful and precise",
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
  };
};

export const handleElenaChatRequest = async ({
  method = "GET",
  body,
  headers = {},
  rateLimitStore,
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
  const history = normalizeElenaConversationHistory(parsed.conversationHistory);
  if (!history.ok) {
    return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);
  }
  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim()
    ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const result = await responseAdapter({
    message,
    conversationHistory: history.history,
    conversationId,
  });
  return {
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
        reason: result.fallbackReason || null,
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
};

export default runElenaResponseAdapter;

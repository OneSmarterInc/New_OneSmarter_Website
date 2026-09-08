import crypto from "node:crypto";
import { createMiraMemoryRateLimitStore, createMiraRateLimitStore } from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { chargeSuccessfulAgentWork, readAgentDepletionContext, sharedAgentStateStore } from "../agentState/agentDepletionRuntime.js";
import { runSeleneLocalEngine } from "./seleneLocalEngine.js";
import { validateSeleneModelOutput } from "./seleneOutputValidator.js";
import { buildSelenePromptPayload } from "./selenePromptContract.js";
import { readSeleneRuntimeConfig } from "./seleneRuntimeConfig.js";

export const SELENE_MESSAGE_LIMIT = 1000;
export const SELENE_HISTORY_LIMIT = 6;
export const SELENE_HISTORY_MESSAGE_LIMIT = 700;
export const SELENE_HISTORY_TOTAL_LIMIT = 2000;
const AGENT = "Selene Hart";
const ENDPOINT = "/api/agents/selene/chat";
const fallbackRateLimitStore = createMiraMemoryRateLimitStore({ buckets: new Map() });
const SENSITIVE = /\b(?:patient\s+name|date\s+of\s+birth|dob|claim\s+number|member\s+id|medical\s+record\s+number|mrn)\s*:\s*\S+|\b(?:api key|password|secret|access token|private key)\s*:\s*\S+/i;
const UPLOAD_FIELDS = new Set(["file", "files", "upload", "uploads", "attachment", "attachments"]);

const parseBody = (body) => typeof body === "string" ? JSON.parse(body) : (body || {});
const headerValue = (headers, key) => Object.entries(headers || {}).find(([name]) => name.toLowerCase() === key)?.[1];
const clientKey = (headers) => {
  const forwarded = headerValue(headers, "x-forwarded-for");
  const real = headerValue(headers, "x-real-ip");
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || (Array.isArray(real) ? real[0] : real) || "anonymous";
  return `selene:${ip}`;
};
const errorResult = (status, error, message, requestId = crypto.randomUUID()) => ({
  status,
  body: { requestId, agent: AGENT, status, error, message },
});

export const containsSeleneSensitiveData = (message = "") => SENSITIVE.test(String(message));

export const normalizeSeleneConversationHistory = (history) => {
  if (history == null) return { ok: true, history: [] };
  if (!Array.isArray(history)) return { ok: false, error: "invalid_conversation_history", message: "conversationHistory must be an array." };
  if (history.length > SELENE_HISTORY_LIMIT) return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must include ${SELENE_HISTORY_LIMIT} messages or fewer.` };
  let total = 0;
  const normalized = [];
  for (const turn of history) {
    const content = typeof turn?.content === "string" ? turn.content.trim() : "";
    if (!turn || !["user", "assistant"].includes(turn.role) || !content) return { ok: false, error: "invalid_conversation_history", message: "Each history item requires role user or assistant and non-empty content." };
    if (content.length > SELENE_HISTORY_MESSAGE_LIMIT || total + content.length > SELENE_HISTORY_TOTAL_LIMIT) return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must be ${SELENE_HISTORY_TOTAL_LIMIT} total characters or fewer.` };
    total += content.length;
    normalized.push({ role: turn.role, content });
  }
  return { ok: true, history: normalized };
};

export const runSeleneResponseAdapter = async ({
  message,
  conversationHistory = [],
  conversationId,
  verbosityBand = "normal",
  config = readSeleneRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
} = {}) => {
  const localResult = runSeleneLocalEngine({ message, conversationHistory, verbosityBand });
  if (config.mode !== "staging_llm" || localResult.clarificationNeeded) return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  if (config.provider !== "openai" || !config.providerConfigComplete) return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: { persona: "Professional AI Agent Architecture Strategist", memoryTheme: "Bounded request-carried context only", empathyState: "Reflective and precise" },
    retrievalResult: { matchedEntries: localResult.matchedEntries },
    riskFlags: [],
    promptPayload: buildSelenePromptPayload({ message, matchedEntries: localResult.matchedEntries, conversationHistory, verbosityBand }),
    config,
  });
  if (providerResult.error || !providerResult.modelOutput) return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: providerResult.error || "provider_error" };
  const validation = validateSeleneModelOutput(providerResult.modelOutput, { matchedEntries: localResult.matchedEntries, fallbackResult: localResult });
  if (!validation.valid) return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: `output_validation_failed:${validation.violations.join(",")}` };
  return {
    ...localResult,
    answer: validation.correctedOutput.answer,
    mode: "staging_llm",
    fallbackUsed: false,
    fallbackReason: "",
    confidence: validation.correctedOutput.groundingStatus === "grounded" ? "high" : "low",
    clarificationNeeded: validation.correctedOutput.groundingStatus === "insufficient_context",
    clarificationQuestion: validation.correctedOutput.suggestedFollowUps[0] || "",
  };
};

export const handleSeleneChatRequest = async ({ method = "GET", body, headers = {}, rateLimitStore, agentStateStore = sharedAgentStateStore, isRequestAborted = () => false, now = new Date(), responseAdapter = runSeleneResponseAdapter } = {}) => {
  const requestId = crypto.randomUUID();
  let parsed;
  try { parsed = parseBody(body); } catch { return errorResult(400, "invalid_json", "Request body must be valid JSON.", requestId); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return errorResult(400, "invalid_request", "Request body must be an object.", requestId);
  if (method !== "POST") return errorResult(405, "method_not_allowed", `Use POST for ${ENDPOINT}.`, requestId);
  if (Object.keys(parsed).some((key) => UPLOAD_FIELDS.has(key.toLowerCase()))) return errorResult(400, "uploads_not_supported", "Selene accepts text questions only; uploads are not supported.", requestId);

  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) return errorResult(400, "missing_message", "message is required and must not be empty.", requestId);
  if (message.length > SELENE_MESSAGE_LIMIT) return errorResult(413, "message_too_long", `message must be ${SELENE_MESSAGE_LIMIT} characters or fewer.`, requestId);
  if (containsSeleneSensitiveData(message)) return errorResult(400, "sensitive_content", "Please do not submit PHI, personal identifiers, credentials, customer data, or confidential architecture through this public agent.", requestId);
  const history = normalizeSeleneConversationHistory(parsed.conversationHistory);
  if (!history.ok) return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);

  const activeStore = rateLimitStore || createMiraRateLimitStore();
  let limit;
  try { limit = await activeStore.consume(clientKey(headers), now.getTime()); } catch { limit = await fallbackRateLimitStore.consume(clientKey(headers), now.getTime()); }
  if (!limit.allowed) return { ...errorResult(429, "rate_limited", "Selene is receiving too many requests. Please try again shortly.", requestId), body: { ...errorResult(429, "rate_limited", "Selene is receiving too many requests. Please try again shortly.", requestId).body, retryAfterSeconds: limit.retryAfterSeconds } };

  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim() ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const depletion = await readAgentDepletionContext({ agentId: "selene-hart", stateStore: agentStateStore, nowMs: now.getTime() });
  const adapted = await responseAdapter({ message, conversationHistory: history.history, conversationId, verbosityBand: depletion.verbosityBand });
  const response = { status: 200, body: {
    requestId, timestamp: now.toISOString(), agent: AGENT, role: "AI Agent Architecture Strategist", conversationId,
    answer: adapted.answer, sources: adapted.sources, confidence: adapted.confidence,
    clarification: { needed: adapted.clarificationNeeded, question: adapted.clarificationQuestion || null },
    fallback: { used: adapted.fallbackUsed }, mode: adapted.mode,
    safety: { approvedKnowledgeOnly: true, historyUsedAsEvidence: false, persistentConversationMemory: false, autonomousDelegation: false, customerSystemAccess: false, cafeMaterialUsed: false },
    privacyReminder: "Do not submit PHI, personal data, credentials, confidential architecture, or customer-specific information.",
  } };
  if (adapted.chargeEligible && !adapted.fallbackUsed && !adapted.clarificationNeeded && !isRequestAborted()) await chargeSuccessfulAgentWork({ agentId: "selene-hart", stateStore: agentStateStore, nowMs: now.getTime() });
  return response;
};

export default runSeleneResponseAdapter;

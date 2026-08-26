import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { readTheoRuntimeConfig } from "./theoRuntimeConfig.js";
import { runTheoLocalAnalysis, formatTheoVisitorAnswer } from "./theoLocalEngine.js";
import { buildTheoPromptPayload } from "./theoPromptContract.js";
import { validateTheoModelOutput } from "./theoOutputValidator.js";

export const THEO_MESSAGE_LIMIT = 1000;
export const THEO_CONTENT_LIMIT = 20000;
export const THEO_HISTORY_LIMIT = 6;
export const THEO_HISTORY_TOTAL_LIMIT = 2000;
const AGENT = "Theo Mercer";
const ENDPOINT = "/api/agents/theo/chat";
const degradedRateLimitStore = createMiraMemoryRateLimitStore({ buckets: new Map() });
const THEO_PRIVATE_CONTENT_MESSAGE = "The supplied content appears to contain private or patient-related information. Remove sensitive details and provide only public page content for analysis.";
const PHI_SHAPED_FIELDS = /\b(?:date of birth|dob|claim number|claim id|member id|member number|patient id|patient number|medical record number|mrn)\s*[:#-]?\s*[a-z0-9][a-z0-9./-]*/i;
const PATIENT_CONTEXT_WITH_NAME = /\b(?:patient|member|claim(?:ant)?)\b[^\r\n]{0,60}\bname\s*:\s*[a-z][a-z'’-]+(?:\s+[a-z][a-z'’-]+)+/i;

export const containsTheoPrivatePatientData = (value = "") => {
  const content = String(value);
  return PHI_SHAPED_FIELDS.test(content) || PATIENT_CONTEXT_WITH_NAME.test(content);
};

const parseBody = (body) => typeof body === "string" ? JSON.parse(body) : (body || {});
const headerValue = (headers, key) => Object.entries(headers || {})
  .find(([name]) => name.toLowerCase() === key)?.[1];
const clientKey = (headers) => {
  const forwarded = headerValue(headers, "x-forwarded-for");
  const real = headerValue(headers, "x-real-ip");
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || (Array.isArray(real) ? real[0] : real) || "anonymous";
  return `theo:${ip}`;
};

const errorResult = (status, error, message, requestId = crypto.randomUUID()) => ({
  status,
  body: { requestId, agent: AGENT, status, error, message },
});

export const normalizeTheoConversationHistory = (history) => {
  if (history === undefined || history === null) return { ok: true, history: [] };
  if (!Array.isArray(history)) return { ok: false, error: "invalid_conversation_history", message: "conversationHistory must be an array." };
  if (history.length > THEO_HISTORY_LIMIT) return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must include ${THEO_HISTORY_LIMIT} messages or fewer.` };
  let total = 0;
  const normalized = [];
  for (const turn of history) {
    const content = typeof turn?.content === "string" ? turn.content.trim() : "";
    if (!turn || !["user", "assistant"].includes(turn.role) || !content) {
      return { ok: false, error: "invalid_conversation_history", message: "Each history item requires role user or assistant and non-empty content." };
    }
    if (content.length > 700 || total + content.length > THEO_HISTORY_TOTAL_LIMIT) {
      return { ok: false, error: "conversation_history_too_long", message: `conversationHistory must be ${THEO_HISTORY_TOTAL_LIMIT} total characters or fewer.` };
    }
    total += content.length;
    normalized.push({ role: turn.role, content });
  }
  return { ok: true, history: normalized };
};

export const runTheoResponseAdapter = async ({
  message,
  websiteContent,
  conversationHistory = [],
  conversationId,
  config = readTheoRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
} = {}) => {
  const localAnalysis = runTheoLocalAnalysis({ message, websiteContent });
  if (config.mode !== "staging_llm" || localAnalysis.clarificationNeeded) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  const promptPayload = buildTheoPromptPayload({ message, websiteContent, conversationHistory });
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: { persona: "Professional Analyst", memoryTheme: "Current supplied page only", empathyState: "Precise" },
    retrievalResult: { matchedEntries: [] },
    riskFlags: [], promptPayload, config,
  });
  if (providerResult.error || !providerResult.modelOutput) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: providerResult.error || "provider_error" };
  }
  let parsedAnalysis;
  try {
    parsedAnalysis = JSON.parse(providerResult.modelOutput.answer);
  } catch {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: "malformed_theo_analysis_json" };
  }
  const validation = validateTheoModelOutput(parsedAnalysis, { websiteContent, fallbackAnalysis: localAnalysis });
  if (!validation.valid) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: `output_validation_failed:${validation.violations.join(",")}` };
  }
  return { analysis: validation.correctedOutput, mode: "staging_llm", fallbackUsed: false, fallbackReason: "" };
};

export const handleTheoChatRequest = async ({ method = "GET", body, headers = {}, rateLimitStore, now = new Date(), responseAdapter = runTheoResponseAdapter } = {}) => {
  const requestId = crypto.randomUUID();
  let parsed;
  try { parsed = parseBody(body); } catch { return errorResult(400, "invalid_json", "Request body must be valid JSON.", requestId); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return errorResult(400, "invalid_request", "Request body must be an object.", requestId);
  if (method !== "POST") return errorResult(405, "method_not_allowed", `Use POST for ${ENDPOINT}.`, requestId);

  const activeStore = rateLimitStore || createMiraRateLimitStore();
  let rateLimit;
  try { rateLimit = await activeStore.consume(clientKey(headers), now.getTime()); }
  catch { rateLimit = await degradedRateLimitStore.consume(clientKey(headers), now.getTime()); }
  if (!rateLimit.allowed) return { ...errorResult(429, "rate_limited", "Theo is receiving too many requests. Please try again shortly.", requestId), body: { ...errorResult(429, "rate_limited", "Theo is receiving too many requests. Please try again shortly.", requestId).body, retryAfterSeconds: rateLimit.retryAfterSeconds } };

  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
  const websiteContent = typeof parsed.websiteContent === "string" ? parsed.websiteContent.trim() : "";
  if (!message) return errorResult(400, "missing_message", "message is required and must not be empty.", requestId);
  if (message.length > THEO_MESSAGE_LIMIT) return errorResult(413, "message_too_long", `message must be ${THEO_MESSAGE_LIMIT} characters or fewer.`, requestId);
  if (!websiteContent) return errorResult(400, "missing_website_content", "websiteContent is required and must not be empty.", requestId);
  if (websiteContent.length > THEO_CONTENT_LIMIT) return errorResult(413, "website_content_too_long", "The supplied page content is too large to analyze. Reduce it to the relevant public page text and try again.", requestId);
  if (containsTheoPrivatePatientData(websiteContent)) return errorResult(400, "private_patient_content", THEO_PRIVATE_CONTENT_MESSAGE, requestId);
  const history = normalizeTheoConversationHistory(parsed.conversationHistory);
  if (!history.ok) return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);

  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim()
    ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const result = await responseAdapter({ message, websiteContent, conversationHistory: history.history, conversationId });
  return {
    status: 200,
    body: {
      requestId, timestamp: now.toISOString(), agent: AGENT, conversationId,
      mode: result.mode, answer: formatTheoVisitorAnswer(result.analysis),
      analysis: result.analysis, evidenceStatus: result.analysis.evidenceStatus,
      fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason,
      privacyReminder: "Submit only public website/page content. Do not include confidential information or personal data.",
    },
  };
};

export default runTheoResponseAdapter;

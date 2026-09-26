import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { resolveAgentIntent } from "../agentIntent/agentIntentResolver.js";
import { runOpenAiAgentIntentProvider } from "../agentIntent/agentIntentOpenAiProvider.js";
import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";
import {
  chargeSuccessfulAgentWork,
  readAgentDepletionContext,
  sharedAgentStateStore,
} from "../agentState/agentDepletionRuntime.js";
import { resolveRaviEvidenceAnswer } from "./raviSemanticEvidence.js";
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
const raviIntentTopics = raviApprovedKnowledge.map(({ id, title }) => ({ id, title }));

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

const intentAwareScopeFallback = (semanticIntent = {}) => {
  const domain = String(semanticIntent.domain || "unresolved")
    .replace(/[^a-z0-9 _-]/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "unresolved";
  const questionType = String(semanticIntent.questionType || "request")
    .replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "request";
  return {
    answer: `I don't have approved Ravi operations evidence for this ${domain} ${questionType.replaceAll("_", "-")} request. I can help with OneSmarter's approved operational workflow topics.`,
    matchedEntries: [], sources: [], confidence: "low", clarificationNeeded: true,
    clarificationQuestion: "Would you like to review an approved operational workflow topic?",
    claimEvaluation: null,
  };
};

const unresolvedIntentFallback = () => ({
  answer: "I couldn't safely resolve the subject and requested operation in that question. Please restate who should do what, and whether you want an explanation, permission check, or workflow recommendation.",
  matchedEntries: [], sources: [], confidence: "low", clarificationNeeded: true,
  clarificationQuestion: "Who is the subject, and what action or explanation are you asking about?",
  claimEvaluation: null,
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
  intentProvider,
  evidenceProvider,
} = {}) => {
  if (config.mode !== "staging_llm") {
    const localResult = runRaviLocalEngine({ message, conversationHistory, verbosityBand });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    const localResult = runRaviLocalEngine({ message: "", verbosityBand, semanticIntent: { clarificationNeeded: true } });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  // Object spread intentionally excludes the runtime's protected credential.
  // Preserve that protection on the transport-specific copy as well.
  const intentConfig = Object.defineProperty({
    ...config,
    maxTokens: Math.max(config.maxTokens, 3_000),
    timeoutMs: Math.max(config.timeoutMs, 20_000),
  }, "apiKey", { value: config.apiKey, enumerable: false });
  const resolveIntent = intentProvider || ((request) => runOpenAiAgentIntentProvider(request, {
    config: intentConfig,
  }));
  const semanticResolution = await resolveAgentIntent({
    agentIdentity: "Ravi Sen",
    message,
    conversationHistory,
    allowedDomains: ["operations", "identity", "agent_identity", "agent_roles", "agent roles", "professional agents"],
    inputGuard: async () => ({
      ok: message.length <= RAVI_MESSAGE_LIMIT && !containsRaviSensitiveData(message),
      error: containsRaviSensitiveData(message) ? "sensitive_input" : "message_too_long",
    }),
    provider: (request) => resolveIntent({
      ...request,
      system: `${request.system} Use the supplied approved professional topic labels only to normalize the subject of the request; they are labels, not factual evidence, and you must not answer or select evidence. When a request is supported, set topic to the exact title of the single best matching supplied label. Use the professional-agent role-directory label for descriptions or comparisons of OneSmarter's professional agents. Classify a request under an allowed domain when its meaning concerns one of those approved labels, even when the visitor uses different vocabulary. Populate followUpReferences only for references that require prior conversation to resolve; direct references to the current agent such as you or your do not require history. Put the grammatical subject of the current proposition first in entities. Preserve that subject exactly as interpreted: Ravi Sen for Ravi himself, and the named person or customer role for any third party. Entity ordering is semantic structure, not factual evidence. General design and recommendation requests can have a process as their subject; they do not require a named actor, customer system, or existing permission. Missing implementation details do not make a request for general principles ambiguous. Distinguish advice about a workflow from a request to execute it. Preserve explicit third-party subjects and unresolved historical references; never infer their permissions. For simple requests use empty compound arrays and an empty clarify focus, as required by the shared contract.`,
      input: { ...request.input, agentContext: { ...request.input.agentContext, approvedProfessionalTopicLabels: raviIntentTopics } },
    }),
  });
  if (!semanticResolution.ok) {
    const localResult = unresolvedIntentFallback();
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: semanticResolution.error, semanticIntent: semanticResolution.intent };
  }

  const semanticIntent = semanticResolution.intent;
  const allowed = semanticResolution.domainAllowed && !semanticIntent.clarificationNeeded;
  // This small approved slice is supplied in full. Topic labels must not hide role boundaries.
  const matchedEntries = allowed ? raviApprovedKnowledge : [];
  const localResult = allowed ? unresolvedIntentFallback() : intentAwareScopeFallback(semanticIntent);

  const promptPayload = buildRaviPromptPayload({
    message,
    matchedEntries,
    conversationHistory,
    verbosityBand,
    semanticIntent,
  });
  let providerResult;
  try {
    providerResult = await providerAdapter({
      message,
      conversationId,
      requestContext: {
        persona: "Professional Operations Agent",
        memoryTheme: "Bounded request-carried context only",
        empathyState: "Practical and precise",
        semanticIntent,
      },
      retrievalResult: { matchedEntries },
      riskFlags: [],
      promptPayload,
      config,
    });
  } catch { providerResult = { error: "provider_error" }; }
  providerResult ||= { error: "provider_error" };
  const validation = validateRaviModelOutput(providerResult.modelOutput, {
    matchedEntries, visitorSuppliedEntities: semanticIntent.entities,
  });
  const failure = providerResult.error || (!validation.valid
    ? `output_validation_failed:${validation.violations.join(",")}` : "");
  const reviewed = await resolveRaviEvidenceAnswer({
    message, conversationHistory, semanticIntent, allowed, verbosityBand,
    candidate: failure ? null : validation.correctedOutput,
  }, { config, provider: evidenceProvider });
  if (!reviewed) return {
    ...localResult, mode: "local_deterministic", fallbackUsed: true,
    fallbackReason: "semantic_evidence_unavailable", semanticIntent,
  };
  const output = reviewed.output;
  return {
    answer: output.answer,
    matchedEntries: reviewed.matchedEntries,
    sources: reviewed.matchedEntries.map((entry) => ({
      id: entry.id, title: entry.title, route: entry.route,
      sourceLabel: entry.sourceReference?.sourceLabel || "",
    })),
    claimEvaluation: null,
    mode: "staging_llm",
    fallbackUsed: Boolean(failure), fallbackReason: failure,
    confidence: output.groundingStatus === "grounded" ? "high" : "low",
    clarificationNeeded: output.groundingStatus !== "grounded",
    clarificationQuestion: output.groundingStatus !== "grounded"
      ? output.suggestedFollowUps[0] || "Which approved operations topic would you like to review?" : "",
    semanticIntent,
  };
};

// Log only controlled categories, never provider payloads, credentials or visitor text.
export const raviExecutionOutcome = (result) => {
  const reason = result.fallbackReason || "";
  if (reason.startsWith("output_validation_failed:")) return "validation_rejection";
  if (reason === "provider_timeout") return "generation_timeout";
  if (reason.startsWith("provider_incomplete")) return "generation_incomplete";
  if (["provider_failure", "provider_unavailable", "invalid_provider_intent"].includes(reason)) return "semantic_provider_failure";
  if (reason === "missing_provider_config") return "configuration_failure";
  if (reason) return "provider_or_evidence_failure";
  if (result.clarificationNeeded) return "semantic_clarification";
  return result.mode === "staging_llm" ? "validated_response" : "deterministic_response";
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
  logger = console.info,
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
  try {
    logger({ event: "ravi_request_execution", endpoint: ENDPOINT, requestId,
      outcome: raviExecutionOutcome(result),
      mode: result.mode === "staging_llm" ? "staging_llm" : "local_deterministic",
      fallbackUsed: Boolean(result.fallbackUsed) });
  } catch { /* Observability must not change the response. */ }
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

import crypto from "node:crypto";
import { createMiraMemoryRateLimitStore, createMiraRateLimitStore } from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { resolveAgentIntent } from "../agentIntent/agentIntentResolver.js";
import { runOpenAiAgentIntentProvider } from "../agentIntent/agentIntentOpenAiProvider.js";
import { seleneApprovedKnowledge } from "../../data/agentKnowledge/seleneApprovedKnowledge.js";
import { chargeSuccessfulAgentWork, readAgentDepletionContext, sharedAgentStateStore } from "../agentState/agentDepletionRuntime.js";
import { retrieveSeleneSemanticKnowledge } from "./seleneSemanticRetrieval.js";
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
const seleneIntentTopics = seleneApprovedKnowledge.map(({ id, title, approvedSummary }) => ({ id, title, description: approvedSummary }));
const seleneSemanticTopicLabels = [
  ...seleneIntentTopics.flatMap(({ id, title }) => [id, title]),
  "acknowledgement",
  "outside-selene-scope",
];
const SENSITIVE = /\b(?:patient\s+name|date\s+of\s+birth|dob|claim\s+number|member\s+id|medical\s+record\s+number|mrn)\s*:\s*\S+|\b(?:aadhaar|aadhar)(?:\s+(?:number|no\.?))?\s*(?::|is)?\s*\d[\d\s-]{7,}|\b(?:api key|password|secret|access token|private key)\s*:\s*\S+/i;
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

const intentSummary = (semanticIntent = {}) => String(
  semanticIntent.requestedDetail || semanticIntent.proposition || semanticIntent.topic || "your request",
).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 180) || "your request";

const intentAwareScopeFallback = (semanticIntent = {}) => {
  const domain = String(semanticIntent.domain || "unresolved")
    .replace(/[^a-z0-9 _-]/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "unresolved";
  const isAcknowledgement = domain === "conversational_acknowledgement"
    && semanticIntent.confidence >= 0.7;
  const mentionedName = Array.isArray(semanticIntent.mentionedNames)
    ? String(semanticIntent.mentionedNames[0] || "").replace(/[<>]/g, "").trim().slice(0, 100)
    : "";
  const unresolvedIdentity = mentionedName && semanticIntent.requestedDetail && semanticIntent.clarificationNeeded;
  const needsClarification = !isAcknowledgement && (semanticIntent.clarificationNeeded || semanticIntent.confidence < 0.55);
  const answer = isAcknowledgement
    ? "Understood. What would you like to explore about OneSmarter's agent architecture?"
    : unresolvedIdentity
      ? `Selene's approved information does not establish who ${mentionedName} is. Could you clarify how that person relates to the OneSmarter agent-architecture question you want to review?`
    : needsClarification
      ? "I need a little more context to understand what you want to review. I can help with OneSmarter's agent roles, knowledge boundaries, claim validation, Café separation, and current orchestration model."
      : `I understand the request concerns ${intentSummary(semanticIntent)}, but I don't have approved Selene evidence to answer it. I can explain OneSmarter's agent architecture, or you can contact care@onesmarter.com for an appropriate human follow-up.`;
  return {
    answer,
    matchedEntries: [], sources: [], confidence: isAcknowledgement ? "high" : "low", clarificationNeeded: !isAcknowledgement,
    clarificationQuestion: needsClarification ? "Could you clarify what you would like Selene to review?" : "Would you like an explanation of OneSmarter's agent architecture?",
    claimEvaluation: null,
  };
};

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
  intentProvider,
  retrievalProvider,
} = {}) => {
  if (config.mode !== "staging_llm") {
    const localResult = runSeleneLocalEngine({ message, verbosityBand });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    const localResult = runSeleneLocalEngine({ message: "", verbosityBand, semanticIntent: { clarificationNeeded: true } });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }
  const semanticResolution = await resolveAgentIntent({
    agentIdentity: "Selene Hart",
    message,
    conversationHistory,
    allowedDomains: ["agent_architecture", "ai_agent_architecture", "agent_orchestration", "identity", "agent_identity", "agent_roles", "professional_agents", "live_system_action", "conversational_acknowledgement"],
    inputGuard: async () => ({
      ok: message.length <= SELENE_MESSAGE_LIMIT && !containsSeleneSensitiveData(message),
      error: containsSeleneSensitiveData(message) ? "sensitive_input" : "message_too_long",
    }),
    provider: (request) => (intentProvider || ((enriched) => runOpenAiAgentIntentProvider(enriched, { config })))({
      ...request,
      system: `${request.system} Use the supplied approved professional topic labels only to normalize the subject; they are labels, not evidence, and you must not answer or select evidence. For supported requests, semantically compare the current question against every catalog description and set topic to the exact ID or title of the best match. Interpret paraphrases and metaphors by meaning, not shared vocabulary. A short self-contained definition question does not need more context merely because it has few words. The current explicit subject takes precedence over unrelated prior topics. Use Selene Hart Professional Role for questions specifically about Selene. Use Professional Agent Role Separation for another professional agent, agent routing, or role comparisons. A plural or collective reference that clearly denotes the OneSmarter professional-agent system is not ambiguous merely because individual agent names are omitted; resolve it to the relevant approved architecture or orchestration topic. Still require clarification when the referent cannot be determined from the current proposition and bounded history. Use domain live_system_action with Professional Agent Role Separation when the proposition asks whether a professional agent can access or act in a visitor or customer system. Classify semantic equivalents under an allowed domain even when vocabulary differs. A high-confidence conversational acknowledgement may use domain conversational_acknowledgement and topic acknowledgement; it does not need clarification. Meaningless input or a bare ambiguous entity needs clarification. Preserve the logical proposition exactly: a negative confirmation asks whether its negative proposition is correct, while an ordinary yes/no question asks whether its positive proposition is true. Populate followUpReferences only when prior conversation is needed to resolve a reference; direct references such as you or your do not require history.`,
      input: { ...request.input, agentContext: { ...request.input.agentContext, approvedProfessionalTopicLabels: seleneIntentTopics } },
      outputSchema: {
        ...request.outputSchema,
        properties: {
          ...request.outputSchema.properties,
          topic: { ...request.outputSchema.properties.topic, enum: seleneSemanticTopicLabels },
        },
      },
    }),
  });
  if (!semanticResolution.ok) {
    const localResult = runSeleneLocalEngine({ message: "", verbosityBand, semanticIntent: { clarificationNeeded: true } });
    return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: semanticResolution.error, semanticIntent: semanticResolution.intent };
  }
  const resolvedIntent = semanticResolution.intent;
  const hasApprovedSemanticTopic = seleneIntentTopics.some(({ id, title }) => id === resolvedIntent.topic || title === resolvedIntent.topic);
  let semanticIntent = resolvedIntent.clarificationNeeded
    && resolvedIntent.confidence >= 0.55 && hasApprovedSemanticTopic
    ? { ...resolvedIntent, clarificationNeeded: false }
    : resolvedIntent;
  if (semanticResolution.domainAllowed && !semanticIntent.clarificationNeeded
    && semanticIntent.domain !== "conversational_acknowledgement") {
    const selected = await retrieveSeleneSemanticKnowledge({ message, semanticIntent, config, provider: retrievalProvider });
    semanticIntent = selected ? { ...semanticIntent, topic: selected.id } : { ...semanticIntent, clarificationNeeded: true };
  }
  const retrieved = semanticIntent.domain === "conversational_acknowledgement"
    ? intentAwareScopeFallback(semanticIntent)
    : semanticResolution.domainAllowed && !semanticIntent.clarificationNeeded
    ? runSeleneLocalEngine({ message, verbosityBand, semanticIntent })
    : intentAwareScopeFallback(semanticIntent);
  const localResult = retrieved;
  if (semanticIntent.domain === "conversational_acknowledgement" && !localResult.clarificationNeeded) {
    return { ...localResult, mode: "local_deterministic", fallbackUsed: false, fallbackReason: "", semanticIntent };
  }
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: { persona: "Professional AI Agent Architecture Strategist", memoryTheme: "Bounded request-carried context only", empathyState: "Reflective and precise", semanticIntent, claimEvaluation: localResult.claimEvaluation },
    retrievalResult: { matchedEntries: localResult.matchedEntries },
    riskFlags: [],
    promptPayload: buildSelenePromptPayload({ message, matchedEntries: localResult.matchedEntries, conversationHistory, verbosityBand, semanticIntent, claimEvaluation: localResult.claimEvaluation }),
    config,
  });
  if (providerResult.error || !providerResult.modelOutput) return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: providerResult.error || "provider_error", semanticIntent };
  let validation = validateSeleneModelOutput(providerResult.modelOutput, { matchedEntries: localResult.matchedEntries, fallbackResult: localResult });
  if (!validation.valid && validation.violations.some((violation) => violation.startsWith("unsupported_") || violation.includes("grounded"))) {
    const repairPayload = buildSelenePromptPayload({
      message, matchedEntries: localResult.matchedEntries, conversationHistory, verbosityBand,
      semanticIntent, claimEvaluation: localResult.claimEvaluation,
    });
    repairPayload.system += " The previous draft did not pass deterministic grounding. Rewrite it once using only factual clauses directly supported by the approved evidence block. Keep the response natural and responsive to the semantic intent, but introduce no new names, labels, reasons, capabilities, or factual paraphrases. Preserve every required qualification, refusal, and handoff.";
    const repairResult = await providerAdapter({
      message,
      conversationId,
      requestContext: { persona: "Professional AI Agent Architecture Strategist", memoryTheme: "Bounded request-carried context only", empathyState: "Grounded rewrite", semanticIntent, claimEvaluation: localResult.claimEvaluation },
      retrievalResult: { matchedEntries: localResult.matchedEntries },
      riskFlags: [],
      promptPayload: repairPayload,
      config,
    });
    if (!repairResult.error && repairResult.modelOutput) {
      validation = validateSeleneModelOutput(repairResult.modelOutput, { matchedEntries: localResult.matchedEntries, fallbackResult: localResult });
    }
  }
  if (!validation.valid) return { ...localResult, mode: "local_deterministic", fallbackUsed: true, fallbackReason: `output_validation_failed:${validation.violations.join(",")}`, semanticIntent };
  return {
    ...localResult,
    answer: validation.correctedOutput.answer,
    mode: "staging_llm",
    fallbackUsed: false,
    fallbackReason: "",
    confidence: validation.correctedOutput.groundingStatus === "grounded" ? "high" : "low",
    clarificationNeeded: validation.correctedOutput.groundingStatus === "insufficient_context",
    clarificationQuestion: validation.correctedOutput.suggestedFollowUps[0] || "",
    semanticIntent,
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
    safety: { approvedKnowledgeOnly: true, historyUsedAsEvidence: false, persistentConversationMemory: false, autonomousDelegation: false, customerSystemAccess: false, cafeMaterialUsed: false },
    privacyReminder: "Do not submit PHI, personal data, credentials, confidential architecture, or customer-specific information.",
  } };
  if (adapted.chargeEligible && !adapted.fallbackUsed && !adapted.clarificationNeeded && !isRequestAborted()) await chargeSuccessfulAgentWork({ agentId: "selene-hart", stateStore: agentStateStore, nowMs: now.getTime() });
  return response;
};

export default runSeleneResponseAdapter;

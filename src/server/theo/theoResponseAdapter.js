import crypto from "node:crypto";
import {
  createMiraMemoryRateLimitStore,
  createMiraRateLimitStore,
} from "../mira/miraRateLimitStore.js";
import { runOpenAiMiraAdapter } from "../mira/openAiAdapter.js";
import { resolveAgentIntent } from "../agentIntent/agentIntentResolver.js";
import { runOpenAiAgentIntentProvider } from "../agentIntent/agentIntentOpenAiProvider.js";
import { onesmarterPublicKnowledgeBase } from "../../data/agentKnowledge/onesmarterPublicKb.js";
import { readTheoRuntimeConfig } from "./theoRuntimeConfig.js";
import { runTheoLocalAnalysis, formatTheoVisitorAnswer, normalizeTheoAnalysisForVisitor } from "./theoLocalEngine.js";
import { buildTheoPromptPayload } from "./theoPromptContract.js";
import { validateTheoModelOutput } from "./theoOutputValidator.js";
import {
  chargeSuccessfulAgentWork,
  readAgentDepletionContext,
  sharedAgentStateStore,
} from "../agentState/agentDepletionRuntime.js";

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

export const THEO_SEMANTIC_TOPICS = Object.freeze([
  "theo-professional-role",
  "professional-agent-role-directory",
  "supplied-content-buyer-understanding",
  "supplied-content-clarity",
  "supplied-content-evidence",
  "supplied-content-missing-information",
  "supplied-content-next-step",
  "supplied-content-metadata",
  "supplied-content-ai-readability",
  "supplied-content-comparison",
  "outside-theo-scope",
]);

const THEO_ANALYSIS_TOPICS = new Set(THEO_SEMANTIC_TOPICS.filter((topic) =>
  topic.startsWith("supplied-content-")));
const THEO_ROLE_TOPICS = new Set(["theo-professional-role", "professional-agent-role-directory"]);
const professionalAgentSource = onesmarterPublicKnowledgeBase.find(({ id }) => id === "ai-agentic-services");
export const THEO_APPROVED_ROLE_FACTS = Object.freeze((professionalAgentSource?.sourceFacts || [])
  .filter((fact) => /^(?:Mira Vale|Theo Mercer|Elena Cross|Ravi Sen|Selene Hart)\b/.test(fact)));

const analysisResult = ({ overallAssessment, clarificationNeeded = false, clarificationQuestion = null,
  evidenceStatus = "insufficient", analysisFocus = "scope" }) => ({
  overallAssessment,
  strengths: [],
  findings: [],
  recommendations: [],
  clarificationNeeded,
  clarificationQuestion,
  evidenceStatus,
  analysisFocus,
});

const roleAnalysis = (semanticIntent) => {
  const facts = semanticIntent.topic === "theo-professional-role"
    ? THEO_APPROVED_ROLE_FACTS.filter((fact) => fact.startsWith("Theo Mercer"))
    : THEO_APPROVED_ROLE_FACTS;
  return {
    ...analysisResult({
      overallAssessment: facts.join(" "),
      evidenceStatus: "approved_professional_role",
      analysisFocus: semanticIntent.topic,
    }),
    strengths: facts,
  };
};

const scopeAnalysis = (semanticIntent) => analysisResult({
  overallAssessment: "That request is outside Theo's supplied-content analysis role.",
  clarificationNeeded: true,
  clarificationQuestion: "Provide public website or page content and ask about its clarity, buyer understanding, claims and evidence, supplied metadata, AI readability, or improvements.",
  evidenceStatus: "outside_scope",
  analysisFocus: semanticIntent?.topic || "outside-theo-scope",
});

const missingContentAnalysis = (semanticIntent) => analysisResult({
  overallAssessment: "Theo needs the public website or page content before he can make a supported analysis.",
  clarificationNeeded: true,
  clarificationQuestion: "Please paste the public page text, headings, calls to action, and any metadata you want Theo to analyze.",
  evidenceStatus: "insufficient",
  analysisFocus: semanticIntent?.topic || "supplied-content-analysis",
});

const ambiguousIntentAnalysis = (semanticIntent) => analysisResult({
  overallAssessment: "Theo needs a little more detail to understand which part of the supplied content you want reviewed.",
  clarificationNeeded: true,
  clarificationQuestion: "Which claim, section, comparison, or earlier observation should Theo analyze?",
  evidenceStatus: "insufficient",
  analysisFocus: semanticIntent?.topic || "clarification",
});

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
  verbosityBand = "normal",
  config = readTheoRuntimeConfig(),
  providerAdapter = runOpenAiMiraAdapter,
  intentProvider,
} = {}) => {
  const localAnalysis = runTheoLocalAnalysis({ message, websiteContent });
  if (config.mode !== "staging_llm") {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: false, fallbackReason: "" };
  }
  if (config.provider !== "openai" || !config.providerConfigComplete) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: "missing_provider_config" };
  }

  let providerIntent = null;
  const semanticResolution = await resolveAgentIntent({
    agentIdentity: AGENT,
    message,
    conversationHistory,
    allowedDomains: ["supplied_content_analysis", "agent_role_information"],
    inputGuard: async () => ({
      ok: message.length <= THEO_MESSAGE_LIMIT && websiteContent.length <= THEO_CONTENT_LIMIT &&
        !containsTheoPrivatePatientData(`${message}\n${websiteContent}`),
      error: containsTheoPrivatePatientData(`${message}\n${websiteContent}`)
        ? "private_patient_content"
        : message.length > THEO_MESSAGE_LIMIT ? "message_too_long" : "website_content_too_long",
    }),
    provider: async (request) => {
      const theoRequest = {
        ...request,
        system: `${request.system} The suppliedContentContext field is separate current-request context: when available is true, it is the object being analyzed and references to the page/content may resolve to it rather than conversation history. Choose topic from the strict Theo topic enum. Use a supplied-content topic only when the visitor asks to examine content they provided. Use a role topic only for Theo's professional role or the approved professional-agent directory. Otherwise use outside-theo-scope. Interpret the request without deciding what the supplied page proves.`,
        outputSchema: {
          ...request.outputSchema,
          properties: {
            ...request.outputSchema.properties,
            topic: { ...request.outputSchema.properties.topic, enum: [...THEO_SEMANTIC_TOPICS] },
          },
        },
        input: {
          ...request.input,
          suppliedContentContext: {
            available: Boolean(websiteContent.trim()),
            evidenceType: "visitor_supplied_public_page",
            objectOfAnalysis: Boolean(websiteContent.trim()),
          },
          agentContext: {
            ...request.input.agentContext,
            supportedTopicLabels: THEO_SEMANTIC_TOPICS,
          },
        },
      };
      const result = intentProvider
        ? await intentProvider(theoRequest)
        : await runOpenAiAgentIntentProvider(theoRequest, { config });
      providerIntent = result?.intent || null;
      return result;
    },
  });
  if (!semanticResolution.ok) {
    return { analysis: localAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: semanticResolution.error };
  }

  const semanticIntent = websiteContent.trim() &&
    THEO_ANALYSIS_TOPICS.has(semanticResolution.intent.topic) &&
    providerIntent
    ? {
        ...semanticResolution.intent,
        confidence: providerIntent.confidence,
        clarificationNeeded: providerIntent.clarificationNeeded,
      }
    : semanticResolution.intent;
  if (!semanticResolution.domainAllowed || semanticIntent.topic === "outside-theo-scope") {
    return { analysis: scopeAnalysis(semanticIntent), mode: "local_analysis", fallbackUsed: false, fallbackReason: "", semanticIntent };
  }
  if (semanticIntent.clarificationNeeded) {
    return { analysis: ambiguousIntentAnalysis(semanticIntent), mode: "local_analysis", fallbackUsed: false, fallbackReason: "", semanticIntent };
  }
  const isRoleRequest = THEO_ROLE_TOPICS.has(semanticIntent.topic);
  if (!isRoleRequest && (!THEO_ANALYSIS_TOPICS.has(semanticIntent.topic) || !websiteContent.trim())) {
    return { analysis: missingContentAnalysis(semanticIntent), mode: "local_analysis", fallbackUsed: false, fallbackReason: "", semanticIntent };
  }
  const semanticLocalAnalysis = isRoleRequest
    ? roleAnalysis(semanticIntent)
    : runTheoLocalAnalysis({ message, websiteContent, semanticIntent });
  const approvedRoleFacts = isRoleRequest ? THEO_APPROVED_ROLE_FACTS : [];
  const promptPayload = buildTheoPromptPayload({
    message,
    websiteContent,
    conversationHistory,
    verbosityBand,
    semanticIntent,
    approvedRoleFacts,
  });
  const providerResult = await providerAdapter({
    message,
    conversationId,
    requestContext: { persona: "Professional Analyst", memoryTheme: "Current supplied page only", empathyState: "Precise" },
    retrievalResult: { matchedEntries: [] },
    riskFlags: [], promptPayload, config,
  });
  if (providerResult.error || !providerResult.modelOutput) {
    return { analysis: semanticLocalAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: providerResult.error || "provider_error", semanticIntent };
  }
  let parsedAnalysis;
  try {
    parsedAnalysis = JSON.parse(providerResult.modelOutput.answer);
  } catch {
    return { analysis: semanticLocalAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: "malformed_theo_analysis_json", semanticIntent };
  }
  const validation = validateTheoModelOutput(parsedAnalysis, {
    websiteContent,
    approvedRoleFacts,
    fallbackAnalysis: semanticLocalAnalysis,
    evidenceStatus: isRoleRequest ? "approved_professional_role" : "supplied_content_only",
  });
  if (!validation.valid) {
    return { analysis: semanticLocalAnalysis, mode: "local_analysis", fallbackUsed: true, fallbackReason: `output_validation_failed:${validation.violations.join(",")}`, semanticIntent };
  }
  return { analysis: validation.correctedOutput, mode: "staging_llm", fallbackUsed: false, fallbackReason: "", semanticIntent };
};

export const handleTheoChatRequest = async ({ method = "GET", body, headers = {}, rateLimitStore, agentStateStore = sharedAgentStateStore, isRequestAborted = () => false, now = new Date(), responseAdapter = runTheoResponseAdapter } = {}) => {
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
  if (websiteContent.length > THEO_CONTENT_LIMIT) return errorResult(413, "website_content_too_long", "The supplied page content is too large to analyze. Reduce it to the relevant public page text and try again.", requestId);
  if (containsTheoPrivatePatientData(`${message}\n${websiteContent}`)) return errorResult(400, "private_patient_content", THEO_PRIVATE_CONTENT_MESSAGE, requestId);
  const history = normalizeTheoConversationHistory(parsed.conversationHistory);
  if (!history.ok) return errorResult(history.error.includes("too_long") ? 413 : 400, history.error, history.message, requestId);

  const conversationId = typeof parsed.conversationId === "string" && parsed.conversationId.trim()
    ? parsed.conversationId.trim().slice(0, 120) : crypto.randomUUID();
  const depletion = await readAgentDepletionContext({
    agentId: "theo-mercer",
    stateStore: agentStateStore,
    nowMs: now.getTime(),
  });
  const result = await responseAdapter({
    message,
    websiteContent,
    conversationHistory: history.history,
    conversationId,
    verbosityBand: depletion.verbosityBand,
  });
  const visitorAnalysis = normalizeTheoAnalysisForVisitor(result.analysis);
  const response = {
    status: 200,
    body: {
      requestId, timestamp: now.toISOString(), agent: AGENT, conversationId,
      mode: result.mode, answer: formatTheoVisitorAnswer(visitorAnalysis),
      analysis: visitorAnalysis, evidenceStatus: visitorAnalysis.evidenceStatus,
      fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason,
      privacyReminder: "Submit only public website/page content. Do not include confidential information or personal data.",
    },
  };
  if (!result.fallbackUsed && !visitorAnalysis.clarificationNeeded && !isRequestAborted()) {
    await chargeSuccessfulAgentWork({
      agentId: "theo-mercer",
      stateStore: agentStateStore,
      nowMs: now.getTime(),
    });
  }
  return response;
};

export default runTheoResponseAdapter;

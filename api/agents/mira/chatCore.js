import crypto from "node:crypto";
import { runMiraResponseAdapter } from "./llmAdapter.js";
import { readMiraRuntimeConfig } from "./miraRuntimeConfig.js";
import {
  buildConversationEntityGroups,
  buildGroundedConversationEntities,
  normalizeGroundedConversationEntities,
} from "./miraConversationReferences.js";
import { buildMiraAnswerStructure } from "./miraAnswerStructure.js";

const MAX_MESSAGE_LENGTH = 1000;
const AGENT_NAME = "Mira Vale";
const MODE = "local_harness_mock";
const ENDPOINT = "/api/agents/mira/chat";
const PRIVACY_REMINDER =
  "Do not submit PHI, confidential documents, or private operational details through this public agent.";
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_CONVERSATION_HISTORY_MESSAGES = 6;
const MAX_CONVERSATION_HISTORY_TOTAL_CHARS = 2000;
const MAX_CONVERSATION_HISTORY_MESSAGE_CHARS = 700;
const rateLimitBuckets = new Map();

const createRequestId = (providedRequestId) => {
  if (typeof providedRequestId === "string" && providedRequestId.trim()) {
    return providedRequestId.trim().slice(0, 120);
  }
  return crypto.randomUUID();
};

const jsonError = (status, error, message, metadata = {}) => ({
  status,
  body: {
    requestId: metadata.requestId,
    timestamp: metadata.timestamp,
    agent: AGENT_NAME,
    mode: MODE,
    status,
    error,
    message,
    ...(metadata.retryAfterSeconds
      ? { retryAfterSeconds: metadata.retryAfterSeconds }
      : {}),
  },
});

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === "string") return JSON.parse(body);
  return body;
};

const normalizeConversationId = (conversationId) => {
  if (typeof conversationId === "string" && conversationId.trim()) {
    return conversationId.trim().slice(0, 120);
  }
  return crypto.randomUUID();
};

const normalizePendingClarification = (pendingClarification) => {
  if (!pendingClarification || typeof pendingClarification !== "object") {
    return null;
  }
  const allowedFields = new Set([
    "workflow",
    "needs",
    "industry",
    "outcome",
    "scope",
  ]);
  const field = allowedFields.has(pendingClarification.field)
    ? pendingClarification.field
    : "";
  const questionId =
    typeof pendingClarification.questionId === "string"
      ? pendingClarification.questionId.trim().slice(0, 100)
      : "";
  const sourceGoalId =
    typeof pendingClarification.sourceGoalId === "string"
      ? pendingClarification.sourceGoalId.trim().slice(0, 100)
      : "";
  if (!field || !questionId || !sourceGoalId) return null;
  return {
    field,
    questionId,
    sourceGoalId,
    options: Array.isArray(pendingClarification.options)
      ? pendingClarification.options
          .filter((option) => typeof option === "string" && option.trim())
          .map((option) => option.trim().slice(0, 100))
          .slice(0, 8)
      : [],
  };
};

const normalizeConversationHistory = (conversationHistory) => {
  if (conversationHistory === undefined || conversationHistory === null) {
    return { ok: true, history: [] };
  }

  if (!Array.isArray(conversationHistory)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_conversation_history",
      message: "conversationHistory must be an array when provided.",
    };
  }

  if (conversationHistory.length > MAX_CONVERSATION_HISTORY_MESSAGES) {
    return {
      ok: false,
      status: 413,
      error: "conversation_history_too_long",
      message: `conversationHistory must include ${MAX_CONVERSATION_HISTORY_MESSAGES} messages or fewer.`,
    };
  }

  let totalChars = 0;
  const history = [];

  for (const turn of conversationHistory) {
    if (!turn || typeof turn !== "object" || Array.isArray(turn)) {
      return {
        ok: false,
        status: 400,
        error: "invalid_conversation_history",
        message: "conversationHistory entries must be objects.",
      };
    }

    const role = turn.role;
    const content = typeof turn.content === "string" ? turn.content.trim() : "";

    if (!["user", "assistant"].includes(role) || !content) {
      return {
        ok: false,
        status: 400,
        error: "invalid_conversation_history",
        message:
          "conversationHistory entries must include role user or assistant and non-empty string content.",
      };
    }

    if (content.length > MAX_CONVERSATION_HISTORY_MESSAGE_CHARS) {
      return {
        ok: false,
        status: 413,
        error: "conversation_history_too_long",
        message: `conversationHistory entries must be ${MAX_CONVERSATION_HISTORY_MESSAGE_CHARS} characters or fewer.`,
      };
    }

    totalChars += content.length;
    if (totalChars > MAX_CONVERSATION_HISTORY_TOTAL_CHARS) {
      return {
        ok: false,
        status: 413,
        error: "conversation_history_too_long",
        message: `conversationHistory must be ${MAX_CONVERSATION_HISTORY_TOTAL_CHARS} total characters or fewer.`,
      };
    }

    history.push({
      role,
      content,
      ...(role === "assistant"
        ? {
            conversationEntities: normalizeGroundedConversationEntities(
              turn.conversationEntities,
            ),
            pendingClarification: normalizePendingClarification(
              turn.pendingClarification,
            ),
          }
        : {}),
    });
  }

  return { ok: true, history };
};

const headerValue = (headers = {}, key) => {
  const lowerKey = key.toLowerCase();
  const match = Object.entries(headers).find(
    ([headerName]) => headerName.toLowerCase() === lowerKey,
  );
  const value = match?.[1];
  return Array.isArray(value) ? value[0] : value;
};

const getRateLimitKey = (headers = {}) => {
  const forwardedFor = headerValue(headers, "x-forwarded-for");
  const realIp = headerValue(headers, "x-real-ip");
  const forwardedIp =
    typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : "";
  return forwardedIp || realIp || "anonymous";
};

const checkRateLimit = (key, nowMs = Date.now()) => {
  const existing = rateLimitBuckets.get(key);
  if (!existing || nowMs >= existing.resetAt) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: nowMs + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

export const resetMiraRateLimitForTests = () => {
  rateLimitBuckets.clear();
};

const safeLogEvent = (event, logger = console) => {
  if (!logger?.log) return;
  logger.log(
    JSON.stringify({
      endpoint: ENDPOINT,
      ...event,
    }),
  );
};

const compactSources = (matchedEntries) =>
  matchedEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    route: entry.route,
    sourceLabel: entry.sourceLabel,
    score: entry.score,
  }));

const disclaimerFor = (result) => {
  if (result.riskFlags.includes("phi_or_confidential_data")) {
    return "Do not submit PHI, patient information, confidential documents, or private operational details through the public agent.";
  }
  if (result.mode === "staging_llm" && result.fallbackUsed === false) {
    return "This response is grounded in approved public OneSmarter content.";
  }
  if (result.riskFlags.includes("out_of_scope")) {
    return "Mira answers from approved public OneSmarter content.";
  }
  if (result.riskFlags.length && !result.matchedEntries.length) {
    return "This response was generated by Mira's safety rules.";
  }
  if (result.mode === "local_harness_mock" && result.fallbackUsed === true) {
    return "This is a local harness response grounded in approved public OneSmarter content; business-specific questions should go to care@onesmarter.com.";
  }
  if (result.riskFlags.length || result.handoffNeeded) {
    return "This is a local harness response grounded in approved public OneSmarter content; business-specific questions should go to care@onesmarter.com.";
  }
  return "";
};

const buildAnswer = (result) => {
  if (result.riskFlags.includes("phi_or_confidential_data")) {
    return "I cannot review PHI, confidential documents, or private operational details here. Please do not submit sensitive information through this public agent. For business-specific questions, email care@onesmarter.com.";
  }
  return result.answerSeed;
};

export const handleMiraChatRequest = async ({
  method = "GET",
  body,
  headers = {},
  now = new Date(),
  logger = console,
} = {}) => {
  const timestamp = now.toISOString();
  let parsedBody = {};

  try {
    parsedBody = parseBody(body);
  } catch {
    const requestId = createRequestId();
    const errorResult = jsonError(400, "invalid_json", "Request body must be valid JSON.", {
      requestId,
      timestamp,
    });
    safeLogEvent(
      {
        requestId,
        timestamp,
        method,
        status: errorResult.status,
        mode: MODE,
        conversationId: "",
        messageLength: 0,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "invalid_json",
      },
      logger,
    );
    return errorResult;
  }

  const requestId = createRequestId(parsedBody.requestId || headerValue(headers, "x-request-id"));
  const logBase = {
    requestId,
    timestamp,
    method,
    mode: MODE,
    conversationId:
      typeof parsedBody.conversationId === "string" ? parsedBody.conversationId : "",
  };

  if (method !== "POST") {
    const errorResult = jsonError(405, "method_not_allowed", "Use POST for /api/agents/mira/chat.", {
      requestId,
      timestamp,
    });
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: 0,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "method_not_allowed",
      },
      logger,
    );
    return errorResult;
  }

  const rateLimit = checkRateLimit(getRateLimitKey(headers), now.getTime());
  if (!rateLimit.allowed) {
    const errorResult = jsonError(
      429,
      "rate_limited",
      "Mira is receiving too many requests right now. Please try again shortly or email care@onesmarter.com.",
      {
        requestId,
        timestamp,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    );
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength:
          typeof parsedBody.message === "string" ? parsedBody.message.length : 0,
        riskFlags: [],
        handoffNeeded: true,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "rate_limited",
      },
      logger,
    );
    return errorResult;
  }

  const {
    message,
    conversationId,
    persona,
    memoryTheme,
    empathyState,
    conversationHistory,
  } = parsedBody;

  if (typeof message !== "string") {
    const errorResult = jsonError(400, "missing_message", "message is required and must be a string.", {
      requestId,
      timestamp,
    });
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: 0,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "missing_message",
      },
      logger,
    );
    return errorResult;
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    const errorResult = jsonError(400, "empty_message", "message must not be empty.", {
      requestId,
      timestamp,
    });
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: message.length,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "empty_message",
      },
      logger,
    );
    return errorResult;
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    const errorResult = jsonError(
      413,
      "message_too_long",
      `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      {
        requestId,
        timestamp,
      },
    );
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: trimmedMessage.length,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "message_too_long",
      },
      logger,
    );
    return errorResult;
  }

  const normalizedHistory = normalizeConversationHistory(conversationHistory);
  if (!normalizedHistory.ok) {
    const errorResult = jsonError(
      normalizedHistory.status,
      normalizedHistory.error,
      normalizedHistory.message,
      {
        requestId,
        timestamp,
      },
    );
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: trimmedMessage.length,
        conversationHistoryCount: Array.isArray(conversationHistory)
          ? conversationHistory.length
          : 0,
        conversationHistoryChars: 0,
        riskFlags: [],
        handoffNeeded: false,
        confidence: "",
        matchedSourceIds: [],
        errorCode: normalizedHistory.error,
      },
      logger,
    );
    return errorResult;
  }

  try {
    const runtimeConfig = readMiraRuntimeConfig();
    const result = await runMiraResponseAdapter({
      message: trimmedMessage,
      conversationId,
      persona,
      memoryTheme,
      empathyState,
      conversationHistory: normalizedHistory.history,
      config: runtimeConfig,
    });
    const normalizedConversationId = normalizeConversationId(conversationId);
    const responseConversationEntities = result.resolvedConversationEntities?.length
      ? normalizeGroundedConversationEntities(result.resolvedConversationEntities)
      : buildGroundedConversationEntities(result.matchedEntries);
    const answerStructure = buildMiraAnswerStructure({
      result,
      conversationEntities: responseConversationEntities,
    });
    const responseBody = {
      requestId,
      timestamp,
      agent: AGENT_NAME,
      mode: result.mode || MODE,
      conversationId: normalizedConversationId,
      answer: buildAnswer(result),
      ...(answerStructure ? { answerStructure } : {}),
      answerSeed: result.answerSeed,
      confidence: result.confidence,
      riskFlags: result.riskFlags,
      handoffNeeded: result.handoffNeeded,
      handoffReason: result.handoffReason || null,
      matchedSources: compactSources(result.matchedEntries),
      conversationEntities: responseConversationEntities,
      conversationEntityGroups: buildConversationEntityGroups(
        normalizedHistory.history,
        responseConversationEntities,
        requestId,
      ),
      suggestedFollowUps: result.suggestedFollowUps,
      ...(result.recommendation ? { recommendation: result.recommendation } : {}),
      ...(result.requirementState
        ? {
            requirementState: result.requirementState,
            missingRequirements: result.missingRequirements,
            recommendationReady: result.recommendationReady,
            recommendationReadiness: result.recommendationReadiness,
            activeGoal: result.activeGoal || result.requirementState.activeGoal,
            pendingClarification:
              result.pendingClarification ||
              result.requirementState.pendingClarification ||
              null,
          }
        : {}),
      disclaimer: disclaimerFor(result),
      privacyReminder: PRIVACY_REMINDER,
      requestContext: {
        persona: typeof persona === "string" ? persona : "",
        memoryTheme: typeof memoryTheme === "string" ? memoryTheme : "",
        empathyState: typeof empathyState === "string" ? empathyState : "",
      },
      ...(result.modelProvider ? { modelProvider: result.modelProvider } : {}),
      ...(result.modelName ? { modelName: result.modelName } : {}),
      ...(result.groundingStatus ? { groundingStatus: result.groundingStatus } : {}),
      ...(result.outputSafetyStatus
        ? { outputSafetyStatus: result.outputSafetyStatus }
        : {}),
      ...(typeof result.fallbackUsed === "boolean"
        ? { fallbackUsed: result.fallbackUsed }
        : {}),
      ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
      ...(result.providerErrorType ? { providerErrorType: result.providerErrorType } : {}),
      ...(result.providerErrorCode ? { providerErrorCode: result.providerErrorCode } : {}),
      ...(result.providerErrorParam ? { providerErrorParam: result.providerErrorParam } : {}),
      ...(result.providerResponseStatus
        ? { providerResponseStatus: result.providerResponseStatus }
        : {}),
      ...(result.providerIncompleteReason
        ? { providerIncompleteReason: result.providerIncompleteReason }
        : {}),
      ...(result.providerOutputItemTypes?.length
        ? { providerOutputItemTypes: result.providerOutputItemTypes }
        : {}),
      ...(result.providerContentPartTypes?.length
        ? { providerContentPartTypes: result.providerContentPartTypes }
        : {}),
      ...(result.providerHasRefusal ? { providerHasRefusal: true } : {}),
      ...(Number.isFinite(result.providerUsageInputTokens)
        ? { providerUsageInputTokens: result.providerUsageInputTokens }
        : {}),
      ...(Number.isFinite(result.providerUsageOutputTokens)
        ? { providerUsageOutputTokens: result.providerUsageOutputTokens }
        : {}),
      ...(Number.isFinite(result.providerUsageReasoningTokens)
        ? { providerUsageReasoningTokens: result.providerUsageReasoningTokens }
        : {}),
    };

    safeLogEvent(
      {
        ...logBase,
        conversationId: normalizedConversationId,
        status: 200,
        mode: result.mode || MODE,
        provider: result.modelProvider || "",
        model: result.modelName || "",
        latencyMs: result.providerMetadata?.latencyMs ?? null,
        providerStatus: result.providerMetadata?.providerStatus || "",
        providerHttpStatus: result.providerMetadata?.httpStatus ?? null,
        tokenUsage: result.providerMetadata?.tokenUsage || null,
        validationStatus: result.outputSafetyStatus || "",
        fallbackUsed: Boolean(result.fallbackUsed),
        fallbackReason: result.fallbackReason || "",
        providerErrorType: result.providerMetadata?.providerErrorType || "",
        providerErrorCode: result.providerMetadata?.providerErrorCode || "",
        providerErrorParam: result.providerMetadata?.providerErrorParam || "",
        providerRequestId: result.providerMetadata?.providerRequestId || "",
        providerResponseStatus: result.providerMetadata?.providerResponseStatus || "",
        providerIncompleteReason: result.providerMetadata?.providerIncompleteReason || "",
        providerOutputItemTypes: result.providerMetadata?.providerOutputItemTypes || [],
        providerContentPartTypes: result.providerMetadata?.providerContentPartTypes || [],
        providerHasRefusal: Boolean(result.providerMetadata?.providerHasRefusal),
        providerUsageInputTokens: result.providerMetadata?.providerUsageInputTokens ?? null,
        providerUsageOutputTokens: result.providerMetadata?.providerUsageOutputTokens ?? null,
        providerUsageReasoningTokens: result.providerMetadata?.providerUsageReasoningTokens ?? null,
        messageLength: trimmedMessage.length,
        conversationHistoryCount: normalizedHistory.history.length,
        conversationHistoryChars: normalizedHistory.history.reduce(
          (total, turn) => total + turn.content.length,
          0,
        ),
        riskFlags: result.riskFlags,
        handoffNeeded: result.handoffNeeded,
        confidence: result.confidence,
        matchedSourceIds: result.matchedEntries.map((entry) => entry.id),
        errorCode: "",
      },
      logger,
    );

    return {
      status: 200,
      body: responseBody,
    };
  } catch {
    const errorResult = jsonError(
      500,
      "internal_error",
      "Mira is not available right now. For business inquiries, email care@onesmarter.com.",
      {
        requestId,
        timestamp,
      },
    );
    safeLogEvent(
      {
        ...logBase,
        status: errorResult.status,
        messageLength: trimmedMessage.length,
        riskFlags: [],
        handoffNeeded: true,
        confidence: "",
        matchedSourceIds: [],
        errorCode: "internal_error",
      },
      logger,
    );
    return errorResult;
  }
};

export default handleMiraChatRequest;

import crypto from "node:crypto";
import { runMiraResponseAdapter } from "./llmAdapter.js";
import { readMiraRuntimeConfig } from "./miraRuntimeConfig.js";

const MAX_MESSAGE_LENGTH = 1000;
const AGENT_NAME = "Mira Vale";
const MODE = "local_harness_mock";
const ENDPOINT = "/api/agents/mira/chat";
const PRIVACY_REMINDER =
  "Do not submit PHI, confidential documents, or private operational details through this public agent.";
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
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

  const { message, conversationId, persona, memoryTheme, empathyState } = parsedBody;

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

  try {
    const runtimeConfig = readMiraRuntimeConfig();
    const result = await runMiraResponseAdapter({
      message: trimmedMessage,
      conversationId,
      persona,
      memoryTheme,
      empathyState,
      config: runtimeConfig,
    });
    const normalizedConversationId = normalizeConversationId(conversationId);
    const responseBody = {
      requestId,
      timestamp,
      agent: AGENT_NAME,
      mode: result.mode || MODE,
      conversationId: normalizedConversationId,
      answer: buildAnswer(result),
      answerSeed: result.answerSeed,
      confidence: result.confidence,
      riskFlags: result.riskFlags,
      handoffNeeded: result.handoffNeeded,
      handoffReason: result.handoffReason || null,
      matchedSources: compactSources(result.matchedEntries),
      suggestedFollowUps: result.suggestedFollowUps,
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

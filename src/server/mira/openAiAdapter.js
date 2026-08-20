export const OPENAI_STAGING_MODE = "staging_llm";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TEMPERATURE_ONLY_MODELS = [/^gpt-5(?:$|-)/i];
const REASONING_EFFORT_MODELS = [];

const miraStructuredOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "answer",
    "handoffNeeded",
    "handoffReason",
    "suggestedFollowUps",
    "groundingStatus",
    "outputSafetyStatus",
  ],
  properties: {
    answer: { type: "string" },
    handoffNeeded: { type: "boolean" },
    handoffReason: { type: ["string", "null"] },
    suggestedFollowUps: {
      type: "array",
      items: { type: "string" },
    },
    groundingStatus: {
      type: "string",
      enum: ["grounded", "insufficient_context", "refused"],
    },
    outputSafetyStatus: {
      type: "string",
      enum: ["passed", "corrected", "refused"],
    },
  },
};

const buildProviderInput = ({ promptPayload }) =>
  [
    promptPayload.context,
    promptPayload.avoidClaims,
    "",
    "User and presentation context:",
    promptPayload.user,
    "",
    "Detected risk flags:",
    JSON.stringify(promptPayload.riskFlags || []),
  ].join("\n");

const uniqueSafeStrings = (values) =>
  [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].map((value) =>
    value.trim().slice(0, 80),
  );

const outputDetailsFrom = (responseJson) => {
  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const outputItemTypes = [];
  const contentPartTypes = [];
  let hasRefusal = false;

  for (const item of output) {
    outputItemTypes.push(item?.type);
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      contentPartTypes.push(contentItem?.type);
      if (contentItem?.type === "refusal") {
        hasRefusal = true;
      }
    }
  }

  return {
    providerResponseStatus: safeString(responseJson?.status),
    providerIncompleteReason: safeString(responseJson?.incomplete_details?.reason),
    providerOutputItemTypes: uniqueSafeStrings(outputItemTypes),
    providerContentPartTypes: uniqueSafeStrings(contentPartTypes),
    providerHasRefusal: hasRefusal,
  };
};

const extractOutputText = (responseJson) => {
  if (typeof responseJson?.output_text === "string") {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  for (const item of output) {
    if (item?.type && item.type !== "message") continue;
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      if (contentItem?.type === "refusal") continue;
      if (contentItem?.type === "output_text" && typeof contentItem?.text === "string") {
        return contentItem.text;
      }
      if (typeof contentItem?.output_text === "string") return contentItem.output_text;
    }
  }

  return "";
};

const parseModelOutput = (responseJson) => {
  const outputDetails = outputDetailsFrom(responseJson);
  if (outputDetails.providerResponseStatus === "incomplete") {
    return {
      modelOutput: null,
      parseError: outputDetails.providerIncompleteReason
        ? `provider_incomplete_${outputDetails.providerIncompleteReason}`
        : "provider_incomplete",
      outputDetails,
    };
  }

  if (outputDetails.providerHasRefusal) {
    return { modelOutput: null, parseError: "provider_refusal", outputDetails };
  }

  const outputText = extractOutputText(responseJson);
  if (!outputText) {
    return { modelOutput: null, parseError: "missing_output_text", outputDetails };
  }

  try {
    return { modelOutput: JSON.parse(outputText), parseError: "", outputDetails };
  } catch {
    return { modelOutput: null, parseError: "malformed_model_json", outputDetails };
  }
};

const usageFrom = (responseJson) => {
  const usage = responseJson?.usage || {};
  return {
    inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? null,
    outputTokens: usage.output_tokens ?? usage.completion_tokens ?? null,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
  };
};

const safeString = (value) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : "";

const headerValue = (headers, key) => {
  if (!headers?.get) return "";
  return safeString(headers.get(key));
};

const safeProviderErrorFrom = async (response) => {
  let responseJson = {};
  try {
    responseJson = await response.json();
  } catch {
    responseJson = {};
  }

  const error = responseJson?.error && typeof responseJson.error === "object"
    ? responseJson.error
    : {};

  return {
    providerErrorType: safeString(error.type),
    providerErrorCode: safeString(error.code),
    providerErrorParam: safeString(error.param),
    providerRequestId:
      headerValue(response.headers, "x-request-id") ||
      headerValue(response.headers, "openai-request-id"),
  };
};

export const supportsCustomTemperature = (model = "") =>
  !DEFAULT_TEMPERATURE_ONLY_MODELS.some((pattern) => pattern.test(model));

export const supportsReasoningEffort = (model = "") =>
  REASONING_EFFORT_MODELS.some((pattern) => pattern.test(model));

export const buildOpenAiResponsesRequest = ({ promptPayload, config }) => {
  const body = {
    model: config.model,
    instructions: promptPayload.system,
    input: buildProviderInput({ promptPayload }),
    max_output_tokens: config.maxTokens,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "mira_response",
        strict: true,
        schema: miraStructuredOutputSchema,
      },
    },
  };

  if (Number.isFinite(config.temperature) && supportsCustomTemperature(config.model)) {
    body.temperature = config.temperature;
  }

  if (supportsReasoningEffort(config.model)) {
    body.reasoning = {
      effort: config.reasoningEffort || "minimal",
    };
  }

  return body;
};

export const runOpenAiMiraAdapter = async ({
  message,
  conversationId,
  requestContext,
  retrievalResult,
  riskFlags,
  promptPayload,
  config,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const startedAt = Date.now();

  if (!fetchImpl) {
    return {
      provider: "openai",
      mode: OPENAI_STAGING_MODE,
      implemented: true,
      modelOutput: null,
      error: "fetch_unavailable",
      metadata: {
        latencyMs: Date.now() - startedAt,
        httpStatus: null,
        tokenUsage: null,
        providerStatus: "not_called",
        fallbackReason: "fetch_unavailable",
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildOpenAiResponsesRequest({ promptPayload, config })),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const providerError = await safeProviderErrorFrom(response);
      return {
        provider: "openai",
        mode: OPENAI_STAGING_MODE,
        implemented: true,
        modelOutput: null,
        error: "provider_error",
        metadata: {
          latencyMs,
          httpStatus: response.status,
          tokenUsage: null,
          providerStatus: "error",
          fallbackReason: `provider_http_${response.status}`,
          ...providerError,
        },
      };
    }

    const responseJson = await response.json();
    const { modelOutput, parseError, outputDetails } = parseModelOutput(responseJson);
    const tokenUsage = usageFrom(responseJson);

    return {
      provider: "openai",
      mode: OPENAI_STAGING_MODE,
      implemented: true,
      modelOutput,
      error: parseError,
      metadata: {
        latencyMs,
        httpStatus: response.status,
        tokenUsage,
        providerStatus: parseError ? "malformed" : "ok",
        fallbackReason: parseError,
        providerUsageInputTokens: tokenUsage.inputTokens,
        providerUsageOutputTokens: tokenUsage.outputTokens,
        providerUsageReasoningTokens: tokenUsage.reasoningTokens,
        ...outputDetails,
        providerRequestId:
          headerValue(response.headers, "x-request-id") ||
          headerValue(response.headers, "openai-request-id"),
        messageLength: typeof message === "string" ? message.length : 0,
        conversationId: typeof conversationId === "string" ? conversationId : "",
        requestContext: {
          persona: requestContext?.persona || "",
          memoryTheme: requestContext?.memoryTheme || "",
          empathyState: requestContext?.empathyState || "",
        },
        matchedSourceIds: (retrievalResult?.matchedEntries || []).map((entry) => entry.id),
        riskFlags: Array.isArray(riskFlags) ? riskFlags : [],
        configuredProvider: config?.provider || "",
        configuredModel: config?.model || "",
        apiKeyConfigured: Boolean(config?.apiKeyConfigured),
      },
    };
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    return {
      provider: "openai",
      mode: OPENAI_STAGING_MODE,
      implemented: true,
      modelOutput: null,
      error: isTimeout ? "provider_timeout" : "provider_exception",
      metadata: {
        latencyMs: Date.now() - startedAt,
        httpStatus: null,
        tokenUsage: null,
        providerStatus: isTimeout ? "timeout" : "exception",
        fallbackReason: isTimeout ? "provider_timeout" : "provider_exception",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

export default runOpenAiMiraAdapter;

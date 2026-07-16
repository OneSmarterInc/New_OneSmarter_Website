export const OPENAI_STAGING_MODE = "staging_llm";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

const extractOutputText = (responseJson) => {
  if (typeof responseJson?.output_text === "string") {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") return contentItem.text;
      if (typeof contentItem?.output_text === "string") return contentItem.output_text;
    }
  }

  return "";
};

const parseModelOutput = (responseJson) => {
  const outputText = extractOutputText(responseJson);
  if (!outputText) {
    return { modelOutput: null, parseError: "missing_output_text" };
  }

  try {
    return { modelOutput: JSON.parse(outputText), parseError: "" };
  } catch {
    return { modelOutput: null, parseError: "malformed_model_json" };
  }
};

const usageFrom = (responseJson) => {
  const usage = responseJson?.usage || {};
  return {
    inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? null,
    outputTokens: usage.output_tokens ?? usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
  };
};

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

  if (Number.isFinite(config.temperature)) {
    body.temperature = config.temperature;
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
        },
      };
    }

    const responseJson = await response.json();
    const { modelOutput, parseError } = parseModelOutput(responseJson);

    return {
      provider: "openai",
      mode: OPENAI_STAGING_MODE,
      implemented: true,
      modelOutput,
      error: parseError,
      metadata: {
        latencyMs,
        httpStatus: response.status,
        tokenUsage: usageFrom(responseJson),
        providerStatus: parseError ? "malformed" : "ok",
        fallbackReason: parseError,
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

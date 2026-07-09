export const OPENAI_STUB_MODE = "staging_llm_stub";

export const runOpenAiMiraAdapter = ({
  message,
  conversationId,
  requestContext,
  retrievalResult,
  riskFlags,
  promptPayload,
  config,
} = {}) => ({
  provider: "openai",
  mode: OPENAI_STUB_MODE,
  implemented: false,
  modelOutput: null,
  error: "openai_adapter_not_implemented",
  metadata: {
    messageLength: typeof message === "string" ? message.length : 0,
    conversationId: typeof conversationId === "string" ? conversationId : "",
    requestContext: {
      persona: requestContext?.persona || "",
      memoryTheme: requestContext?.memoryTheme || "",
      empathyState: requestContext?.empathyState || "",
    },
    matchedSourceIds: (retrievalResult?.matchedEntries || []).map((entry) => entry.id),
    riskFlags: Array.isArray(riskFlags) ? riskFlags : [],
    promptSections: promptPayload ? Object.keys(promptPayload) : [],
    configuredProvider: config?.provider || "",
    configuredModel: config?.model || "",
    apiKeyConfigured: Boolean(config?.apiKeyConfigured),
  },
});

export default runOpenAiMiraAdapter;

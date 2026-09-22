import { reasoningEffortForModel, supportsCustomTemperature } from "../mira/openAiAdapter.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const outputTextFrom = (payload) => {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
};

export const runOpenAiAgentIntentProvider = async (request, { config, fetchImpl = globalThis.fetch } = {}) => {
  if (!fetchImpl || !config?.providerConfigComplete) throw new Error("intent_provider_unavailable");
  const body = {
    model: config.model,
    instructions: request.system,
    input: JSON.stringify(request.input),
    max_output_tokens: Math.max(900, config.maxTokens || 0),
    store: false,
    text: { format: { type: "json_schema", name: "agent_semantic_intent", strict: true, schema: request.outputSchema } },
  };
  if (Number.isFinite(config.temperature) && supportsCustomTemperature(config.model)) body.temperature = config.temperature;
  const reasoningEffort = reasoningEffortForModel(config.model, config.reasoningEffort);
  if (reasoningEffort) body.reasoning = { effort: reasoningEffort };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`intent_provider_http_${response.status}`);
    const payload = await response.json();
    if (payload?.status === "incomplete") throw new Error("intent_provider_incomplete");
    const outputText = outputTextFrom(payload);
    if (!outputText) throw new Error("intent_provider_empty_output");
    return { intent: JSON.parse(outputText) };
  } finally {
    clearTimeout(timeout);
  }
};

export default runOpenAiAgentIntentProvider;

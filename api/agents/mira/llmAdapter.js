import { runMiraLocalHarness } from "../../../src/data/agentKnowledge/miraLocalEngine.js";
import { runOpenAiMiraAdapter } from "./openAiAdapter.js";
import { buildMiraPromptPayload } from "./miraPromptContract.js";

export const LOCAL_HARNESS_MODE = "local_harness_mock";

const unavailableResponse = (message) => ({
  question: message,
  normalizedQuestion: "",
  riskFlags: [],
  confidence: "low",
  matchedEntries: [],
  answerSeed:
    "Mira is not available right now. For business inquiries, email care@onesmarter.com.",
  handoffNeeded: true,
  handoffReason: "llm_mode_off",
  suggestedFollowUps: ["Email care@onesmarter.com for business follow-up."],
  mode: "off",
});

export const runMiraResponseAdapter = ({
  message,
  conversationId,
  persona,
  memoryTheme,
  empathyState,
  config,
  localHarness = runMiraLocalHarness,
  openAiAdapter = runOpenAiMiraAdapter,
} = {}) => {
  if (config?.mode === "off") {
    return unavailableResponse(message);
  }

  const localResult = localHarness(message);

  if (
    ["staging_llm", "production_llm"].includes(config?.mode) &&
    config?.provider === "openai"
  ) {
    const requestContext = {
      persona: typeof persona === "string" ? persona : "",
      memoryTheme: typeof memoryTheme === "string" ? memoryTheme : "",
      empathyState: typeof empathyState === "string" ? empathyState : "",
    };
    const promptPayload = buildMiraPromptPayload({
      message,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      requestContext,
    });
    const providerStub = openAiAdapter({
      message,
      conversationId,
      requestContext,
      retrievalResult: localResult,
      riskFlags: localResult.riskFlags,
      promptPayload,
      config,
    });

    return {
      ...localResult,
      mode: LOCAL_HARNESS_MODE,
      providerStub,
    };
  }

  return {
    ...localResult,
    mode: LOCAL_HARNESS_MODE,
  };
};

export default runMiraResponseAdapter;

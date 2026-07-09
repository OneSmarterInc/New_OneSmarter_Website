import { runMiraLocalHarness } from "../../../src/data/agentKnowledge/miraLocalEngine.js";

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
  config,
  localHarness = runMiraLocalHarness,
} = {}) => {
  if (config?.mode === "off") {
    return unavailableResponse(message);
  }

  // `staging_llm` and `production_llm` are intentionally placeholders for now.
  // Until a reviewed provider adapter exists, they fall back to the local harness.
  return {
    ...localHarness(message),
    mode: LOCAL_HARNESS_MODE,
  };
};

export default runMiraResponseAdapter;

import assert from "node:assert/strict";
import { runMiraLocalHarness } from "../src/data/agentKnowledge/miraLocalEngine.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";

const config = {
  mode: "staging_llm",
  provider: "openai",
  providerConfigComplete: true,
  model: "test-model",
  apiKeyConfigured: true,
};

const intentFor = (domain, overrides = {}) => ({
  domain,
  topic: "general concept",
  entities: [],
  proposition: "the visitor requests general information",
  polarity: "positive",
  negationScope: [],
  questionType: "status",
  speechAct: "question",
  requestedDetail: "a concise explanation",
  followUpReferences: [],
  confidence: 0.94,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const runCase = async ({ message, intent, expected, generated = false, history = [] }) => {
  let generationCalls = 0;
  const result = await runMiraResponseAdapter({
    message,
    conversationHistory: history,
    config,
    semanticIntentProvider: async () => ({ intent }),
    openAiAdapter: async () => {
      generationCalls += 1;
      return {
        modelOutput: {
          answer: "In general usage, a platform is a foundation on which related tools or services can operate. This is general information, not a statement about OneSmarter.",
          handoffNeeded: true,
          handoffReason: "general_information_only",
          suggestedFollowUps: [],
          groundingStatus: "insufficient_context",
          outputSafetyStatus: "passed",
        },
      };
    },
  });
  assert.equal(generationCalls, generated ? 1 : 0, message);
  assert.doesNotMatch(result.answerSeed, /That request is outside Mira's approved public-content scope/i, message);
  assert.match(result.answerSeed, expected, message);
  return result;
};

await runCase({
  message: "In plain language, what does reciprocity mean?",
  intent: intentFor("general_definition", { topic: "reciprocity", requestedDetail: "plain-language meaning of reciprocity" }),
  expected: /platform|general information/i,
  generated: true,
});

await runCase({
  message: "Is it sensible to avoid personal details in public conversations?",
  intent: intentFor("privacy_general", { topic: "safe sharing of private information", questionType: "positive_yes_no" }),
  expected: /avoid sharing|privacy guidance/i,
});

await runCase({
  message: "zxqv plmno",
  intent: intentFor("meaningless_input", { topic: "", proposition: "", requestedDetail: "", confidence: 0.2, clarificationNeeded: true }),
  expected: /clear question|rephrase/i,
});

await runCase({
  message: "Who is Jordan from my office?",
  intent: intentFor("person_specific", { topic: "Jordan", entities: ["Jordan"], mentionedNames: ["Jordan"] }),
  expected: /person or organization/i,
});

await runCase({
  message: "Choose an AI operating model for our company.",
  intent: intentFor("customer_strategy", { topic: "customer-specific AI operating model", questionType: "recommendation_request", speechAct: "recommendation_request" }),
  expected: /customer-specific strategy|scoped discussion/i,
});

await runCase({
  message: "What is tomorrow's weather?",
  intent: intentFor("unrelated_factual", { topic: "tomorrow's weather", questionType: "status" }),
  expected: /tomorrow's weather|outside Mira/i,
});

await runCase({
  message: "Does OneSmarter support an unlisted proprietary connector?",
  intent: intentFor("unsupported_factual_request", { topic: "an unlisted proprietary connector", entities: ["OneSmarter"] }),
  expected: /does not establish|approved OneSmarter/i,
});

const acknowledgement = await runCase({
  message: "Much appreciated.",
  intent: intentFor("conversational_acknowledgement", { topic: "acknowledgement", questionType: "unknown", speechAct: "unknown" }),
  expected: /sure|welcome|glad|happy/i,
});
assert.equal(acknowledgement.semanticAcknowledgementHandled, true);

const supported = runMiraLocalHarness("What is OneSmarter?");
assert.equal(supported.matchedEntries.length > 0, true);
assert.match(supported.answerSeed, /OneSmarter/i);

console.log("Mira contextual scope tests passed.");

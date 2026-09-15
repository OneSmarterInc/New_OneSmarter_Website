import assert from "node:assert/strict";
import { runElenaResponseAdapter } from "../src/server/elena/elenaResponseAdapter.js";
import { runSeleneLocalEngine } from "../src/server/selene/seleneLocalEngine.js";
import { runSeleneResponseAdapter } from "../src/server/selene/seleneResponseAdapter.js";

const socIntent = {
  domain: "compliance", topic: "soc2-attested", entities: ["attestation", "certification"],
  proposition: "Attestation differs from certification", polarity: "positive", negationScope: [],
  questionType: "why", speechAct: "explanation_request", requestedDetail: "terminology distinction",
  followUpReferences: [], confidence: 0.98, clarificationNeeded: false, mentionedNames: [],
};
const elena = await runElenaResponseAdapter({
  message: "Explain why those compliance status terms are different.",
  config: { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "test" },
  intentProvider: async () => ({ intent: socIntent }),
  providerAdapter: async () => ({ error: "test_fallback" }),
});
assert.equal(elena.sources.some(({ id }) => id === "soc2-attested"), true);
assert.match(elena.answer, /attested|attestation/i);
assert.equal(elena.clarificationNeeded, false);

const recommendation = runSeleneLocalEngine({
  message: "Select an architecture for this organization.",
  semanticIntent: {
    domain: "agent_architecture", topic: "OneSmarter Focused-Agent Architecture",
    entities: ["visitor organization"], proposition: "Select an architecture for the visitor organization",
    polarity: "positive", questionType: "recommendation_request", requestedDetail: "architecture selection",
    clarificationNeeded: false,
  },
});
assert.match(recommendation.answer, /cannot choose or design a customer-specific architecture/i);
assert.match(recommendation.answer, /care@onesmarter\.com/i);
assert.doesNotMatch(recommendation.answer, /transferred|Ask Mira/i);

const collective = await runSeleneResponseAdapter({
  message: "May the professional agents hand work to each other automatically?",
  config: { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "test" },
  intentProvider: async () => ({ intent: {
    domain: "agent_orchestration", topic: "Current Orchestration and Future Collaboration Boundary",
    entities: ["professional agents"], proposition: "Professional agents can automatically hand work to each other",
    polarity: "positive", negationScope: [], questionType: "positive_yes_no", speechAct: "question",
    requestedDetail: "current autonomous collaboration", followUpReferences: [], confidence: 0.98,
    clarificationNeeded: false, mentionedNames: [],
  } }),
  providerAdapter: async () => ({ error: "test_fallback" }),
});
assert.equal(collective.sources.some(({ id }) => id === "current-orchestration-vs-future-collaboration"), true);
assert.equal(collective.clarificationNeeded, false);
assert.match(collective.answer, /not currently implemented|not.*autonomous/i);

console.log("Final targeted Elena and Selene tests passed.");

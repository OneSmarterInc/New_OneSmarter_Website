import assert from "node:assert/strict";
import { validateElenaModelOutput } from "../src/server/elena/elenaOutputValidator.js";
import { resolveElenaSemanticClaimPolicy } from "../src/server/elena/elenaResponseAdapter.js";
import { runElenaResponseAdapter } from "../src/server/elena/elenaResponseAdapter.js";
import { elenaApprovedKnowledge } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const soc = elenaApprovedKnowledge.find(e => e.id === "soc2-attested");
const terminology = elenaApprovedKnowledge.find(e => e.id === "assurance-terminology");
const definitions = terminology.sourceFacts;
assert.equal(terminology.terminologyReferences.length, 2);
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null,
  suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" });
const cases = [
  ["What is the difference between SOC 2 attestation and certification?", "comparison", "positive"],
  ["How does a controls examination differ from a conformity certificate?", "comparison", "unknown"],
  ["Why is the SOC report described as an attestation?", "why", "positive"],
  ["Does that mean OneSmarter is SOC 2 certified?", "positive_yes_no", "positive"],
  ["So an attestation is not a blanket compliance guarantee?", "negative_confirmation", "negative"],
  ["How does that differ from certification?", "follow_up", "unknown"],
];
// Fixtures verify retrieval, prompt and validation, not live language-model comprehension.
for (const [message, questionType, polarity] of cases) {
  const semantic = { domain: "compliance", topic: soc.id, entities: ["SOC 2", "OneSmarter"],
    proposition: "Compare SOC 2 attestation with certification", polarity, negationScope: [],
    questionType, speechAct: "explanation_request", requestedDetail: "process and output of each assurance term",
    followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [] };
  const result = await runElenaResponseAdapter({ message, config,
    conversationHistory: [{ role: "user", content: "Explain SOC 2 terminology." }],
    intentProvider: async () => ({ intent: semantic }),
    providerAdapter: async ({ promptPayload, retrievalResult, requestContext }) => {
      assert.ok(retrievalResult.matchedEntries.some(e => e.id === soc.id));
      for (const fact of definitions) assert.ok(promptPayload.context.includes(fact));
      assert.ok(promptPayload.system.includes("Qualify only the unsupported portion"));
      assert.equal(requestContext.semanticIntent.questionType, questionType);
      assert.equal(requestContext.semanticIntent.polarity, polarity);
      return { modelOutput: envelope(`${definitions.slice(0, 4).join(" ")} OneSmarter is SOC 2 Type II Attested, not SOC 2 certified.`) };
    },
  });
  assert.equal(result.fallbackUsed, false, `${message}: ${result.fallbackReason}`);
  assert.ok(result.answer.includes("independent auditor's report"));
  assert.ok(result.answer.includes("third-party confirmation"));
}
const unrelated = await runElenaResponseAdapter({ message: "Predict next week's weather", config,
  intentProvider: async () => ({ intent: { domain: "weather", topic: "outside-elena-scope", entities: [],
    proposition: "Predict weather", polarity: "unknown", negationScope: [], questionType: "unknown",
    speechAct: "question", requestedDetail: "forecast", followUpReferences: [], confidence: 0.99,
    clarificationNeeded: false, mentionedNames: [] } }),
  providerAdapter: async ({ retrievalResult }) => {
    assert.equal(retrievalResult.matchedEntries.length, 0);
    return { error: "unavailable" };
  },
});
assert.equal(unrelated.clarificationNeeded, true);
console.log(`Elena terminology: ${cases.length} semantic variants, evidence availability, validation and unrelated scope passed.`);

// Definitions must not launder an unsupported corporate claim through lexical overlap.
const expandedEvidence = [soc, terminology];
assert.equal(validateElenaModelOutput(envelope("SOC 2 certification covers every OneSmarter platform."), {
  matchedEntries: expandedEvidence,
  claimEvaluation: resolveElenaSemanticClaimPolicy({ topic: soc.id }).claimEvaluation,
}).valid, false);
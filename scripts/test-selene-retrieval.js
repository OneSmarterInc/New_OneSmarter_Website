import assert from "node:assert/strict";
import { seleneApprovedKnowledge } from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";
import { retrieveSeleneSemanticKnowledge } from "../src/server/selene/seleneSemanticRetrieval.js";
import { runSeleneResponseAdapter } from "../src/server/selene/seleneResponseAdapter.js";

const entry = seleneApprovedKnowledge.find(({ id }) => id === "operational-state-vs-factual-accuracy");
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const intent = (topic) => ({
  domain: "agent_architecture", topic, entities: [], proposition: "Explain the agent's operational state",
  polarity: "positive", negationScope: [], questionType: "how", speechAct: "explanation_request",
  requestedDetail: "response manner and recovery", followUpReferences: [], confidence: 0.95,
  clarificationNeeded: false, mentionedNames: [],
});
const questions = [
  "What is depletion?", "Why does an agent get tired?", "Does depletion affect accuracy?",
  "Can agents recover energy?", "After repeated work, why might the replies become briefer?",
  "Does a rest change which facts a specialist can rely on?",
];
for (const message of questions) {
  let retrievalCalls = 0;
  let classified = false;
  const result = await runSeleneResponseAdapter({ message, config,
    conversationHistory: [{ role: "user", content: "Why have separate agent roles?" }, { role: "assistant", content: "Roles have separate responsibilities." }],
    intentProvider: async (request) => {
      classified = true;
      const catalog = request.input.agentContext.approvedProfessionalTopicLabels;
      assert.equal(catalog.length, seleneApprovedKnowledge.length);
      assert.equal(catalog.find(({ id }) => id === entry.id).description, entry.approvedSummary);
      assert.ok(request.outputSchema.properties.topic.enum.includes(entry.id));
      assert.ok(request.system.includes("current explicit subject"));
      // Simulate a free-form subject from a provider rather than an exact catalog title.
      return { intent: intent("Response effort and recovery") };
    },
    retrievalProvider: async (request) => {
      retrievalCalls++;
      assert.equal(request.input.currentVisitorMessage, message);
      assert.equal(request.input.catalog.length, seleneApprovedKnowledge.length);
      assert.equal(request.input.catalog.find(({ id }) => id === entry.id).description, entry.approvedSummary);
      assert.ok(request.system.includes("paraphrases"));
      return { intent: { entryId: entry.id, confidence: 0.98 } };
    },
    providerAdapter: async ({ retrievalResult }) => {
      assert.deepEqual(retrievalResult.matchedEntries.map(({ id }) => id), [entry.id]);
      // Generation failure must still use the selected approved knowledge, not a menu.
      return { error: "simulated_answer_timeout" };
    },
  });
  assert.equal(classified, true);
  assert.equal(retrievalCalls, 1);
  assert.equal(result.clarificationNeeded, false, message);
  assert.deepEqual(result.matchedEntries.map(({ id }) => id), [entry.id]);
  assert.ok(result.answer.includes("facts") && result.answer.includes("safety") && result.answer.includes("correctness"), message);
  assert.ok(!result.answer.includes("What would you like to review?"));
  assert.ok(!result.answer.includes("40") && !result.answer.includes("100"));
}
for (const topic of [entry.id, entry.title]) {
  const selected = await retrieveSeleneSemanticKnowledge({ message: "Explain this concept", semanticIntent: intent(topic), config,
    provider: async () => { throw new Error("Exact semantic catalog match must not require another call"); },
  });
  assert.equal(selected.id, entry.id);
}
for (const selection of [
  { entryId: "invented-entry", confidence: 0.99 },
  { entryId: entry.id, confidence: 0.3 },
  { entryId: entry.id, confidence: 2 },
  { entryId: null, confidence: 0.9 },
  {},
]) {
  assert.equal(await retrieveSeleneSemanticKnowledge({ message: "An unresolved request", semanticIntent: intent("unresolved subject"), config,
    provider: async () => ({ intent: selection }),
  }), null);
}
assert.equal(await retrieveSeleneSemanticKnowledge({ message: "Explain this", semanticIntent: intent("unresolved subject"), config,
  provider: async () => { throw new Error("unavailable"); },
}), null);
let outsideRetrievalCalls = 0;
const outside = await runSeleneResponseAdapter({ message: "Design our hospital architecture", config,
  intentProvider: async () => ({ intent: { ...intent("unknown"), domain: "customer_architecture" } }),
  retrievalProvider: async () => { outsideRetrievalCalls++; return { intent: { entryId: entry.id, confidence: 1 } }; },
  providerAdapter: async () => ({ error: "simulated_answer_timeout" }),
});
assert.equal(outsideRetrievalCalls, 0, "semantic retrieval must not widen scope");
assert.deepEqual(outside.matchedEntries, []);
assert.equal(outside.clarificationNeeded, true);
console.log("Selene semantic retrieval regression tests passed (short questions, paraphrases, history, exact IDs, unknown IDs, outages and scope isolation).");

import assert from "node:assert/strict";
import { seleneApprovedKnowledge } from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";
import { retrieveSeleneKnowledge } from "../src/server/selene/seleneLocalEngine.js";
import { runSeleneResponseAdapter } from "../src/server/selene/seleneResponseAdapter.js";

// Retrieval regression only, not end-to-end LLM validation. Raw visitor text
// exercises scoring independently of the injected semantic interpretation.
// Live verification already established that "How are your agents built?" and
// "How do your agents communicate?" resolve semantically despite lexical misses.
// These fixtures do not re-prove that live result or alter the lexical gates.
const cases = [
  ["Why does OneSmarter use focused agents rather than a single chatbot?", "agent-architecture-overview"],
  ["How do you separate professional agent responsibilities?", "professional-agent-role-separation"],
  ["Can agents delegate production work to each other today?", "current-orchestration-vs-future-collaboration"],
  ["What agent collaboration is planned for the future?", "current-orchestration-vs-future-collaboration"],
  ["How are Café conversations reviewed before publication?", "cafe-review-and-publication-gate"],
  ["Who approves a Café conversation for the public rotation?", "cafe-review-and-publication-gate"],
  ["How is approved knowledge kept separate from Café conversation?", "canonical-knowledge-boundary"],
  ["What prevents an agent from making unsupported claims?", "claim-validation-and-fail-closed-design"],
  ["Can your professional agents change something in our customer systems?", "professional-agent-role-separation", "live_system_action", "semantic-live-system-action-boundary", "professional-cafe-separation"],
  ["Can you recommend a custom agent architecture for my company?", "agent-architecture-overview", "agent_architecture", "semantic-customer-specific-strategy"],
];
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "fixture" };
for (const [message, id, domain = "agent_architecture", boundaryRule, scoredId = id] of cases) {
  // Punctuation/case normalization cannot turn any full visitor question into
  // a catalog ID/title. Thus these calls cannot use the exact-title shortcut.
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9é\s/-]/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(seleneApprovedKnowledge.every(entry =>
    [entry.id, entry.title].every(value => normalize(value) !== normalize(message))), message);
  const scored = retrieveSeleneKnowledge(message);
  assert.ok(scored.length, `${message}: STOP — unexpected empty scored retrieval`);
  assert.ok(scored.some(entry => entry.id === scoredId), `${message}: expected scored evidence ${scoredId}`);
  assert.ok(scored.length <= 3, "default retrieval window");

  let intentCalls = 0;
  let generationCalls = 0;
  const result = await runSeleneResponseAdapter({ message, config,
    intentProvider: async request => {
      intentCalls++;
      assert.equal(request.input.currentVisitorMessage, message);
      assert.ok(request.input.agentContext.approvedProfessionalTopicLabels.some(entry => entry.id === id));
      return { intent: {
        domain, topic: id, entities: ["OneSmarter agents"], proposition: message,
        polarity: "positive", negationScope: [],
        questionType: boundaryRule === "semantic-customer-specific-strategy" ? "recommendation_request" : "how",
        speechAct: "question", requestedDetail: message, followUpReferences: [],
        confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
      } };
    },
    retrievalProvider: async () => assert.fail("Canonical semantic topic should not need another provider"),
    providerAdapter: async request => {
      generationCalls++;
      assert.deepEqual(request.retrievalResult.matchedEntries.map(entry => entry.id), [id]);
      // Deliberate generation outage: evidence and claim decisions must survive.
      // It must not be mistaken for an empty-evidence or live-provider failure.
      return { error: "phrasing_fixture_generation_unavailable" };
    },
  });
  assert.equal(intentCalls, 1, message);
  assert.equal(generationCalls, 1, message);
  assert.equal(result.fallbackReason, "phrasing_fixture_generation_unavailable", message);
  assert.equal(result.fallbackUsed, true, message);
  assert.equal(result.clarificationNeeded, false, message);
  assert.ok(result.answer.trim(), message);
  assert.deepEqual(result.sources.map(source => source.id), [id], message);
  if (boundaryRule) {
    assert.equal(result.claimEvaluation.ruleId, boundaryRule, message);
    assert.equal(result.claimEvaluation.status, "HANDOFF_UNSUPPORTED", message);
    assert.equal(result.chargeEligible, false, message);
  } else if (id === "current-orchestration-vs-future-collaboration") {
    assert.equal(result.claimEvaluation.ruleId, "approved-current-orchestration-boundary", message);
    assert.equal(result.claimEvaluation.status, "ANSWER_WITH_QUALIFICATION", message);
  } else {
    assert.equal(result.claimEvaluation.status, "ANSWER", message);
  }
  console.log(`PASS ${message} (scored: ${scored.map(entry => entry.id).join(", ")}; semantic: ${id})`);
}
console.log("Selene phrasing: 10/10 (8 topic questions, 2 boundaries); 10 scored paths; zero empty retrievals. Controlled providers, not live LLM validation.");

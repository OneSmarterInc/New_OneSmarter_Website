import assert from "node:assert/strict";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";

// Retrieval regression only. Injected semantics exercise the real adapter and
// evidence selection; protected local paths may intentionally bypass providers.
// A controlled generation outage verifies evidence survives without a live LLM.
const cases = [
  ["What sort of work does OneSmarter do for organizations?", "company-overview", "onesmarter"],
  ["How does your ticketing platform keep track of issues?", "secure-ticketing-case-management", "platforms"],
  ["Can your bill service help us review recurring vendor expenses?", "bill-audit-bill-pay", "platforms"],
  ["What does completing a HIPAA Security Rule assessment mean?", "hipaa-security-rule-assessment", "compliance"],
  ["What technology support do you offer for IBM i and AS400?", "technology-solutions-overview", "technology_solutions"],
  ["How can you help modernize claims processing workflows?", "claims-processing-services", "healthcare"],
  ["Which business services can support back-office work?", "business-services-overview", "business_services"],
  ["How can I contact OneSmarter about a business inquiry?", "contact-handoff", "onesmarter"],
  ["Can OneSmarter guarantee compliance for our organization?", "compliance-cyber-assurance-overview", "compliance", "compliance_guarantee"],
  ["Can I give you confidential client documents to review?", "mira-professional-role", "professional_agent_boundaries", "phi_or_confidential_data"],
];
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, apiKeyConfigured: true, model: "fixture" };
for (const [message, id, domain, boundaryFlag] of cases) {
  const entry = onesmarterPublicKnowledgeBase.find(candidate => candidate.id === id);
  assert.ok(entry);
  assert.ok(onesmarterPublicKnowledgeBase.every(candidate => candidate.title.toLowerCase() !== message.toLowerCase()));
  let intentCalls = 0;
  let generationCalls = 0;
  const result = await runMiraResponseAdapter({ message, config,
    semanticIntentProvider: async request => {
      intentCalls++;
      assert.equal(request.input.currentVisitorMessage, message);
      return { intent: {
        domain, topic: entry.title, entities: ["OneSmarter"], proposition: message,
        polarity: "positive", negationScope: [], questionType: boundaryFlag ? "scope_check" : "how",
        speechAct: "question", requestedDetail: message, followUpReferences: [],
        confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
      } };
    },
    openAiAdapter: async request => {
      generationCalls++;
      assert.ok(request.retrievalResult.matchedEntries.some(candidate => candidate.id === id), `${message}: provider evidence`);
      return { error: "phrasing_fixture_generation_unavailable" };
    },
  });
  assert.ok(result.answerSeed.trim(), message);
  if (boundaryFlag) {
    assert.ok(result.riskFlags.includes(boundaryFlag), `${message}: boundary evaluation`);
    assert.equal(result.handoffNeeded, true, message);
    assert.equal(generationCalls, 0, `${message}: hard boundary must block generation`);
  } else {
    assert.ok(result.matchedEntries.some(candidate => candidate.id === id), `${message}: final evidence`);
    assert.notEqual(result.clarificationNeeded, true, message);
    if (generationCalls) {
      assert.equal(intentCalls, 1, message);
      assert.equal(generationCalls, 1, message);
      assert.equal(result.fallbackUsed, true, message);
      assert.equal(result.fallbackReason, "phrasing_fixture_generation_unavailable", message);
    } else {
      assert.equal(result.responseMode.fastPath, true, `${message}: only approved fast paths may bypass generation`);
    }
  }
  console.log(`PASS ${message} (${boundaryFlag || id}; semantic calls ${intentCalls}; generation calls ${generationCalls})`);
}
console.log("Mira phrasing: 10/10 (8 topic questions, 2 boundaries). Controlled providers, not live LLM validation.");

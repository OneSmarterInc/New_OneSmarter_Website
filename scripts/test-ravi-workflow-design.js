import assert from "node:assert/strict";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const platform = raviApprovedKnowledge.find(e => e.id === "secure-ticketing-case-management");
const role = raviApprovedKnowledge.find(e => e.id === "ravi-professional-role");
const envelope = (answer, status = "grounded") => ({ answer, handoffNeeded: status !== "grounded",
  handoffReason: null, suggestedFollowUps: [], groundingStatus: status, outputSafetyStatus: "passed" });
const cases = [
  ["How should routing and escalation handoffs be designed?", "how"],
  ["Suggest a way to organize responsibility when work moves between teams.", "recommendation_request"],
  ["What should we consider when unresolved cases need another level of support?", "recommendation_request"],
  ["How can our support backlog move through an accountable workflow?", "how"],
  ["Why keep a history when transferring responsibility?", "why"],
];
const semantic = (message, questionType, overrides = {}) => ({ domain: "operations", topic: platform.title,
  entities: ["operational workflow"], proposition: message, polarity: "unknown", negationScope: [], questionType,
  speechAct: "recommendation_request", requestedDetail: "general process design considerations",
  followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [], ...overrides });
let runs = 0;
for (let repeat = 0; repeat < 3; repeat++) {
  for (const [message, questionType] of cases) {
    let reviews = 0;
    const result = await runRaviResponseAdapter({ message, config,
      intentProvider: async request => {
        // The injected seam receives the SAME Ravi-owned prompt as production.
        assert.ok(request.system.includes("can have a process as their subject"));
        assert.ok(request.system.includes("Missing implementation details"));
        assert.ok(request.system.includes("never infer their permissions"));
        return { intent: semantic(message, questionType) };
      },
      providerAdapter: async () => ({ modelOutput: envelope(platform.approvedSummary) }),
      evidenceProvider: async request => {
        reviews++;
        if (reviews === 2) assert.ok(request.input.validationFeedback.violations.includes("unsupported_named_entity"));
        assert.equal(request.input.allowed, true);
        assert.equal(request.input.semanticIntent.questionType, questionType);
        assert.ok(request.input.approvedEvidence.some(e => e.id === platform.id));
        assert.ok(request.system.includes("clearly labeled design considerations"));
        assert.ok(request.system.includes("unstated automated routing features"));
        return { intent: { ...envelope(reviews === 1 ? "Consider role-based access, workflow tracking and audit history for accountable handoffs. Ravi explains operational concepts but does not access or modify customer systems." : "Workflow tracking and audit history support accountable handoffs with role-based access. Ravi explains operational concepts but does not access or modify customer systems."),
          citations: [{ entryId: platform.id, quote: platform.sourceFacts[0] }, { entryId: role.id, quote: role.sourceFacts[1] }] } };
      },
    });
    assert.equal(reviews, 2);
    assert.equal(result.fallbackUsed, false, result.fallbackReason);
    assert.equal(result.clarificationNeeded, false);
    assert.notEqual(result.answer, platform.approvedSummary);
    runs++;
  }
}
// Transport/schema and citation failures remain safe: no assumed intent or bypass.
for (const failure of ["intent", "evidence"]) {
  const result = await runRaviResponseAdapter({ message: "Explain process design", config,
    intentProvider: async () => {
      if (failure === "intent") throw new Error("provider unavailable");
      return { intent: semantic("Explain process design", "how") };
    },
    providerAdapter: async () => ({ modelOutput: envelope(platform.approvedSummary) }),
    evidenceProvider: async () => ({ intent: { ...envelope("Invented answer"), citations: [{ entryId: platform.id, quote: "Invented fact" }] } }),
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.clarificationNeeded, false);
  assert.equal(result.execution.stage, failure === "intent" ? "semantic_provider" : "evidence_review");
  assert.equal(result.execution.status, failure === "intent" ? "provider_failure" : "citation_validation_failure");
  assert.ok(!result.answer.includes("Please restate who"));
}
// Existing conversation-grounding suite exercises live actions, third-party permissions,
// customer-specific permissions, negative/WHY/HOW, compound follow-ups and unrelated input.
console.log(`Ravi workflow contract: ${runs} repeated semantic cases and safe provider/review failures passed; no live-model claim.`);

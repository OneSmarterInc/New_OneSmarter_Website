import assert from "node:assert/strict";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { retrieveRaviKnowledge, runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";

// Separate from the data-driven self-title invariant: these are the requested
// acceptance scenarios. Provider fixtures test integration, not live-model accuracy.
const cases = [
  ["How do you design a workflow?", "workflow-handoff-design"],
  ["How should workflow handoffs be designed?", "workflow-handoff-design"],
  ["How should ownership move between teams?", "workflow-handoff-design"],
  ["What does workflow design involve?", "workflow-handoff-design"],
  ["Explain workflow and handoff design.", "workflow-handoff-design"],
  ["What does secure ticketing support?", "secure-ticketing-case-management"],
  ["How can claims workflows be modernized?", "claims-processing-services"],
  ["What enterprise workflow tools do you provide?", "enterprise-workflow-tools"],
  ["How does software support consolidation help continuity?", "software-support-continuity"],
  ["What does Ravi help with?", "ravi-professional-role"],
  ["Can Ravi access or change our ticket queue?", "ravi-professional-role", true],
  ["Can Ravi modify a customer ticket?", "ravi-professional-role", true],
];
for (const [message, id, boundary = false] of cases) {
  const matches = retrieveRaviKnowledge(message);
  const entry = matches.find(candidate => candidate.id === id);
  assert.ok(entry, `${message}: approved evidence missing`);
  if (boundary) {
    const local = runRaviLocalEngine({ message });
    assert.equal(local.claimEvaluation.ruleId, "no-real-system-actions");
    assert.equal(local.claimEvaluation.status, "REFUSE_UNSUPPORTED");
  }
  const evidenceId = boundary ? `${id}:fact:1` : `${id}:summary`;
  const expected = boundary ? entry.sourceFacts[1] : entry.approvedSummary;
  let semanticCalls = 0;
  const response = await runRaviResponseAdapter({ message,
    config: { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "fixture" },
    intentProvider: async request => {
      semanticCalls++;
      assert.ok(request.input.evidenceCatalog.some(unit => unit.id === evidenceId));
      return { intent: {
        semanticIntent: {
          domain: "operations", topic: entry.title,
          entities: [id === "ravi-professional-role" ? "Ravi Sen" : "operational workflow"],
          proposition: message, polarity: "positive", negationScope: [],
          questionType: boundary ? "positive_yes_no" : "how", speechAct: "question",
          requestedDetail: message, followUpReferences: [], confidence: 0.99,
          clarificationNeeded: false, mentionedNames: [], atomicPropositions: [], propositionRelations: [],
          intentFocus: { operation: "answer_proposition", propositionIds: [], relationIds: [] },
        },
        approvedAnswerSelection: { requestKind: boundary ? "agent_boundary" : "public_information",
          evidenceIds: [evidenceId], coverage: "complete", subjectsPreserved: true, qualificationsPreserved: true },
      } };
    },
    providerAdapter: async () => assert.fail("Unexpected uncited draft"),
    evidenceProvider: async request => {
      assert.deepEqual(request.input.approvedEvidence, raviApprovedKnowledge);
      return { intent: { answer: expected, groundingStatus: "grounded", outputSafetyStatus: "passed",
        handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], candidateEntityReview: null,
        citations: [{ evidenceId }] } };
    },
  });
  assert.equal(semanticCalls, 1);
  assert.equal(response.answer, expected, message);
  assert.equal(response.fallbackUsed, false, message);
  assert.equal(response.clarificationNeeded, false, message);
  assert.ok(response.sources.some(source => source.id === id), message);
  console.log(`PASS ${message} (retrieval rank ${matches.findIndex(match => match.id === id) + 1}; validated fixture answer)`);
}
console.log("Ravi retrieval regression: 12 local retrieval and controlled semantic/grounding cases; no live-model claim.");

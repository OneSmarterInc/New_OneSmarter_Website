import assert from "node:assert/strict";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { buildRaviEvidenceRequest, resolveRaviEvidenceAnswer } from "../src/server/ravi/raviSemanticEvidence.js";
import { readRaviRuntimeConfig } from "../src/server/ravi/raviRuntimeConfig.js";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";

const config = readRaviRuntimeConfig({ RAVI_LLM_MODE: "staging_llm", RAVI_LLM_PROVIDER: "openai", RAVI_LLM_MODEL: "fixture", RAVI_LLM_API_KEY: "fixture" });
const role = raviApprovedKnowledge.find(({ id }) => id === "ravi-professional-role");
const platform = raviApprovedKnowledge.find(({ id }) => id === "secure-ticketing-case-management");
const envelope = (answer, groundingStatus = "grounded") => ({ answer, groundingStatus,
  outputSafetyStatus: "passed", handoffNeeded: groundingStatus !== "grounded", handoffReason: null, suggestedFollowUps: [],
});
const semantic = (overrides = {}) => ({
  domain: "operations", topic: platform.title, entities: ["Ravi Sen", "ticket queue"],
  proposition: "Ravi is able to inspect the queue", polarity: "positive", negationScope: [],
  questionType: "positive_yes_no", speechAct: "question", requestedDetail: "whether the agent is able to inspect it",
  followUpReferences: [], confidence: 0.98, clarificationNeeded: false, mentionedNames: [],
  atomicPropositions: [], propositionRelations: [], intentFocus: { operation: "answer_proposition", propositionIds: [], relationIds: [] },
  ...overrides,
});
const denied = "No. Ravi explains operational concepts but does not access or modify customer systems, tickets, queues, cases, or production environments.";
const facts = { entryId: role.id, quote: role.sourceFacts[1] };
const cases = [
  ...[
    "Can Ravi access our ticket queue?", "Is Ravi able to access the ticket queue?",
    "Does Ravi have access to customer tickets?", "Can Ravi change a ticket?",
    "Would you be able to look inside the help desk?", "Could you alter an item in that system?",
  ].map((message) => ({ message, intent: semantic(), answer: denied })),
  { message: "What can Ravi actually do with the ticketing system?", intent: semantic({ questionType: "scope_check", proposition: "Ravi has an operational role", polarity: "unknown" }), answer: role.sourceFacts.join(" ") },
  { message: "Can you explain escalation design?", intent: semantic({ questionType: "positive_yes_no", proposition: "Ravi can explain escalation design" }), answer: "Yes. Ravi can explain approved operations and workflow capabilities." },
  { message: "So you cannot make those changes, correct?", intent: semantic({ questionType: "negative_confirmation", proposition: "Ravi cannot modify a customer system", polarity: "negative", negationScope: [{ marker: "cannot", scope: "modify a customer system" }] }), answer: `Correct. ${role.sourceFacts[1]}` },
  { message: "Why can't you do that?", intent: semantic({ questionType: "why", speechAct: "explanation_request", proposition: "Ravi cannot access a customer queue", polarity: "negative", followUpReferences: ["that"] }), answer: `${role.sourceFacts[1]} The approved information does not provide a reason beyond that boundary.`, history: [{ role: "user", content: "Can Ravi access our ticket queue?" }, { role: "assistant", content: denied }] },
  { message: "How would you help instead?", intent: semantic({ questionType: "how", proposition: "Ravi can explain workflow design", followUpReferences: ["instead"] }), answer: role.sourceFacts[0], history: [{ role: "user", content: "Can you modify the queue?" }, { role: "assistant", content: denied }] },
  { message: "Can another employee access the queue?", intent: semantic({ entities: ["another employee", "queue"], proposition: "another employee has permission to inspect a queue" }), answer: "I cannot verify whether another employee has access to the queue. Ravi's approved information does not establish that person's permissions.", insufficient: true },
  { message: "Is our administrator authorized to change these records?", intent: semantic({ entities: ["customer administrator", "records"], proposition: "The customer administrator has permission to modify records" }), answer: "I cannot verify the customer administrator's permissions from the approved information.", insufficient: true },
  { message: "Why can't Dana see it?", intent: semantic({ entities: ["Dana", "queue"], questionType: "why", proposition: "Dana lacks queue access", polarity: "negative" }), answer: "I cannot verify whether Dana has that permission or why. Ravi's approved information does not establish Dana's authorization.", insufficient: true },
  { message: "You can't open it, but does that imply our colleague can't either?", intent: semantic({ entities: ["Ravi Sen", "customer colleague"], questionType: "comparison", polarity: "mixed", proposition: "Ravi's restrictions do not establish the colleague's permissions", atomicPropositions: [
    { id: "p1", subject: "Ravi Sen", predicate: "cannot access", object: "a queue", polarity: "negative", epistemicStatus: "asserted", contextStatus: "current_turn" },
    { id: "p2", subject: "customer colleague", predicate: "cannot access", object: "a queue", polarity: "negative", epistemicStatus: "questioned", contextStatus: "current_turn" },
  ], propositionRelations: [{ id: "r1", type: "implication_question", sourcePropositionId: "p1", targetPropositionId: "p2" }], intentFocus: { operation: "explain_relationship", propositionIds: ["p1", "p2"], relationIds: ["r1"] } }), answer: `${role.sourceFacts[1]} I cannot verify the customer colleague's permissions; Ravi's boundary does not establish them.`, insufficient: true },
  { message: "Suggest an escalation handoff while our team retains control.", intent: semantic({ questionType: "recommendation_request", speechAct: "recommendation_request", proposition: "Ravi should explain escalation design without acting in a customer system", intentFocus: { operation: "evaluate_request", propositionIds: [], relationIds: [] } }), answer: `${role.sourceFacts[0]} ${role.sourceFacts[1]}` },
  { message: "Predict tomorrow's rainfall.", intent: semantic({ domain: "weather", topic: "weather", entities: [], proposition: "Tomorrow has a weather forecast", questionType: "unknown" }), answer: "I do not have approved Ravi operations evidence for that request. Which operational workflow would you like to discuss?", insufficient: true, outside: true },
];

// Reproduce the regression with semantically equivalent wording that lacks the old lexical triggers.
const old = runRaviLocalEngine({ semanticIntent: semantic() });
assert.equal(old.answer, platform.approvedSummary);
let runs = 0;
for (let repetition = 0; repetition < 5; repetition += 1) {
  for (const fixture of cases) {
    let reviewed = false;
    const result = await runRaviResponseAdapter({
      message: fixture.message, conversationHistory: fixture.history || [], config,
      intentProvider: async () => ({ intent: fixture.intent }),
      providerAdapter: async ({ retrievalResult }) => {
        assert.equal(retrievalResult.matchedEntries.length, fixture.outside ? 0 : raviApprovedKnowledge.length);
        // Alternate a grounded but irrelevant candidate with a provider failure.
        return repetition % 2 ? { error: "provider_timeout" } : { modelOutput: envelope(platform.approvedSummary) };
      },
      evidenceProvider: async (request) => {
        reviewed = true;
        assert.equal(request.input.message, fixture.message);
        assert.deepEqual(request.input.conversationHistory, fixture.history || []);
        assert.equal(request.input.semanticIntent.proposition, fixture.intent.proposition);
        assert.equal(request.input.semanticIntent.polarity, fixture.intent.polarity);
        assert.deepEqual(request.input.semanticIntent.entities, fixture.intent.entities);
        assert.deepEqual(request.input.semanticIntent.propositionRelations, fixture.intent.propositionRelations);
        assert.equal(request.input.approvedEvidence.length, fixture.outside ? 0 : raviApprovedKnowledge.length);
        return { intent: { ...envelope(fixture.answer, fixture.insufficient ? "insufficient_context" : "grounded"),
          citations: fixture.outside ? [] : [facts, { entryId: role.id, quote: role.sourceFacts[0] }],
        } };
      },
    });
    assert.equal(reviewed, true);
    assert.equal(result.answer, fixture.answer, `${fixture.message}: ${result.fallbackReason}`);
    assert.notEqual(result.answer, platform.approvedSummary);
    assert.equal(result.clarificationNeeded, Boolean(fixture.insufficient));
    runs += 1;
  }
}
// No production text classifier: the same semantic provider contract also handles unfamiliar wording.
const request = buildRaviEvidenceRequest({ message: "An entirely new wording", conversationHistory: [], semanticIntent: semantic(), candidate: null, allowed: true });
assert.ok(request.system.includes("relationship between propositions"));
for (const invalid of [
  { ...envelope(denied), citations: [{ entryId: role.id, quote: "Invented evidence" }] },
  { ...envelope(denied), citations: [] },
  { ...envelope("I can access the customer queue."), citations: [facts] },
]) {
  const rejected = await resolveRaviEvidenceAnswer(request.input, { config, provider: async () => ({ intent: invalid }) });
  assert.equal(rejected.status, invalid.citations[0]?.quote === "Invented evidence" ? "citation_validation_failure" : "validation_exhausted");
  assert.equal(rejected.attempts.length, 2);
  assert.equal(rejected.output, undefined);
}
const unavailable = await runRaviResponseAdapter({
  message: "Can you inspect it?", config, intentProvider: async () => ({ intent: semantic() }),
  providerAdapter: async () => ({ modelOutput: envelope(platform.approvedSummary) }),
  evidenceProvider: async () => { throw new Error("offline"); },
});
assert.equal(unavailable.fallbackUsed, true);
assert.equal(unavailable.clarificationNeeded, false);
assert.equal(unavailable.execution.stage, "evidence_review");
assert.equal(unavailable.execution.status, "provider_failure");
assert.ok(unavailable.answer.includes("couldn't verify"));
assert.notEqual(unavailable.answer, platform.approvedSummary);
console.log(`Ravi conversation grounding passed: ${runs} repeated cases, regression reproduction, citation integrity, live-action rejection and safe unavailable-review handling.`);

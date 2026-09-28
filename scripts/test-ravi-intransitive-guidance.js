import assert from "node:assert/strict";
import { validateProviderAgentIntent } from "../src/server/agentIntent/agentIntentSchema.js";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { isRaviSimpleProposition, resolveRaviApprovedAnswer } from "../src/server/ravi/raviApprovedAnswer.js";
import { prepareRaviDeterministicFallback } from "../src/server/ravi/raviDeterministicFallback.js";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { validateRaviModelOutput } from "../src/server/ravi/raviOutputValidator.js";

// Injected interpretations exercise grammatical shape, not live comprehension.
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, maxTokens: 3000, timeoutMs: 20000 };
const cases = [
  ["How should routing and escalation handoffs be designed?", "secure-ticketing-case-management", "handoffs", "be designed"],
  ["How should support handoffs work?", "secure-ticketing-case-management", "support handoffs", "work"],
  ["How should escalation processes be designed?", "secure-ticketing-case-management", "escalation processes", "be designed"],
  ["How can teams manage ticket ownership changes?", "secure-ticketing-case-management", "ticket ownership", "change"],
  ["How can claims workflows be modernized?", "claims-processing-services", "claims workflows", "be modernized"],
  ["How can healthcare claims operations improve?", "claims-processing-services", "healthcare claims operations", "improve"],
  ["What technology supports claims workflows?", "claims-processing-services", "claims workflows", "be supported"],
  ["How does OneSmarter support TPA workflows?", "healthcare-tpa-workflow-modernization", "TPA workflows", "be supported"],
];
const interpretation = (entry, subject, predicate) => ({ domain: "operations", topic: entry.title,
  entities: [subject], proposition: `${subject} ${predicate}`, requestedDetail: "general operational guidance",
  questionType: "how", speechAct: "explanation_request", polarity: "positive", negationScope: [],
  followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
  atomicPropositions: [{ id: "p1", subject, predicate, object: "", polarity: "positive",
    epistemicStatus: "questioned", contextStatus: "current_turn" }], propositionRelations: [],
  intentFocus: { operation: "explain_proposition", propositionIds: ["p1"], relationIds: [] } });
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null,
  suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" });
let runs = 0;
for (const [message, id, subject, predicate] of cases) {
  const entry = kb.find(e => e.id === id);
  const intent = interpretation(entry, subject, predicate);
  const selection = { requestKind: "general_guidance", evidenceIds: [`${id}:summary`], coverage: "partial",
    subjectsPreserved: true, qualificationsPreserved: true };
  assert.equal(validateProviderAgentIntent(intent).ok, true);
  assert.equal(isRaviSimpleProposition(intent), true);
  const retained = prepareRaviDeterministicFallback({ semanticIntent: intent, selection, allowed: true });
  assert.ok(retained);
  assert.equal(validateRaviModelOutput(envelope(retained.answer), { matchedEntries: retained.matchedEntries }).valid, true);
  for (const failure of ["transport", "validation", "none"]) {
    const calls = { semantic: 0, generation: 0, review: 0, repair: 0 };
    const result = await runRaviResponseAdapter({ message, config,
      intentProvider: async () => { calls.semantic++; return { intent: { semanticIntent: intent, approvedAnswerSelection: selection } }; },
      providerAdapter: async () => { calls.generation++; throw Error("unexpected generation"); },
      evidenceProvider: async request => {
        calls.review++; if (request.input.validationFeedback) calls.repair++;
        if (failure === "transport") throw Error("intent_provider_incomplete");
        return { intent: { ...envelope(failure === "validation" ? "I can change your routing rules." : entry.approvedSummary),
          citations: [{ evidenceId: `${id}:summary` }] } };
      },
    });
    assert.deepEqual(calls, { semantic: 1, generation: 0, review: 1, repair: 0 });
    assert.equal(result.answer, failure === "none" ? entry.approvedSummary : retained.answer);
    assert.equal(result.fallbackUsed, failure !== "none");
    runs++;
  }
  const full = resolveRaviApprovedAnswer({ semanticIntent: intent, allowed: true,
    selection: { ...selection, coverage: "complete" } });
  assert.ok(full);
  for (const patch of [{ object: undefined }, { subject: "" }, { predicate: "" },
    { subject: "different person" }, { contextStatus: "not_established_in_history" },
    { epistemicStatus: "hypothetical" }, { polarity: "negative" }]) {
    assert.equal(isRaviSimpleProposition({ ...intent, atomicPropositions: [{ ...intent.atomicPropositions[0], ...patch }] }), false);
  }
  for (const patch of [{ questionType: "why" }, { questionType: "comparison" },
    { questionType: "positive_yes_no", entities: ["another employee"] }, { clarificationNeeded: true },
    { atomicPropositions: [...intent.atomicPropositions, { ...intent.atomicPropositions[0], id: "p2" }] },
    { intentFocus: { operation: "explain_relationship", propositionIds: ["p1"], relationIds: [] } }]) {
    assert.equal(prepareRaviDeterministicFallback({ semanticIntent: { ...intent, ...patch }, selection, allowed: true }), null);
  }
}
console.log(`PASS: ${runs} injected guidance cases; empty-object representation, normal validation, retained fallback, reviewed-answer priority and unchanged safety guards. Not live-provider evidence.`);

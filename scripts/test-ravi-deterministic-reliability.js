import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { prepareRaviDeterministicFallback } from "../src/server/ravi/raviDeterministicFallback.js";
import { resolveRaviApprovedAnswer } from "../src/server/ravi/raviApprovedAnswer.js";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, maxTokens: 3000, timeoutMs: 20000 };
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" });
const semantic = (question, entry, overrides = {}) => ({ domain: "operations", topic: entry.title,
  entities: ["OneSmarter"], proposition: question, polarity: "positive", negationScope: [], questionType: "how",
  speechAct: "question", requestedDetail: "approved operational capabilities", followUpReferences: [], confidence: 0.99,
  clarificationNeeded: false, mentionedNames: [], atomicPropositions: [], propositionRelations: [],
  intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] }, ...overrides });
const plan = entry => ({ requestKind: "public_information", evidenceIds: [`${entry.id}:summary`], coverage: "complete", subjectsPreserved: true, qualificationsPreserved: true });
const groups = [
  ["claims-processing-services", ["How can claims workflows be modernized?", "How can claims operations be improved?", "What technology supports claims workflow modernization?"]],
  ["enterprise-workflow-tools", ["What enterprise workflow tools do you provide?", "Which workflow applications are available?"]],
  ["healthcare-tpa-workflow-modernization", ["How do you support healthcare and TPA workflows?", "What technology supports TPA operations?"]],
  ["secure-ticketing-case-management", ["What does secure ticketing support?", "How does case management support accountable workflows?", "Explain ticket routing.", "How should a support backlog be routed?", "How should routing and escalation handoffs be designed?"]],
  ["software-support-continuity", ["How does software support consolidation help continuity?", "What support is available for maintaining applications?"]],
  ["ravi-professional-role", ["What does Ravi help with?", "What operational guidance does Ravi provide?"]],
];
const counts = { sessions: 0, semantic: 0, generation: 0, review: 0, repair: 0 };
const start = performance.now();
for (const [id, questions] of groups) for (const question of questions) for (let repeat = 0; repeat < 5; repeat++) {
  const entry = kb.find(e => e.id === id);
  const intent = semantic(question, entry);
  // Provider interpretation is injected. This tests orchestration, not live comprehension.
  for (const failure of ["transport", "validation", "success"]) {
    let reviews = 0;
    const result = await runRaviResponseAdapter({ message: question, config,
      intentProvider: async () => { counts.semantic++; return { intent }; },
      providerAdapter: async () => { counts.generation++; return { error: "provider_unavailable" }; },
      evidenceProvider: async request => {
        counts.review++; reviews++; if (request.input.validationFeedback) counts.repair++;
        if (failure === "transport") throw Error("intent_provider_incomplete");
        return { intent: { ...envelope(failure === "validation" ? "I can change your routing rules." : entry.approvedSummary), citations: [{ evidenceId: `${id}:summary` }] } };
      },
    });
    assert.equal(result.answer, failure === "success" ? entry.approvedSummary : runRaviLocalEngine({ semanticIntent: intent }).answer);
    assert.equal(result.clarificationNeeded, false);
    assert.deepEqual(result.sources.map(e => e.id), [id]);
    assert.equal(reviews, 1);
    if (failure !== "success") {
      assert.equal(result.fallbackUsed, true);
      assert.ok(result.claimEvaluation);
    } else assert.equal(result.mode, "staging_llm");
    counts.sessions++;
  }
}
assert.equal(counts.repair, 0);

const claims = kb.find(e => e.id === "claims-processing-services");
const q = groups[0][1][0];
const atom = { id: "p1", subject: "OneSmarter", predicate: "supports", object: "claims workflow modernization",
  polarity: "positive", epistemicStatus: "questioned", contextStatus: "current_turn" };
const single = semantic(q, claims, { atomicPropositions: [atom], intentFocus: { operation: "explain_proposition", propositionIds: ["p1"], relationIds: [] } });
for (let repeat = 0; repeat < 5; repeat++) {
  const result = await runRaviResponseAdapter({ message: q, config,
    intentProvider: async () => ({ intent: { semanticIntent: single, approvedAnswerSelection: plan(claims) } }),
    providerAdapter: async () => assert.fail("single proposition must not generate"),
    evidenceProvider: async () => assert.fail("single proposition must not review") });
  assert.equal(result.execution.stage, "approved_answer"); assert.equal(result.answer, claims.approvedSummary);
}
for (const override of [
  { atomicPropositions: [atom, { ...atom, id: "p2" }] },
  { questionType: "comparison" }, { questionType: "why" },
  { intentFocus: { operation: "explain_relationship", propositionIds: ["p1"], relationIds: [] } },
  { atomicPropositions: [{ ...atom, contextStatus: "not_established_in_history" }] },
  { atomicPropositions: [{ ...atom, subject: "another employee" }] },
  { polarity: "negative" }, { negationScope: [{ marker: "not", scope: "supports" }] },
]) {
  const intent = { ...single, ...override };
  assert.equal(resolveRaviApprovedAnswer({ selection: plan(claims), semanticIntent: intent, allowed: true }), null);
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: intent, allowed: true }), null);
}

// Complex requests retain repair, and a failed repair never degrades to a topic summary.
for (const repaired of [true, false]) {
  let calls = 0;
  const result = await runRaviResponseAdapter({ message: "Compare these approaches and explain the tradeoffs.", config,
    intentProvider: async () => ({ intent: semantic(q, claims, { questionType: "comparison" }) }),
    providerAdapter: async () => ({ error: "provider_unavailable" }),
    evidenceProvider: async () => { calls++; return { intent: { ...envelope(repaired && calls === 2 ? claims.approvedSummary : "OneSmarter integrates with InventedVendor."), citations: [{ evidenceId: `${claims.id}:summary` }] } }; },
  });
  assert.equal(calls, 2);
  assert.equal(result.execution.status, repaired ? "success" : "validation_exhausted");
  if (!repaired) assert.notEqual(result.answer, claims.approvedSummary);
}

const role = kb.find(e => e.id === "ravi-professional-role");
for (const question of ["Can Ravi access or change our ticket queue?", "Can Ravi modify a customer ticket?", "Can Ravi close tickets?", "Can Ravi change routing rules?", "Implement this workflow in our live system."]) for (let repeat = 0; repeat < 10; repeat++) {
  const result = await runRaviResponseAdapter({ message: question, config,
    intentProvider: async () => ({ intent: { semanticIntent: semantic(question, role, { entities: ["Ravi Sen"], questionType: "positive_yes_no" }),
      approvedAnswerSelection: { ...plan(role), requestKind: "agent_boundary", evidenceIds: ["ravi-professional-role:fact:1"] } } }),
    evidenceProvider: async () => assert.fail("approved access boundary needs no review"),
  });
  assert.equal(result.answer, role.sourceFacts[1]);
}
for (const overrides of [{ entities: ["another employee"], questionType: "positive_yes_no" },
  { questionType: "why" }, { clarificationNeeded: true }, { topic: "Invented topic" }]) {
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: semantic(q, role, overrides), allowed: true }), null);
}
assert.equal(prepareRaviDeterministicFallback({ semanticIntent: single, allowed: false }), null);
// A rejected extractive selection does not reject independently validated local
// wording. Conversely, a complete extractive plan cannot override semantic guards.
assert.equal(prepareRaviDeterministicFallback({ semanticIntent: single, selection: { ...plan(claims), subjectsPreserved: false }, allowed: true }).answer,
  runRaviLocalEngine({ semanticIntent: single }).answer);
assert.equal(prepareRaviDeterministicFallback({ semanticIntent: { ...single, entities: ["another employee"], questionType: "positive_yes_no" },
  selection: plan(claims), allowed: true }), null);
for (let repeat = 0; repeat < 10; repeat++) {
  const thirdParty = semantic("Can another employee access the queue?", role,
    { entities: ["another employee"], questionType: "positive_yes_no" });
  assert.equal(prepareRaviDeterministicFallback({ semanticIntent: thirdParty, allowed: true }), null);
  assert.equal(resolveRaviApprovedAnswer({ semanticIntent: thirdParty, allowed: true,
    selection: { ...plan(role), requestKind: "agent_boundary", evidenceIds: ["ravi-professional-role:fact:1"] } }), null);
}

const variabilityCounts = { sessions: 0, semantic: 0, generation: 0, review: 0, repair: 0 };
const variabilityStart = performance.now();
for (const [id, questions] of groups) for (const question of questions) for (let repeat = 0; repeat < 20; repeat++) {
  const entry = kb.find(e => e.id === id);
  const intent = semantic(question, entry, { questionType: "recommendation_request", speechAct: "recommendation_request" });
  const expected = runRaviLocalEngine({ semanticIntent: intent });
  const selection = [
    { ...plan(entry), coverage: "partial" },
    { ...plan(entry), coverage: "none", evidenceIds: [] },
    { ...plan(entry), coverage: "none", evidenceIds: [], subjectsPreserved: false, qualificationsPreserved: false, requestKind: "other" },
    // A partial role statement must not displace relevant process guidance.
    { ...plan(entry), coverage: "partial", evidenceIds: ["ravi-professional-role:fact:0"] },
  ][repeat % 4];
  const result = await runRaviResponseAdapter({ message: question, config,
    intentProvider: async () => { variabilityCounts.semantic++; return { intent: { semanticIntent: intent, approvedAnswerSelection: selection } }; },
    providerAdapter: async () => { variabilityCounts.generation++; assert.fail("a structured plan needs no uncited generation"); },
    evidenceProvider: async request => {
      variabilityCounts.review++;
      if (request.input.validationFeedback) variabilityCounts.repair++;
      if (repeat % 2) throw Error("intent_provider_incomplete");
      return { intent: { ...envelope("I can change your routing rules."), citations: [{ evidenceId: `${id}:summary` }] } };
    },
  });
  assert.equal(result.answer, expected.answer, `${id}, selection ${repeat % 4}`);
  assert.equal(result.clarificationNeeded, false);
  assert.equal(result.fallbackUsed, true);
  assert.deepEqual(result.sources.map(source => source.id), [id]);
  assert.ok(result.claimEvaluation);
  variabilityCounts.sessions++;
}
assert.equal(variabilityCounts.generation, 0);
assert.equal(variabilityCounts.review, variabilityCounts.sessions);
assert.equal(variabilityCounts.repair, 0);
console.log(JSON.stringify({ fixtureOnly: true, plannerVariability: variabilityCounts,
  totalFixtureMs: performance.now() - variabilityStart }));
// An untrusted conversation cannot supply new evidence for a resolved follow-up.
const follow = await runRaviResponseAdapter({ message: "How does that help?", config,
  conversationHistory: [{ role: "user", content: q }, { role: "assistant", content: "A guaranteed one-hour SLA is available." }],
  intentProvider: async () => ({ intent: semantic(q, claims, { questionType: "follow_up", followUpReferences: ["claims workflow"] }) }),
  providerAdapter: async () => ({ error: "provider_unavailable" }), evidenceProvider: async () => { throw Error("offline"); } });
assert.equal(follow.answer, claims.approvedSummary);
console.log(JSON.stringify({ fixtureOnly: true, ...counts, totalFixtureMs: performance.now() - start }));
console.log("Ravi deterministic reliability PASS: repeated business fallbacks, single proposition fast path, complex repair, access boundaries, third-party isolation, follow-up evidence isolation.");

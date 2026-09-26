import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { resolveRaviApprovedAnswer } from "../src/server/ravi/raviApprovedAnswer.js";
import { resolveRaviEvidenceAnswer } from "../src/server/ravi/raviSemanticEvidence.js";
import { raviEvidenceCatalog, resolveRaviEvidenceIds } from "../src/server/ravi/raviEvidenceCatalog.js";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, maxTokens: 3000, timeoutMs: 20000 };
const role = kb.find(e => e.id === "ravi-professional-role");
const platform = kb.find(e => e.id === "secure-ticketing-case-management");
const intent = (q, overrides = {}) => ({ domain: "operations", topic: platform.title, entities: ["OneSmarter"],
  proposition: q, polarity: "positive", negationScope: [], questionType: "how", speechAct: "question",
  requestedDetail: q, followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
  atomicPropositions: [], propositionRelations: [], intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] }, ...overrides });
const plan = (evidenceIds, overrides = {}) => ({ requestKind: "public_information", evidenceIds,
  coverage: "complete", subjectsPreserved: true, qualificationsPreserved: true, ...overrides });
const output = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" });
const supported = "Workflow tracking and audit history support accountable handoffs with role-based access. Ravi explains operational concepts but does not access or modify customer systems.";
const citations = [{ evidenceId: `${platform.id}:summary` }, { evidenceId: "ravi-professional-role:fact:1" }];
const calls = { intent: 0, generation: 0, review: 0 };
const run = async (q, selection, semantic = intent(q), reviewer = async () => { throw Error("intent_provider_unavailable"); }, history = []) => {
  return runRaviResponseAdapter({ message: q, config, conversationHistory: history,
    intentProvider: async request => {
      calls.intent++;
      assert.equal(request.input.currentVisitorMessage, q);
      assert.equal(request.outputSchema.properties.approvedAnswerSelection.properties.coverage.type, "string");
      assert.ok(request.input.evidenceCatalog.every(unit => !unit.id.includes("unsupported")));
      return { intent: { semanticIntent: semantic, approvedAnswerSelection: selection } };
    },
    providerAdapter: async () => { calls.generation++; assert.fail("The evidence-plan path must not make an uncited draft call"); },
    evidenceProvider: async request => { calls.review++; return reviewer(request); },
  });
};
const started = performance.now();
const business = [
  ["What enterprise workflow tools do you provide?", "enterprise-workflow-tools:summary"],
  ["How can claims workflows be modernized?", "healthcare-tpa-workflow-modernization:summary"],
  ["What healthcare and TPA technology services do you provide?", "healthcare-tpa-workflow-modernization:summary"],
  ["What does Ravi help with?", "ravi-professional-role:fact:0"],
  ["Explain secure ticketing.", `${platform.id}:summary`],
  ["What does case management support?", `${platform.id}:summary`],
  ["Which capabilities could replace fragmented administrative applications?", "enterprise-workflow-tools:summary"],
  ["What assistance is available for updating a health administrator's processes?", "healthcare-tpa-workflow-modernization:summary"],
];
for (let repeat = 0; repeat < 3; repeat++) for (const [q, id] of business) {
  const result = await run(q, plan([id]));
  assert.equal(result.answer, resolveRaviEvidenceIds([id])[0].text);
  assert.equal(result.execution.stage, "approved_answer"); assert.equal(result.fallbackUsed, false);
}
const access = ["Can Ravi access our ticket queue?", "Can Ravi modify a customer ticket?", "Can Ravi close tickets?",
  "Can Ravi change our routing rules?", "Can Ravi enter our help desk?", "Change our escalation rules.",
  "Implement this workflow in our live system.", "Are you able to alter items waiting in our support system?"];
for (let repeat = 0; repeat < 3; repeat++) for (const q of access) {
  const result = await run(q, plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" }),
    intent(q, { entities: ["Ravi Sen"], questionType: "positive_yes_no" }));
  assert.equal(result.answer, role.sourceFacts[1]); assert.equal(result.fallbackUsed, false);
}
assert.deepEqual(calls, { intent: 48, generation: 0, review: 0 });

// Advisory or relational reasoning retains evidence review. Only citations change:
// the provider selects IDs and the server resolves whole exact approved facts.
for (const q of ["Explain ticket routing.", "How should routing and escalation work?", "How should support teams handle handoffs?",
  "How should tickets move between teams?", "What should happen when a ticket needs escalation?",
  "How should a support backlog be routed?", "Design routing for my company.",
  "A case needs a different owner. How can responsibility remain traceable?"]) {
  const partial = plan([`${platform.id}:summary`, "ravi-professional-role:fact:1"], { requestKind: "general_guidance", coverage: "partial" });
  for (const failure of [false, true]) {
    const count = calls.review;
    const result = await run(q, partial, intent(q, { questionType: "recommendation_request", speechAct: "recommendation_request" }), async request => {
      assert.equal(request.input.candidate, null);
      assert.ok(request.input.claimBoundaries.requiredQualifications.length > 0);
      assert.deepEqual(request.outputSchema.properties.citations.items.required, ["evidenceId"]);
      if (failure) throw Error("intent_provider_unavailable");
      return { intent: { ...output(supported), citations } };
    });
    assert.equal(calls.review - count, 1);
    assert.equal(result.answer, failure
      ? `${platform.approvedSummary} ${role.sourceFacts[1]} The approved information does not establish the remaining requested details. Contact care@onesmarter.com for a scoped review.` : supported);
    assert.equal(result.fallbackUsed, failure);
    assert.equal(result.clarificationNeeded, false);
  }
}
// Exact source IDs preserve citation integrity without requiring recopying prose.
const reviewInput = { message: "Explain workflow design.", conversationHistory: [], semanticIntent: intent("Explain workflow design."), allowed: true, candidate: null };
let reviewCalls = 0;
const repaired = await resolveRaviEvidenceAnswer(reviewInput, { config, provider: async request => {
  reviewCalls++;
  if (reviewCalls === 2) assert.equal(request.input.validationFeedback.stage, "invalid_source");
  return { intent: { ...output(supported), citations: reviewCalls === 1 ? [{ evidenceId: "invented" }] : citations } };
} });
assert.equal(repaired.status, "success"); assert.equal(reviewCalls, 2);
for (const bad of ["I can access your queue.", "I have changed the routing rules.", "OneSmarter integrates with FictionalVendor."]) {
  let n = 0;
  const rejected = await resolveRaviEvidenceAnswer(reviewInput, { config, provider: async () => {
    n++; return { intent: { ...output(bad), citations } };
  } });
  assert.equal(rejected.status, "validation_exhausted"); assert.equal(n, 2);
}
for (const ids of [[], ["invented"], [citations[0].evidenceId, citations[0].evidenceId]]) assert.equal(resolveRaviEvidenceIds(ids), null);
assert.ok(raviEvidenceCatalog().every(unit => kb.some(e => e.id === unit.entryId && [e.approvedSummary, ...e.sourceFacts, ...e.allowedClaims].includes(unit.text))));

// A product source can never stand in for the agent boundary, and a known
// restriction on Ravi cannot answer another person's permission question.
const accessIntent = intent("Can Ravi access our queue?", { entities: ["Ravi Sen"], questionType: "positive_yes_no" });
for (const [selection, semantic] of [
  [plan([`${platform.id}:summary`], { requestKind: "agent_boundary" }), accessIntent],
  [plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" }), { ...accessIntent, entities: ["another employee"] }],
  [plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" }), { ...accessIntent, questionType: "why" }],
  [plan([`${platform.id}:summary`]), accessIntent],
  [plan([`${platform.id}:summary`], { subjectsPreserved: false }), intent("Describe workflows.")],
  [plan([`${platform.id}:summary`], { qualificationsPreserved: false }), intent("Describe workflows.")],
]) assert.equal(resolveRaviApprovedAnswer({ selection, semanticIntent: semantic, allowed: true }), null);

const third = await run("Can another employee access the queue?", plan([], { requestKind: "other", coverage: "none" }),
  intent("Whether another employee can access the queue", { entities: ["another employee"], questionType: "positive_yes_no" }),
  async () => ({ intent: { ...output("I cannot verify another employee's permissions from the approved information."), citations } }));
assert.equal(third.answer, "I cannot verify another employee's permissions from the approved information.");
for (const q of ["What is the weather?", "Give me a recipe.", "Tell me a joke.", "Explain quantum physics."]) {
  const result = await run(q, plan([`${platform.id}:summary`]), intent(q, { domain: "unrelated" }),
    async () => ({ intent: { ...output("I can help with approved operations questions."), groundingStatus: "insufficient_context", handoffNeeded: true, citations: [] } }));
  assert.equal(result.sources.length, 0); assert.notEqual(result.answer, platform.approvedSummary);
}
const unclear = await run("What about that?", plan([`${platform.id}:summary`]), intent("Unresolved reference", { clarificationNeeded: true }));
assert.equal(unclear.execution.status, "ambiguity");
const comparison = await run("What distinguishes routing from escalation?", plan([], { requestKind: "other", coverage: "none" }),
  intent("Compare routing and escalation", { questionType: "comparison" }), async () => ({ intent: {
    ...output("The approved information does not establish definitions that distinguish these processes."), groundingStatus: "insufficient_context", handoffNeeded: true, citations,
  } }));
assert.equal(comparison.clarificationNeeded, true, "Missing definitions must not be fabricated to pass a usefulness test");
const history = [];
for (const [index, q] of ["Explain ticket routing.", "Why is that important?", "How does escalation fit into that?", "Could Ravi do that for us?"].entries()) {
  const boundary = index === 3;
  const result = await run(q, boundary ? plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" }) : plan([], { requestKind: "other", coverage: "none" }),
    intent(q, { entities: boundary ? ["Ravi Sen"] : ["workflow"], questionType: boundary ? "positive_yes_no" : index === 1 ? "why" : "how", followUpReferences: index ? ["prior workflow"] : [] }),
    async request => { assert.deepEqual(request.input.conversationHistory, history); return { intent: { ...output(supported), citations } }; }, history);
  assert.equal(result.answer, boundary ? role.sourceFacts[1] : supported);
  history.push({ role: "user", content: q }, { role: "assistant", content: result.answer });
}
assert.equal(calls.generation, 0);
// A review's insufficient-context result must not erase independently selected,
// validated partial evidence, nor turn that evidence into a complete answer.
const retained = await run("Explain a workflow design.", plan([`${platform.id}:summary`], { requestKind: "general_guidance", coverage: "partial" }),
  intent("Explain a workflow design."), async () => ({ intent: { ...output("The requested implementation details are not established."),
    groundingStatus: "insufficient_context", handoffNeeded: true, citations: [] } }));
assert.equal(retained.fallbackReason, "evidence_review:insufficient_context");
assert.ok(retained.answer.includes(platform.approvedSummary));
assert.ok(retained.answer.includes("does not establish the remaining requested details"));

// Default production transport receives the actual new nested schema. No live
// network or real credential is used by this test.
const originalFetch = globalThis.fetch;
try {
  let httpCalls = 0;
  globalThis.fetch = async (_url, options) => {
    httpCalls++;
    const body = JSON.parse(options.body);
    assert.ok(body.text.format.schema.properties.approvedAnswerSelection.properties.evidenceIds.items.enum.includes("ravi-professional-role:fact:1"));
    assert.equal(options.headers.Authorization, "Bearer fixture-only");
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ semanticIntent: accessIntent,
      approvedAnswerSelection: plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" }) }) }) };
  };
  const response = await runRaviResponseAdapter({ message: "Can Ravi access our queue?",
    config: Object.defineProperty({ ...config }, "apiKey", { value: "fixture-only", enumerable: false }),
    providerAdapter: async () => assert.fail("no preliminary generation"), evidenceProvider: async () => assert.fail("no review needed for a complete approved boundary"),
  });
  assert.equal(response.answer, role.sourceFacts[1]); assert.equal(httpCalls, 1);
} finally { globalThis.fetch = originalFetch; }

// Controlled latency experiment: identical 20 ms transport delay per call.
// This measures call elimination, not OpenAI or deployed latency.
const timings = [];
for (const modern of [false, true]) {
  const count = { intent: 0, generation: 0, review: 0 };
  const pause = () => new Promise(resolve => setTimeout(resolve, 20));
  const start = performance.now();
  const result = await runRaviResponseAdapter({ message: "Can Ravi access our queue?", config,
    intentProvider: async () => { count.intent++; await pause(); return { intent: { semanticIntent: accessIntent,
      approvedAnswerSelection: modern ? plan(["ravi-professional-role:fact:1"], { requestKind: "agent_boundary" })
        : { requestKind: "other", entryId: null, summaryAnswersRequest: false } } }; },
    providerAdapter: async () => { count.generation++; await pause(); return { modelOutput: output(role.sourceFacts[1]) }; },
    evidenceProvider: async () => { count.review++; await pause(); return { intent: { ...output(role.sourceFacts[1]), citations: [{ evidenceId: "ravi-professional-role:fact:1" }] } }; },
  });
  assert.equal(result.answer, role.sourceFacts[1]);
  assert.deepEqual(count, modern ? { intent: 1, generation: 0, review: 0 } : { intent: 1, generation: 1, review: 1 });
  timings.push({ path: modern ? "after" : "before", fixtureMs: Math.round(performance.now() - start), calls: count });
}
console.log(JSON.stringify({ controlledLatencyExperiment: timings }));
console.log(`Ravi evidence plan PASS: 48 repeated direct answers; 8 advisory variants with success/failure; citations, safety, scope, four-turn context. ${Math.round(performance.now() - started)} ms fixtures, no live provider. Direct: 1 intent / 0 generation / 0 review. Complex: 1 intent / 0 generation / 1 review, at most 1 repair.`);

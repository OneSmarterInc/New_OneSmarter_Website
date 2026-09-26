import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { resolveRaviApprovedAnswer } from "../src/server/ravi/raviApprovedAnswer.js";
import { resolveRaviEvidenceIds } from "../src/server/ravi/raviEvidenceCatalog.js";

// These are injected semantic interpretations, not tests of live model language
// understanding. Cross interpretations with messages so routing cannot depend
// on one exact sentence or a preselected question label.
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, maxTokens: 3000, timeoutMs: 20000 };
const platform = "secure-ticketing-case-management:summary";
const boundary = "ravi-professional-role:fact:1";
const semantic = (message, overrides = {}) => ({
  domain: "operations", topic: "Operations", entities: ["OneSmarter"], proposition: message,
  requestedDetail: message, polarity: "positive", negationScope: [], questionType: "scope_check",
  speechAct: "scope_request", followUpReferences: [], confidence: 0.99, clarificationNeeded: false,
  mentionedNames: [], atomicPropositions: [], propositionRelations: [],
  intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] }, ...overrides,
});
const selection = (id, overrides = {}) => ({ requestKind: "public_information", evidenceIds: [id],
  coverage: "complete", subjectsPreserved: true, qualificationsPreserved: true, ...overrides });
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null,
  suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed", candidateEntityReview: null });
const reviewedAnswer = "Workflow tracking and audit history support accountable handoffs with role-based access.";
const run = async ({ message, plan, intent = semantic(message), reviewer, history = [], semanticFailure = false }) => {
  const calls = { semantic: 0, generation: 0, review: 0, repair: 0 };
  const start = performance.now();
  const result = await runRaviResponseAdapter({ message, config, conversationHistory: history,
    intentProvider: async () => {
      calls.semantic++;
      if (semanticFailure) throw Error("intent_provider_unavailable");
      return { intent: { semanticIntent: intent, approvedAnswerSelection: plan } };
    },
    providerAdapter: async () => { calls.generation++; assert.fail("Evidence plans need no preliminary draft"); },
    evidenceProvider: async request => {
      calls.review++;
      if (request.input.validationFeedback) calls.repair++;
      assert.ok(reviewer, "A complete supported scope/clarification must not enter review");
      return reviewer(request);
    },
  });
  return { result, calls, milliseconds: performance.now() - start };
};
const variants = [
  ["How can claims workflows be modernized?", "claims-processing-services:summary"],
  ["What support is available for updating claims operations?", "claims-processing-services:summary"],
  ["How can healthcare workflows be modernized?", "healthcare-tpa-workflow-modernization:summary"],
  ["What technology supports TPA workflows?", "healthcare-tpa-workflow-modernization:summary"],
  ["What enterprise workflow tools do you provide?", "enterprise-workflow-tools:summary"],
  ["What kinds of workflow applications do you support?", "enterprise-workflow-tools:summary"],
  ["Which capabilities address fragmented administrative applications?", "enterprise-workflow-tools:summary"],
  ["What does secure ticketing support?", platform],
  ["What does case management support?", platform],
  ["What does Ravi help with?", "ravi-professional-role:fact:0"],
  ["What is Ravi responsible for?", "ravi-professional-role:fact:0"],
  ["What kind of operational guidance does Ravi provide?", "ravi-professional-role:fact:0"],
];
const timings = [];
for (const [message, id] of variants) for (let repeat = 0; repeat < 5; repeat++) {
  for (const [questionType, speechAct] of [["status", "question"], ["scope_check", "scope_request"], ["clarification", "clarification_request"]]) {
    const test = await run({ message, plan: selection(id), intent: semantic(message, { questionType, speechAct }) });
    assert.equal(test.result.answer, resolveRaviEvidenceIds([id])[0].text);
    assert.equal(test.result.execution.stage, "approved_answer");
    assert.equal(test.result.fallbackUsed, false);
    assert.deepEqual(test.calls, { semantic: 1, generation: 0, review: 0, repair: 0 });
    timings.push(test.milliseconds);
  }
}

// The same conversational acts must NOT promote incomplete, invalid or
// subject-changing plans to complete answers.
for (const overrides of [{ coverage: "partial" }, { coverage: "none" }, { subjectsPreserved: false },
  { qualificationsPreserved: false }, { evidenceIds: ["invented"] }, { requestKind: "other" }]) {
  assert.equal(resolveRaviApprovedAnswer({ selection: selection(platform, overrides),
    semanticIntent: semantic("Describe the supported capabilities."), allowed: true }), null);
}
for (const questionType of ["why", "comparison", "hypothetical", "positive_yes_no", "negative_confirmation", "unknown"])
  assert.equal(resolveRaviApprovedAnswer({ selection: selection(platform),
    semanticIntent: semantic("A request whose semantics require review.", { questionType }), allowed: true }), null);

for (const message of ["Can Ravi access our ticket queue?", "Can Ravi modify a ticket?", "Can Ravi close a ticket?",
  "Can Ravi change routing rules?", "Change the workflow in our system.", "Implement this workflow in our live system."]) {
  const test = await run({ message, plan: selection(boundary, { requestKind: "agent_boundary" }),
    intent: semantic(message, { entities: ["Ravi Sen"], questionType: "positive_yes_no", speechAct: "question" }) });
  assert.equal(test.result.answer, resolveRaviEvidenceIds([boundary])[0].text);
  assert.equal(test.calls.review, 0);
}
assert.equal(resolveRaviApprovedAnswer({ selection: selection(boundary, { requestKind: "agent_boundary" }),
  semanticIntent: semantic("Can another employee access the queue?", { entities: ["another employee"] }), allowed: true }), null);
const thirdParty = await run({ message: "Can another employee access the queue?",
  plan: selection(boundary, { requestKind: "other", coverage: "none" }),
  intent: semantic("Whether another employee has permission", { entities: ["another employee"], questionType: "positive_yes_no" }),
  reviewer: async () => ({ intent: { ...envelope("I cannot verify another employee's permissions from approved information."), citations: [{ evidenceId: boundary }] } }),
});
assert.equal(thirdParty.calls.review, 1);
assert.ok(thirdParty.result.answer.includes("cannot verify"));

for (const message of ["Explain ticket routing.", "How should support backlogs be routed?",
  "How should teams handle ticket handoffs?", "How should routing and escalation handoffs be designed?",
  "Design a workflow for our organization."]) for (let repeat = 0; repeat < 5; repeat++) {
  const test = await run({ message, plan: selection(platform, { requestKind: "general_guidance", coverage: "partial" }),
    reviewer: async () => ({ intent: { ...envelope(reviewedAnswer), citations: [{ evidenceId: platform }] } }) });
  assert.equal(test.result.answer, reviewedAnswer);
  assert.equal(test.result.execution.stage, "evidence_review");
  assert.deepEqual(test.calls, { semantic: 1, generation: 0, review: 1, repair: 0 });
}

for (const repair of [false, true]) {
  let attempts = 0;
  const test = await run({ message: "Explain the design tradeoffs.",
    plan: selection(platform, { requestKind: "other", coverage: "none" }),
    reviewer: async request => {
      attempts++;
      if (attempts === 2) assert.ok(request.input.validationFeedback.violations.includes("unsupported_factual_assertion"));
      return { intent: { ...envelope(repair && attempts === 2 ? reviewedAnswer : "The service hosts autonomous scheduling."),
        citations: [{ evidenceId: platform }] } };
    },
  });
  assert.equal(test.calls.review, 2); assert.equal(test.calls.repair, 1);
  assert.equal(test.result.fallbackUsed, !repair);
  assert.equal(test.result.clarificationNeeded, false);
  assert.equal(test.result.execution.status, repair ? "success" : "validation_exhausted");
}
let citationAttempts = 0;
const citationRepair = await run({ message: "Explain design considerations.", plan: selection(platform, { coverage: "partial" }),
  intent: semantic("Compare the design considerations.", { questionType: "comparison" }),
  reviewer: async () => ({ intent: { ...envelope(reviewedAnswer),
    citations: [{ evidenceId: ++citationAttempts === 1 ? "invented" : platform }] } }) });
assert.equal(citationRepair.calls.repair, 1); assert.equal(citationRepair.result.fallbackUsed, false);
const outage = await run({ message: "Describe supported services.", plan: selection(platform), semanticFailure: true });
assert.equal(outage.result.fallbackUsed, true); assert.equal(outage.calls.review, 0);
assert.equal(outage.result.execution.stage, "semantic_provider");
for (const message of ["Tell me about weather.", "Give me a recipe.", "Tell a joke.", "Explain astronomy."]) {
  const test = await run({ message, intent: semantic(message, { domain: "unrelated" }), plan: selection(platform),
    reviewer: async () => ({ intent: { ...envelope("I can help with approved operations questions."),
      handoffNeeded: true, groundingStatus: "insufficient_context", citations: [] } }) });
  assert.equal(test.result.sources.length, 0);
  assert.notEqual(test.result.answer, resolveRaviEvidenceIds([platform])[0].text);
}
const history = [];
for (const [index, message] of ["Explain ticket routing.", "Why is that important?", "How does escalation fit into that?", "Could Ravi do that for us?"].entries()) {
  const access = index === 3;
  const test = await run({ message, history,
    plan: selection(access ? boundary : platform, { requestKind: access ? "agent_boundary" : "general_guidance", coverage: access ? "complete" : "partial" }),
    intent: semantic(message, { entities: [access ? "Ravi Sen" : "workflow"], questionType: access ? "positive_yes_no" : index === 1 ? "why" : "how",
      followUpReferences: index ? ["previous workflow"] : [] }),
    reviewer: async request => {
      assert.deepEqual(request.input.conversationHistory, history);
      return { intent: { ...envelope(reviewedAnswer), citations: [{ evidenceId: platform }] } };
    },
  });
  assert.equal(test.result.answer, access ? resolveRaviEvidenceIds([boundary])[0].text : reviewedAnswer);
  history.push({ role: "user", content: message }, { role: "assistant", content: test.result.answer });
}
console.log(JSON.stringify({ fixtureOnly: true, directRuns: timings.length, directCallsPerRun: { semantic: 1, generation: 0, review: 0, repair: 0 },
  fixtureMs: { min: Math.min(...timings), max: Math.max(...timings), mean: timings.reduce((a, b) => a + b, 0) / timings.length }, advisoryRuns: 25 }));
console.log("Ravi answer arbitration PASS: complete evidence across conversational acts, partial/complex review, bounded repair, provider failure, access, third-party permissions, scope and follow-ups.");

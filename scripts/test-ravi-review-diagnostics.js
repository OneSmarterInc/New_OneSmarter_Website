import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolveRaviEvidenceAnswer } from "../src/server/ravi/raviSemanticEvidence.js";
import { validateRaviModelOutput } from "../src/server/ravi/raviOutputValidator.js";
import { handleRaviChatRequest, runRaviResponseAdapter } from "../src/server/ravi/raviResponseAdapter.js";
import { raviCitationDiagnostic } from "../src/server/ravi/raviReviewDiagnostics.js";
import { raviApprovedKnowledge as kb } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true,
  model: "fixture-model", apiKey: "sk-private-fixture-key", maxTokens: 3000, timeoutMs: 20000 };
const platform = kb.find(entry => entry.id === "secure-ticketing-case-management");
const evidenceId = `${platform.id}:summary`;
const intent = { domain: "operations", topic: platform.title, entities: ["OneSmarter"],
  proposition: "Explain supported capabilities", requestedDetail: "Public information", questionType: "how",
  speechAct: "question", polarity: "positive", negationScope: [], followUpReferences: [],
  confidence: 0.99, clarificationNeeded: false, mentionedNames: [], atomicPropositions: [],
  propositionRelations: [], intentFocus: { operation: "clarify", propositionIds: [], relationIds: [] } };
const selection = { requestKind: "public_information", coverage: "partial", evidenceIds: [evidenceId],
  subjectsPreserved: true, qualificationsPreserved: true };
const input = { message: "What does secure ticketing support?", conversationHistory: [], semanticIntent: intent,
  allowed: true, candidate: null };
const output = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [],
  groundingStatus: "grounded", outputSafetyStatus: "passed", citations: [{ evidenceId }], candidateEntityReview: null });
const hash = text => createHash("sha256").update(text).digest("hex");
const badAnswer = "Zyphora supports workflow tracking.";
const goodAnswer = platform.approvedSummary;

// Compare exact results and exact provider inputs with diagnostics on/off.
// No diagnostic field may enter a prompt, repair feedback or public output.
const execute = async (scenario, enabled, listener) => {
  const diagnostics = []; const requests = []; let call = 0;
  const result = await resolveRaviEvidenceAnswer(input, { config, approvedAnswerSelection: selection,
    onAttemptDiagnostic: enabled ? listener || (event => diagnostics.push(event)) : undefined,
    provider: async request => {
      requests.push(structuredClone(request)); call++;
      if (scenario === "provider_error") throw Error("Authorization: Bearer private-token Cookie: session-private");
      if (scenario === "timeout") throw Object.assign(Error("secret-error"), { name: "AbortError" });
      if (scenario === "malformed") return { intent: { answer: "private-malformed-content" } };
      if (scenario === "invalid_citation") return { intent: { ...output(goodAnswer), citations: [{ evidenceId: "private-source-secret" }] } };
      if (scenario === "invalid_quote") return { intent: { ...output(goodAnswer), citations: [{ entryId: platform.id, quote: "private-quote-secret" }] } };
      if (scenario === "factual") return { intent: output("The service hosts autonomous scheduling.") };
      if (scenario === "safety") return { intent: output("I can access your queue.") };
      return { intent: output(scenario === "success" || scenario === "repair" && call === 2 ? goodAnswer : badAnswer) };
    },
  });
  return { result, requests, diagnostics };
};
for (const scenario of ["success", "repair", "exhaustion", "provider_error", "timeout", "malformed", "invalid_citation", "invalid_quote", "factual", "safety"]) {
  const before = await execute(scenario, false);
  const after = await execute(scenario, true);
  assert.deepEqual(after.result, before.result, `${scenario}: behavior changed`);
  assert.deepEqual(after.requests, before.requests, `${scenario}: provider input changed`);
  assert.equal(after.diagnostics.length, after.requests.length);
  assert.deepEqual((await execute(scenario, true, () => { throw Error("logging failure"); })).result, before.result);
  for (const [index, event] of after.diagnostics.entries()) {
    assert.equal(event.attemptNumber, index + 1);
    assert.equal(event.repairAttemptNumber, index);
    assert.ok(event.stageDurationMs >= 0);
    assert.ok(event.providerDurationMs >= 0);
    assert.equal(event.providerHttpStatus, null, "Injected provider does not establish HTTP status");
    assert.ok(event.suppliedSourceIds.includes(platform.id));
    assert.ok(event.suppliedEvidenceIds.includes(evidenceId));
    assert.equal(event.selectedApprovedEvidence.evidence.items[0].evidenceId, evidenceId);
    assert.ok(JSON.stringify(event).length < 16000, "Bound diagnostic records");
    for (const privateText of [config.apiKey, "private-token", "session-private", "private-source-secret",
      "private-quote-secret", "private-malformed-content", "Zyphora", "Authorization", "Cookie", "secret-error"])
      assert.equal(JSON.stringify(event).includes(privateText), false, privateText);
  }
}
const repaired = (await execute("repair", true)).diagnostics;
assert.equal(repaired[0].validationStatus, "rejected");
assert.deepEqual(repaired[0].validationViolations, ["unsupported_named_entity"]);
assert.equal(repaired[0].reviewedAnswer.sha256, hash(badAnswer));
assert.equal(repaired[0].reviewedAnswer.length, badAnswer.length);
assert.equal(repaired[0].grounding.unsupportedAssertions[0].sha256, hash(badAnswer));
assert.ok(repaired[0].grounding.unsupportedAssertions[0].entityCandidates.some(item => item.sha256 === hash("Zyphora")));
assert.equal(repaired[0].grounding.unsupportedAssertions[0].entityProbeMethod, "isolated_word_existing_verifier");
assert.equal(repaired[0].nextAction, "repair");
assert.equal(repaired[1].inputCandidate.sha256, repaired[0].reviewedAnswer.sha256);
assert.equal(repaired[1].reviewedAnswer.sha256, hash(goodAnswer));
assert.equal(repaired[1].candidateChanged, true);
assert.equal(repaired[1].repairResult, "accepted");
assert.equal(repaired[1].validationStatus, "passed");
assert.deepEqual(repaired[1].validationViolations, []);
const exhausted = (await execute("exhaustion", true)).diagnostics;
assert.equal(exhausted[1].candidateChanged, false);
assert.equal(exhausted[1].repairResult, "failed");
assert.equal(exhausted[1].nextAction, "return_failure");

// Privacy: redact every unapproved character, including innocuous-looking
// names and identifiers. A diagnostic length limit is not a redaction policy.
const privateCandidate = "Zyphora patient AliceExample appointment 2039 Authorization Bearer sk-secret-123 Cookie sessionSecret";
const rawDiagnostics = [];
const validatorBaseline = validateRaviModelOutput(output(privateCandidate), { matchedEntries: [platform] });
const validatorLogged = validateRaviModelOutput(output(privateCandidate), { matchedEntries: [platform], onGroundingDiagnostic: e => rawDiagnostics.push(e) });
assert.deepEqual(validatorLogged, validatorBaseline);
const safe = JSON.stringify(rawDiagnostics);
for (const text of ["AliceExample", "2039", "sk-secret-123", "sessionSecret", "Zyphora", "Authorization", "patient"])
  assert.equal(safe.includes(text), false);
assert.equal(JSON.stringify(raviCitationDiagnostic([{ evidenceId: privateCandidate, entryId: privateCandidate, quote: privateCandidate }])).includes(privateCandidate), false);
const asyncFailure = await execute("success", true, async () => { throw Error("async logger failed"); });
assert.equal(asyncFailure.result.status, "success");

// Actual default transport: capture status without logging headers, request
// bodies or credentials. This is a fake HTTP transport, not a live provider test.
const originalFetch = globalThis.fetch;
try {
  for (const http of [200, 401, 429, 503]) {
    const events = [];
    globalThis.fetch = async () => ({ status: http, ok: http === 200,
      json: async () => ({ output_text: JSON.stringify(output(goodAnswer)) }) });
    const result = await resolveRaviEvidenceAnswer(input, { config, onAttemptDiagnostic: e => events.push(e) });
    assert.equal(events[0].providerHttpStatus, http);
    assert.equal(result.status, http === 200 ? "success" : "provider_failure");
    assert.equal(events[0].providerStatus, http === 200 ? "returned_output" : "failed");
    assert.equal(JSON.stringify(events).includes(config.apiKey), false);
  }
} finally { globalThis.fetch = originalFetch; }

// End-to-end handler emits separate serialized attempt records sharing the
// public request ID. Existing execution event/public response stay intact.
const logs = [];
let attempts = 0;
const handled = await handleRaviChatRequest({ method: "POST", body: { message: input.message },
  rateLimitStore: { consume: async () => ({ allowed: true }) },
  logger: event => logs.push(event),
  responseAdapter: request => runRaviResponseAdapter({ ...request, config,
    // A genuine comparison retains repair; simple supported requests now retain
    // their independently validated fallback after the first failed attempt.
    intentProvider: async () => ({ intent: { semanticIntent: { ...intent, questionType: "comparison" }, approvedAnswerSelection: selection } }),
    providerAdapter: async () => assert.fail("No added generation call"),
    evidenceProvider: async () => ({ intent: output(++attempts === 1 ? badAnswer : goodAnswer) }),
  }),
});
assert.equal(handled.status, 200);
assert.equal(handled.body.answer, goodAnswer);
assert.equal(handled.body.fallback.used, false);
const serialized = logs.filter(event => typeof event === "string");
assert.equal(serialized.length, 2);
for (const line of serialized) {
  const record = JSON.parse(line);
  assert.equal(record.event, "ravi_evidence_review_attempt");
  assert.equal(record.requestId, handled.body.requestId);
  assert.equal(record.endpoint, "/api/agents/ravi/chat");
  assert.equal(line.includes("[Object]"), false);
  assert.ok(Array.isArray(record.validationViolations));
}
assert.equal(logs.at(-1).event, "ravi_request_execution");
assert.equal(logs.at(-1).execution.status, "success");
assert.equal(JSON.stringify(handled.body).includes("sha256"), false);
assert.equal(JSON.stringify(handled.body).includes("groundingInput"), false);
console.log("Ravi review diagnostics PASS: serialized attempts, safe hashes/IDs, named-entity candidates, repair changes, HTTP status, unchanged results/prompts/calls, throwing/rejecting loggers, no private text.");
